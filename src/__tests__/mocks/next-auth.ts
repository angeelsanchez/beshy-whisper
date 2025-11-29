import { vi } from 'vitest';

export const mockSession = {
  user: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@test.com',
    alias: 'BSY001',
    bsy_id: 'BSY001',
    name: 'Test User',
    role: 'user',
  },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

export const mockAdminSession = {
  user: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'admin@test.com',
    alias: 'BSY000',
    bsy_id: 'BSY000',
    name: 'Admin User',
    role: 'admin',
  },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

const getServerSession = vi.fn();

vi.mock('next-auth', () => ({
  getServerSession: getServerSession,
}));

export { getServerSession };
