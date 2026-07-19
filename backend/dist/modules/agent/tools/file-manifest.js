"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileManifest = void 0;
exports.normalizeFilePath = normalizeFilePath;
exports.ensureTypeScriptExtension = ensureTypeScriptExtension;
const path = __importStar(require("path"));
const e2b_service_1 = require("../../../lib/e2b.service");
const errors_1 = require("./errors");
const PROTECTED_PATHS = new Set([
    'package.json',
    'vite.config.ts',
    'tsconfig.json',
    'tsconfig.app.json',
    'tsconfig.node.json',
    'postcss.config.js',
    'tailwind.config.ts',
    'index.html',
]);
class FileManifest {
    constructor() {
        this.files = new Map();
    }
    isProtected(filePath) {
        const normalized = this.normalizePath(filePath);
        if (PROTECTED_PATHS.has(normalized)) {
            return true;
        }
        return e2b_service_1.FORBIDDEN_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix));
    }
    async updateFile(filePath, status) {
        const normalized = this.normalizePath(filePath);
        this.files.set(normalized, {
            path: normalized,
            status,
            lastModified: new Date().toISOString(),
        });
    }
    getFileStatus(filePath) {
        const normalized = this.normalizePath(filePath);
        const entry = this.files.get(normalized);
        return {
            path: normalized,
            status: entry?.status,
            lastModified: entry?.lastModified,
        };
    }
    listChanged() {
        return Array.from(this.files.values());
    }
    getProtectedPaths() {
        return Array.from(PROTECTED_PATHS);
    }
    normalizePath(filePath) {
        return normalizeFilePath(filePath);
    }
}
exports.FileManifest = FileManifest;
function normalizeFilePath(filePath) {
    const withoutWorkspacePrefix = filePath
        .replace(/^\/home\/user\/app\//, '')
        .replace(/^\//, '');
    const normalized = path.posix
        .normalize(withoutWorkspacePrefix)
        .replace(/^\.\//, '');
    if (normalized === '..' ||
        normalized.startsWith('../') ||
        path.posix.isAbsolute(normalized)) {
        throw new errors_1.DeterministicToolError(`Path escapes the workspace: "${filePath}". Paths must stay inside /home/user/app (no '..' segments).`);
    }
    return normalized;
}
function ensureTypeScriptExtension(filePath) {
    const normalized = normalizeFilePath(filePath);
    if (normalized.endsWith('.jsx')) {
        return normalized.slice(0, -4) + '.tsx';
    }
    if (normalized.startsWith('src/') && normalized.endsWith('.js')) {
        return normalized.slice(0, -3) + '.ts';
    }
    return filePath;
}
//# sourceMappingURL=file-manifest.js.map