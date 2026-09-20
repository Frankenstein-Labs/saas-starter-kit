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

export type AiResourceKind = z.infer<typeof aiResourceSchema>;
export type AiResourceUpdateInput = z.infer<typeof updateAiResourceSchema>;

// Each AI resource maps to a different Prisma model, so only the columns that
// actually exist on the target table may be forwarded to an update.
export const aiResourceUpdateFields = {
  workspaces: ['name', 'description'],
  notebooks: ['name', 'workspaceId', 'content'],
  models: ['name', 'description', 'framework', 'format', 'license'],
  datasets: ['name', 'description', 'license'],
} as const satisfies Record<
  AiResourceKind,
  readonly (keyof AiResourceUpdateInput)[]
>;

export const pickAiResourceUpdateData = <K extends AiResourceKind>(
  resource: K,
  input: AiResourceUpdateInput
): Pick<AiResourceUpdateInput, (typeof aiResourceUpdateFields)[K][number]> => {
  const data: Record<string, unknown> = {};
  for (const field of aiResourceUpdateFields[resource]) {
    if (input[field] !== undefined) {
      data[field] = input[field];
    }
  }
  return data as Pick<
    AiResourceUpdateInput,
    (typeof aiResourceUpdateFields)[K][number]
  >;
};
