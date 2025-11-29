import { vi } from 'vitest';

function createMockQueryBuilder() {
  const builder: Record<string, ReturnType<typeof vi.fn> | undefined> = {};

  builder.select = vi.fn().mockReturnValue(builder);
  builder.insert = vi.fn().mockReturnValue(builder);
  builder.update = vi.fn().mockReturnValue(builder);
  builder.delete = vi.fn().mockReturnValue(builder);
  builder.upsert = vi.fn().mockReturnValue(builder);
  builder.eq = vi.fn().mockReturnValue(builder);
  builder.neq = vi.fn().mockReturnValue(builder);
  builder.gt = vi.fn().mockReturnValue(builder);
  builder.gte = vi.fn().mockReturnValue(builder);
  builder.lt = vi.fn().mockReturnValue(builder);
  builder.lte = vi.fn().mockReturnValue(builder);
  builder.ilike = vi.fn().mockReturnValue(builder);
  builder.in = vi.fn().mockReturnValue(builder);
  builder.is = vi.fn().mockReturnValue(builder);
  builder.or = vi.fn().mockReturnValue(builder);
  builder.not = vi.fn().mockReturnValue(builder);
  builder.order = vi.fn().mockReturnValue(builder);
  builder.limit = vi.fn().mockReturnValue(builder);
  builder.range = vi.fn().mockReturnValue(builder);
  builder.single = vi.fn().mockResolvedValue({ data: null, error: null });
  builder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  builder.then = undefined;

  return builder;
}

export function createMockSupabase() {
  const queryBuilder = createMockQueryBuilder();

  return {
    from: vi.fn(() => queryBuilder),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    _queryBuilder: queryBuilder,
  };
}

export const mockSupabaseAdmin = createMockSupabase();

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: mockSupabaseAdmin,
}));

export const mockSupabaseClient = createMockSupabase();

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient,
}));
