"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolToDefinition = toolToDefinition;
exports.toolsToDefinitions = toolsToDefinitions;
function getTypeName(field) {
    return field._def?.typeName || undefined;
}
function getDescription(field) {
    return field.description || field._def?.description || '';
}
function fieldToSchema(field) {
    const f = field;
    const typeName = getTypeName(f);
    if (typeName === 'ZodOptional' || typeName === 'ZodNullable') {
        const inner = f.unwrap ? f.unwrap() : f._def?.innerType;
        return inner ? fieldToSchema(inner) : { type: 'string' };
    }
    if (typeName === 'ZodDefault' && f._def?.innerType) {
        return fieldToSchema(f._def.innerType);
    }
    if (typeName === 'ZodBoolean' || f._def?.coerce === true) {
        return { type: 'boolean', description: getDescription(f) };
    }
    if (typeName === 'ZodNumber') {
        return { type: 'number', description: getDescription(f) };
    }
    if (typeName === 'ZodString') {
        return { type: 'string', description: getDescription(f) };
    }
    if (typeName === 'ZodEnum' && Array.isArray(f._def?.values)) {
        return { type: 'string', enum: f._def.values, description: getDescription(f) };
    }
    if (typeName === 'ZodNativeEnum') {
        return { type: 'string', description: getDescription(f) };
    }
    if (typeName === 'ZodArray') {
        const element = f.element || f._def?.type;
        return {
            type: 'array',
            items: element ? fieldToSchema(element) : { type: 'string' },
            description: getDescription(f),
        };
    }
    if (typeName === 'ZodObject' || f.shape) {
        const shape = f.shape || (f._def?.shape?.());
        const properties = {};
        const required = [];
        if (shape && typeof shape === 'object') {
            for (const [key, value] of Object.entries(shape)) {
                properties[key] = fieldToSchema(value);
                const child = value;
                if (typeof child.isOptional !== 'function' || !child.isOptional()) {
                    required.push(key);
                }
            }
        }
        return {
            type: 'object',
            properties,
            required: required.length > 0 ? required : undefined,
            description: getDescription(f),
        };
    }
    return { type: 'string', description: getDescription(f) };
}
function isOptionalField(field) {
    const f = field;
    if (typeof f.isOptional === 'function')
        return f.isOptional();
    if (getTypeName(f) === 'ZodOptional')
        return true;
    if (f._def?.defaultValue !== undefined)
        return true;
    return false;
}
function toolToDefinition(tool) {
    const schema = tool.schema;
    const shape = schema?.shape || (schema?._def?.shape?.());
    const properties = {};
    const required = [];
    if (shape && typeof shape === 'object') {
        for (const [key, value] of Object.entries(shape)) {
            properties[key] = fieldToSchema(value);
            if (!isOptionalField(value)) {
                required.push(key);
            }
        }
    }
    return {
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters: {
                type: 'object',
                properties,
                required: required.length > 0 ? required : undefined,
            },
        },
    };
}
function toolsToDefinitions(tools) {
    return tools.map(toolToDefinition);
}
//# sourceMappingURL=tool-definitions.js.map