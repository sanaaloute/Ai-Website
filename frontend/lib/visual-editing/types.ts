import { z } from 'zod';

export const ComponentSelectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  runtimeId: z.string().optional(),
  relativePath: z.string(),
  lineNumber: z.number(),
  columnNumber: z.number()
});

export type ComponentSelection = z.infer<typeof ComponentSelectionSchema>;

export const VisualEditingChangeSchema = z.object({
  componentId: z.string(),
  componentName: z.string(),
  relativePath: z.string(),
  lineNumber: z.number(),
  styles: z.object({
    margin: z
      .object({
        left: z.string().optional(),
        right: z.string().optional(),
        top: z.string().optional(),
        bottom: z.string().optional()
      })
      .optional(),
    padding: z
      .object({
        left: z.string().optional(),
        right: z.string().optional(),
        top: z.string().optional(),
        bottom: z.string().optional()
      })
      .optional(),
    dimensions: z
      .object({
        width: z.string().optional(),
        height: z.string().optional()
      })
      .optional(),
    border: z
      .object({
        width: z.string().optional(),
        radius: z.string().optional(),
        color: z.string().optional()
      })
      .optional(),
    backgroundColor: z.string().optional(),
    text: z
      .object({
        fontSize: z.string().optional(),
        fontWeight: z.string().optional(),
        color: z.string().optional(),
        fontFamily: z.string().optional()
      })
      .optional()
  }),
  textContent: z.string().optional()
});

export type VisualEditingChange = z.infer<typeof VisualEditingChangeSchema>;
