import {
  createAiResourceSchema,
  listAiResourcesSchema,
  pickAiResourceUpdateData,
  updateAiResourceSchema,
} from '@/lib/aiResourceSchemas';

describe('AI resource schemas', () => {
  it('applies safe pagination defaults and limits page size', () => {
    expect(listAiResourcesSchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(listAiResourcesSchema.safeParse({ page: 0 }).success).toBe(false);
    expect(listAiResourcesSchema.safeParse({ pageSize: 101 }).success).toBe(
      false
    );
  });

  it('requires a bounded resource name', () => {
    expect(createAiResourceSchema.safeParse({ name: '' }).success).toBe(false);
    expect(createAiResourceSchema.safeParse({ name: 'Notebook' }).success).toBe(
      true
    );
    expect(
      createAiResourceSchema.safeParse({ name: 'x'.repeat(81) }).success
    ).toBe(false);
  });

  it('accepts notebook JSON content without allowing arbitrary executable fields', () => {
    expect(
      createAiResourceSchema.safeParse({
        name: 'Exploration',
        content: { cells: [], metadata: {}, nbformat: 4 },
      }).success
    ).toBe(true);
    expect(
      updateAiResourceSchema.safeParse({ content: () => 'run code' }).success
    ).toBe(false);
  });

  it('forwards only the update fields the target model owns', () => {
    expect(
      pickAiResourceUpdateData('workspaces', {
        name: 'Renamed',
        framework: 'pytorch',
        content: { cells: [] },
        license: 'MIT',
      })
    ).toEqual({ name: 'Renamed' });

    expect(
      pickAiResourceUpdateData('notebooks', {
        name: 'Notebook',
        workspaceId: null,
        content: { cells: [] },
        framework: 'pytorch',
      })
    ).toEqual({ name: 'Notebook', workspaceId: null, content: { cells: [] } });

    expect(
      pickAiResourceUpdateData('models', { framework: 'torch', license: 'MIT' })
    ).toEqual({ framework: 'torch', license: 'MIT' });
  });

  it('never emits undefined fields for an empty update', () => {
    const data = pickAiResourceUpdateData('datasets', {});
    expect(Object.keys(data)).toEqual([]);
  });
});
