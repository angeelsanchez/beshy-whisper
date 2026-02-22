import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetServerSession = vi.fn();
const mockFrom = vi.fn();

vi.mock('next-auth/next', () => ({
  getServerSession: () => mockGetServerSession(),
}));

vi.mock('@/app/api/auth/[...nextauth]/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: () => mockFrom() },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

import { GET } from '../route';

const USER_A = '11111111-1111-1111-1111-111111111111';
const USER_B = '22222222-2222-2222-2222-222222222222';
const CONV_ID = '33333333-3333-3333-3333-333333333333';
const NOW = '2026-02-21T12:00:00.000Z';

function makeConversationsBuilder(data: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      or: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data, error: null }),
      }),
    }),
  };
}

function makeConversationsBuilderError(message: string) {
  return {
    select: vi.fn().mockReturnValue({
      or: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: { message } }),
      }),
    }),
  };
}

function makeUsersBuilder(data: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ data, error: null }),
    }),
  };
}

function makeLastMessagesBuilder(data: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data, error: null }),
      }),
    }),
  };
}

function makeUnreadBuilder(data: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        neq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ data, error: null }),
        }),
      }),
    }),
  };
}

describe('GET /api/messages/conversations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('No autorizado');
  });

  it('returns 401 when session has no user id', async () => {
    mockGetServerSession.mockResolvedValue({ user: {} });

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns empty conversations when user has none', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    mockFrom.mockReturnValue(makeConversationsBuilder([]));

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.conversations).toEqual([]);
    expect(body.totalUnread).toBe(0);
  });

  it('returns 500 when conversations DB query fails', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    mockFrom.mockReturnValue(makeConversationsBuilderError('DB connection error'));

    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Error interno');
  });

  it('returns conversations with other user info, last message and unread count', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    const conversations = [
      {
        id: CONV_ID,
        user_a_id: USER_A,
        user_b_id: USER_B,
        last_message_at: NOW,
      },
    ];

    const users = [
      {
        id: USER_B,
        name: 'Bob',
        alias: 'bob_alias',
        profile_photo_url: 'https://example.com/bob.jpg',
      },
    ];

    const lastMessages = [
      {
        conversation_id: CONV_ID,
        content: 'Hello!',
        sender_id: USER_B,
        created_at: NOW,
      },
    ];

    const unreadMessages = [{ conversation_id: CONV_ID }];

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeConversationsBuilder(conversations);
      if (callCount === 2) return makeUsersBuilder(users);
      if (callCount === 3) return makeLastMessagesBuilder(lastMessages);
      return makeUnreadBuilder(unreadMessages);
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.conversations).toHaveLength(1);
    expect(body.totalUnread).toBe(1);

    const conv = body.conversations[0];
    expect(conv.id).toBe(CONV_ID);
    expect(conv.otherUser.id).toBe(USER_B);
    expect(conv.otherUser.name).toBe('Bob');
    expect(conv.otherUser.alias).toBe('bob_alias');
    expect(conv.otherUser.profilePhotoUrl).toBe('https://example.com/bob.jpg');
    expect(conv.lastMessage).not.toBeNull();
    expect(conv.lastMessage.content).toBe('Hello!');
    expect(conv.lastMessage.senderId).toBe(USER_B);
    expect(conv.unreadCount).toBe(1);
    expect(conv.lastMessageAt).toBe(NOW);
  });

  it('resolves otherUser correctly when current user is user_b_id', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_B } });

    const conversations = [
      {
        id: CONV_ID,
        user_a_id: USER_A,
        user_b_id: USER_B,
        last_message_at: NOW,
      },
    ];

    const users = [{ id: USER_A, name: 'Alice', alias: 'alice', profile_photo_url: null }];

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeConversationsBuilder(conversations);
      if (callCount === 2) return makeUsersBuilder(users);
      if (callCount === 3) return makeLastMessagesBuilder([]);
      return makeUnreadBuilder([]);
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.conversations[0].otherUser.id).toBe(USER_A);
    expect(body.conversations[0].otherUser.name).toBe('Alice');
  });

  it('returns null lastMessage when conversation has no messages', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    const conversations = [
      {
        id: CONV_ID,
        user_a_id: USER_A,
        user_b_id: USER_B,
        last_message_at: NOW,
      },
    ];

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeConversationsBuilder(conversations);
      if (callCount === 2) return makeUsersBuilder([]);
      if (callCount === 3) return makeLastMessagesBuilder([]);
      return makeUnreadBuilder([]);
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.conversations[0].lastMessage).toBeNull();
    expect(body.conversations[0].unreadCount).toBe(0);
    expect(body.totalUnread).toBe(0);
  });

  it('uses default alias when user is not found in userMap', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    const conversations = [
      {
        id: CONV_ID,
        user_a_id: USER_A,
        user_b_id: USER_B,
        last_message_at: NOW,
      },
    ];

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeConversationsBuilder(conversations);
      if (callCount === 2) return makeUsersBuilder(null);
      if (callCount === 3) return makeLastMessagesBuilder(null);
      return makeUnreadBuilder(null);
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    const conv = body.conversations[0];
    expect(conv.otherUser.alias).toBe('Usuario');
    expect(conv.otherUser.name).toBeNull();
    expect(conv.otherUser.profilePhotoUrl).toBeNull();
  });

  it('counts totalUnread correctly across multiple conversations', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    const CONV_ID_2 = '44444444-4444-4444-4444-444444444444';
    const USER_C = '55555555-5555-5555-5555-555555555555';

    const conversations = [
      { id: CONV_ID, user_a_id: USER_A, user_b_id: USER_B, last_message_at: NOW },
      { id: CONV_ID_2, user_a_id: USER_A, user_b_id: USER_C, last_message_at: NOW },
    ];

    const unreadMessages = [
      { conversation_id: CONV_ID },
      { conversation_id: CONV_ID },
      { conversation_id: CONV_ID_2 },
    ];

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeConversationsBuilder(conversations);
      if (callCount === 2) return makeUsersBuilder([]);
      if (callCount === 3) return makeLastMessagesBuilder([]);
      return makeUnreadBuilder(unreadMessages);
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalUnread).toBe(3);
    expect(body.conversations[0].unreadCount).toBe(2);
    expect(body.conversations[1].unreadCount).toBe(1);
  });

  it('returns 500 when an unexpected exception is thrown', async () => {
    mockGetServerSession.mockRejectedValue(new Error('Unexpected crash'));

    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Error interno');
  });

  it('only picks first message per conversation for lastMessageMap', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    const conversations = [
      { id: CONV_ID, user_a_id: USER_A, user_b_id: USER_B, last_message_at: NOW },
    ];

    const lastMessages = [
      { conversation_id: CONV_ID, content: 'First message', sender_id: USER_B, created_at: NOW },
      {
        conversation_id: CONV_ID,
        content: 'Second message',
        sender_id: USER_A,
        created_at: '2026-02-20T12:00:00.000Z',
      },
    ];

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeConversationsBuilder(conversations);
      if (callCount === 2) return makeUsersBuilder([]);
      if (callCount === 3) return makeLastMessagesBuilder(lastMessages);
      return makeUnreadBuilder([]);
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.conversations[0].lastMessage.content).toBe('First message');
  });
});
