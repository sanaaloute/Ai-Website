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
exports.upsertProject = upsertProject;
exports.getProject = getProject;
exports.upsertFile = upsertFile;
exports.deleteFile = deleteFile;
exports.upsertFilesBulk = upsertFilesBulk;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const STORE_DIR = process.env.AGENT_STORE_DIR
    ? path.resolve(process.env.AGENT_STORE_DIR)
    : path.resolve(process.cwd(), '.agent_store');
function ensureStoreDir() {
    if (!fs.existsSync(STORE_DIR)) {
        fs.mkdirSync(STORE_DIR, { recursive: true });
    }
}
function projectPath(projectId) {
    const safeId = projectId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(STORE_DIR, `${safeId}.json`);
}
function readProject(projectId) {
    try {
        const raw = fs.readFileSync(projectPath(projectId), 'utf-8');
        return JSON.parse(raw);
    }
    catch {
        return undefined;
    }
}
function writeProject(projectId, data) {
    ensureStoreDir();
    fs.writeFileSync(projectPath(projectId), JSON.stringify(data, null, 2), 'utf-8');
}
function upsertProject(id, name, userId) {
    const now = new Date().toISOString();
    const existing = readProject(id);
    const project = {
        id,
        name,
        userId,
        createdAt: existing?.project.createdAt ?? now,
        updatedAt: now,
    };
    writeProject(id, {
        project,
        files: existing?.files ?? {},
    });
}
function getProject(id) {
    return readProject(id)?.project;
}
function upsertFile(projectId, filePath, content) {
    const stored = readProject(projectId) ?? {
        project: {
            id: projectId,
            name: projectId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        files: {},
    };
    stored.files[filePath] = content;
    stored.project.updatedAt = new Date().toISOString();
    writeProject(projectId, stored);
}
function deleteFile(projectId, filePath) {
    const stored = readProject(projectId);
    if (!stored)
        return;
    delete stored.files[filePath];
    stored.project.updatedAt = new Date().toISOString();
    writeProject(projectId, stored);
}
function upsertFilesBulk(projectId, filesToSave) {
    const stored = readProject(projectId) ?? {
        project: {
            id: projectId,
            name: projectId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        files: {},
    };
    let count = 0;
    for (const { path: filePath, content } of filesToSave) {
        stored.files[filePath] = content;
        count++;
    }
    stored.project.updatedAt = new Date().toISOString();
    writeProject(projectId, stored);
    return count;
}
//# sourceMappingURL=project-store.js.map