import { z } from 'zod';

export const aiResourceSchema = z.enum([
  'workspaces',
  'notebooks',
  'models',
  'datasets',
]);

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ])
);

export const createAiResourceSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  workspaceId: z.string().uuid().optional(),
  content: jsonValueSchema.optional(),
  source: z
    .enum(['LOCAL', 'GITHUB', 'HUGGINGFACE', 'TRAINED', 'IMPORTED'])
    .optional(),
  framework: z.string().trim().max(80).optional(),
  format: z.string().trim().max(80).optional(),
  license: z.string().trim().max(120).optional(),
});

export const updateAiResourceSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  workspaceId: z.string().uuid().nullable().optional(),
  content: jsonValueSchema.optional(),
  framework: z.string().trim().max(80).nullable().optional(),
  format: z.string().trim().max(80).nullable().optional(),
  license: z.string().trim().max(120).nullable().optional(),
});

export const listAiResourcesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
