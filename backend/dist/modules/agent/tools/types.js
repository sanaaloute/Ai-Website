"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentTool = void 0;
const tools_1 = require("@langchain/core/tools");
class AgentTool extends tools_1.StructuredTool {
    constructor(context) {
        super();
        this.agentContext = context;
    }
    findBestTodoForPath(path) {
        const normalizedPath = path.toLowerCase().replace(/^\.?\//, '');
        const basename = normalizedPath.split('/').pop() || normalizedPath;
        let fullMatch;
        let baseMatch;
        for (const todo of this.agentContext.todos) {
            const content = todo.content.toLowerCase();
            if (content.includes(normalizedPath)) {
                if (!fullMatch)
                    fullMatch = todo;
            }
            else if (content.includes(basename) && !baseMatch) {
                baseMatch = todo;
            }
        }
        return fullMatch || baseMatch;
    }
    updateTodosForPath(path, status) {
        const matching = this.findBestTodoForPath(path);
        if (!matching)
            return;
        let changed = false;
        const idx = this.agentContext.todos.findIndex((t) => t.id === matching.id);
        if (idx >= 0 && this.agentContext.todos[idx].status !== status) {
            this.agentContext.todos[idx] = { ...this.agentContext.todos[idx], status };
            changed = true;
        }
        if (status === 'in_progress') {
            for (let i = 0; i < this.agentContext.todos.length; i++) {
                const todo = this.agentContext.todos[i];
                if (todo.status === 'in_progress' && todo.id !== matching.id) {
                    this.agentContext.todos[i] = { ...todo, status: 'completed' };
                    changed = true;
                }
            }
        }
        if (changed) {
            this.agentContext.streamWriter.write({
                type: 'todos_update',
                data: { todos: this.agentContext.todos },
            });
        }
    }
}
exports.AgentTool = AgentTool;
//# sourceMappingURL=types.js.map