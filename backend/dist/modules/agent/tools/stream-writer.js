"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallbackStreamWriter = exports.NoOpStreamWriter = void 0;
exports.createFileUpdateEvent = createFileUpdateEvent;
class NoOpStreamWriter {
    write(_event) {
    }
}
exports.NoOpStreamWriter = NoOpStreamWriter;
class CallbackStreamWriter {
    constructor(callback) {
        this.callback = callback;
    }
    write(event) {
        try {
            const result = this.callback(event);
            if (result instanceof Promise) {
                result.catch((err) => console.warn('StreamWriter callback error:', err));
            }
        }
        catch (err) {
            console.warn('StreamWriter callback error:', err);
        }
    }
}
exports.CallbackStreamWriter = CallbackStreamWriter;
function createFileUpdateEvent(path, content, status) {
    return {
        type: 'file_update',
        data: {
            path,
            status,
            size: content.length,
            lineCount: content.split('\n').length,
        },
    };
}
//# sourceMappingURL=stream-writer.js.map