"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptToString = promptToString;
exports.buildPromptContent = buildPromptContent;
exports.normalizePromptContent = normalizePromptContent;
function promptToString(prompt) {
    if (typeof prompt === 'string')
        return prompt;
    return prompt
        .map((part) => {
        if (part.type === 'text')
            return part.text;
        if (part.type === 'image_url')
            return '[image]';
        return '[unknown]';
    })
        .join(' ')
        .trim();
}
function buildPromptContent(context, prompt) {
    if (typeof prompt === 'string') {
        return `${context}${prompt}`;
    }
    return [
        { type: 'text', text: context },
        ...prompt,
    ];
}
function normalizePromptContent(prompt) {
    return prompt;
}
//# sourceMappingURL=index.js.map