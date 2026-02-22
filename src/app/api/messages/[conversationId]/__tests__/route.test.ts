import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetServerSession = vi.fn();
const mockFrom = vi.fn();
const mockAreMutualFollows = vi.fn();
const mockSendPushToUserIfEnabled = vi.fn();

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

vi.mock('@/lib/mutual-follow', () => ({
  areMutualFollows: () => mockAreMutualFollows(),
}));

vi.mock('@/lib/push-notify', () => ({
  sendPushToUserIfEnabled: (...args: unknown[]) => mockSendPushToUserIfEnabled(...args),
}));

import { GET, POST } from '../route';

const USER_A = '11111111-1111-1111-1111-111111111111';
const USER_B = '22222222-2222-2222-2222-222222222222';
const CONV_ID = '33333333-3333-3333-3333-333333333333';
const MSG_ID = '44444444-4444-4444-4444-444444444444';
const NOW = '2026-02-21T12:00:00.000Z';
const INVALID_ID = 'not-a-valid-uuid';

function makeConversationParams(conversationId: string) {
  return Promise.resolve({ conversationId });
}

function createGetRequest(conversationId: string, searchParams = ''): NextRequest {
  return new NextRequest(
    `http://localhost/api/messages/${conversationId}${searchParams ? `?${searchParams}` : ''}`,
    { method: 'GET' }
  );
}

function createPostRequest(conversationId: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/messages/${conversationId}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeConversationLookupBuilder(data: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
      }),
    }),
  };
}

function makeMessagesQueryBuilder(data: unknown, error: { message: string } | null = null) {
  const resolved = { data, error };
  const thenableResult = {
    ...resolved,
    then: (resolve: (v: typeof resolved) => unknown) => Promise.resolve(resolved).then(resolve),
    catch: (reject: (e: unknown) => unknown) => Promise.resolve(resolved).catch(reject),
    lt: vi.fn().mockResolvedValue(resolved),
  };
  const limitFn = vi.fn().mockReturnValue(thenableResult);
  const orderFn = vi.fn().mockReturnValue({ limit: limitFn });
  const eqFn = vi.fn().mockReturnValue({ order: orderFn });
  return {
    select: vi.fn().mockReturnValue({ eq: eqFn }),
  };
}

function makeUpdateBuilder() {
  return {
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        neq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  };
}

function makeUsersInBuilder(data: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ data, error: null }),
    }),
  };
}

function makeInsertMessageBuilder(data: unknown, error: { message: string } | null = null) {
  return {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
  };
}

describe('GET /api/messages/[conversationId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendPushToUserIfEnabled.mockResolvedValue(undefined);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await GET(createGetRequest(CONV_ID), { params: makeConversationParams(CONV_ID) });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('No autorizado');
  });

  it('returns 401 when session has no user id', async () => {
    mockGetServerSession.mockResolvedValue({ user: {} });

    const res = await GET(createGetRequest(CONV_ID), { params: makeConversationParams(CONV_ID) });
    expect(res.status).toBe(401);
  });

  it('returns 400 when conversationId is not a valid UUID', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    const res = await GET(createGetRequest(INVALID_ID), {
      params: makeConversationParams(INVALID_ID),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('ID invalido');
  });

  it('returns 403 when user is not a participant in the conversation', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    mockFrom.mockReturnValue(
      makeConversationLookupBuilder({
        user_a_id: USER_B,
        user_b_id: '55555555-5555-5555-5555-555555555555',
      })
    );

    const res = await GET(createGetRequest(CONV_ID), { params: makeConversationParams(CONV_ID) });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('No tienes acceso a esta conversacion');
  });

  it('returns 403 when conversation does not exist', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    mockFrom.mockReturnValue(makeConversationLookupBuilder(null));

    const res = await GET(createGetRequest(CONV_ID), { params: makeConversationParams(CONV_ID) });
    expect(res.status).toBe(403);
  });

  it('returns 400 when limit query param is invalid', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    mockFrom.mockReturnValue(
      makeConversationLookupBuilder({ user_a_id: USER_A, user_b_id: USER_B })
    );

    const res = await GET(createGetRequest(CONV_ID, 'limit=999'), {
      params: makeConversationParams(CONV_ID),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Parametros invalidos');
  });

  it('returns empty messages when conversation has no messages', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return makeConversationLookupBuilder({ user_a_id: USER_A, user_b_id: USER_B });
      if (callCount === 2) return makeMessagesQueryBuilder([]);
      return makeUpdateBuilder();
    });

    const res = await GET(createGetRequest(CONV_ID), { params: makeConversationParams(CONV_ID) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toEqual([]);
    expect(body.hasMore).toBe(false);
  });

  it('returns 500 when messages DB query fails', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return makeConversationLookupBuilder({ user_a_id: USER_A, user_b_id: USER_B });
      return makeMessagesQueryBuilder(null, { message: 'DB error' });
    });

    const res = await GET(createGetRequest(CONV_ID), { params: makeConversationParams(CONV_ID) });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Error interno');
  });

  it('returns messages with sender info and hasMore false when below limit', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    const messages = [
      {
        id: MSG_ID,
        conversation_id: CONV_ID,
        sender_id: USER_B,
        content: 'Hello there',
        read_at: null,
        created_at: NOW,
      },
    ];

    const users = [{ id: USER_B, name: 'Bob', alias: 'bob', profile_photo_url: null }];

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return makeConversationLookupBuilder({ user_a_id: USER_A, user_b_id: USER_B });
      if (callCount === 2) return makeMessagesQueryBuilder(messages);
      if (callCount === 3) return makeUpdateBuilder();
      return makeUsersInBuilder(users);
    });

    const res = await GET(createGetRequest(CONV_ID), { params: makeConversationParams(CONV_ID) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toHaveLength(1);
    expect(body.hasMore).toBe(false);
    expect(body.messages[0].id).toBe(MSG_ID);
    expect(body.messages[0].content).toBe('Hello there');
    expect(body.messages[0].sender_name).toBe('Bob');
    expect(body.messages[0].sender_alias).toBe('bob');
    expect(body.messages[0].sender_profile_photo_url).toBeNull();
  });

  it('sets hasMore true when results exceed the limit', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    const limit = 2;
    const messages = Array.from({ length: limit + 1 }, (_, i) => ({
      id: `msg-id-${i}`,
      conversation_id: CONV_ID,
      sender_id: USER_B,
      content: `Message ${i}`,
      read_at: null,
      created_at: NOW,
    }));

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return makeConversationLookupBuilder({ user_a_id: USER_A, user_b_id: USER_B });
      if (callCount === 2) return makeMessagesQueryBuilder(messages);
      if (callCount === 3) return makeUpdateBuilder();
      return makeUsersInBuilder([]);
    });

    const res = await GET(createGetRequest(CONV_ID, `limit=${limit}`), {
      params: makeConversationParams(CONV_ID),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hasMore).toBe(true);
    expect(body.messages).toHaveLength(limit);
  });

  it('passes cursor param to DB query', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return makeConversationLookupBuilder({ user_a_id: USER_A, user_b_id: USER_B });
      if (callCount === 2) return makeMessagesQueryBuilder([]);
      return makeUpdateBuilder();
    });

    const cursor = '2026-02-20T12:00:00.000Z';
    const res = await GET(createGetRequest(CONV_ID, `cursor=${encodeURIComponent(cursor)}`), {
      params: makeConversationParams(CONV_ID),
    });
    expect(res.status).toBe(200);
  });

  it('returns 500 when an unexpected exception is thrown', async () => {
    mockGetServerSession.mockRejectedValue(new Error('Unexpected crash'));

    const res = await GET(createGetRequest(CONV_ID), { params: makeConversationParams(CONV_ID) });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Error interno');
  });

  it('sets null sender info when sender is not in userMap', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    const messages = [
      {
        id: MSG_ID,
        conversation_id: CONV_ID,
        sender_id: USER_B,
        content: 'Hi',
        read_at: null,
        created_at: NOW,
      },
    ];

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return makeConversationLookupBuilder({ user_a_id: USER_A, user_b_id: USER_B });
      if (callCount === 2) return makeMessagesQueryBuilder(messages);
      if (callCount === 3) return makeUpdateBuilder();
      return makeUsersInBuilder(null);
    });

    const res = await GET(createGetRequest(CONV_ID), { params: makeConversationParams(CONV_ID) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages[0].sender_name).toBeNull();
    expect(body.messages[0].sender_alias).toBeNull();
    expect(body.messages[0].sender_profile_photo_url).toBeNull();
  });
});

describe('POST /api/messages/[conversationId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendPushToUserIfEnabled.mockResolvedValue(undefined);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await POST(createPostRequest(CONV_ID, { content: 'Hello' }), {
      params: makeConversationParams(CONV_ID),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('No autorizado');
  });

  it('returns 400 when conversationId is not a valid UUID', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    const res = await POST(createPostRequest(INVALID_ID, { content: 'Hello' }), {
      params: makeConversationParams(INVALID_ID),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('ID invalido');
  });

  it('returns 400 for invalid JSON body', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    const req = new NextRequest(`http://localhost/api/messages/${CONV_ID}`, {
      method: 'POST',
      body: 'invalid-json{{{',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req, { params: makeConversationParams(CONV_ID) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('JSON invalido');
  });

  it('returns 400 when content is empty', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    const res = await POST(createPostRequest(CONV_ID, { content: '' }), {
      params: makeConversationParams(CONV_ID),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Datos invalidos');
    expect(body.details).toBeDefined();
  });

  it('returns 400 when content is missing', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    const res = await POST(createPostRequest(CONV_ID, {}), {
      params: makeConversationParams(CONV_ID),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when content exceeds 500 characters', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    const res = await POST(createPostRequest(CONV_ID, { content: 'a'.repeat(501) }), {
      params: makeConversationParams(CONV_ID),
    });
    expect(res.status).toBe(400);
  });

  it('returns 403 when conversation does not exist', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    mockFrom.mockReturnValue(makeConversationLookupBuilder(null));

    const res = await POST(createPostRequest(CONV_ID, { content: 'Hello' }), {
      params: makeConversationParams(CONV_ID),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('No tienes acceso a esta conversacion');
  });

  it('returns 403 when user is not a conversation participant', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    mockFrom.mockReturnValue(
      makeConversationLookupBuilder({
        user_a_id: USER_B,
        user_b_id: '55555555-5555-5555-5555-555555555555',
      })
    );

    const res = await POST(createPostRequest(CONV_ID, { content: 'Hello' }), {
      params: makeConversationParams(CONV_ID),
    });
    expect(res.status).toBe(403);
  });

  it('returns 403 when users are not mutual follows', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    mockFrom.mockReturnValue(
      makeConversationLookupBuilder({ user_a_id: USER_A, user_b_id: USER_B })
    );
    mockAreMutualFollows.mockResolvedValue(false);

    const res = await POST(createPostRequest(CONV_ID, { content: 'Hello' }), {
      params: makeConversationParams(CONV_ID),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Ya no puedes enviar mensajes a este usuario');
  });

  it('returns 500 when insert fails', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: USER_A, name: 'Alice', alias: 'alice', profile_photo_url: null },
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return makeConversationLookupBuilder({ user_a_id: USER_A, user_b_id: USER_B });
      return makeInsertMessageBuilder(null, { message: 'Insert failed' });
    });
    mockAreMutualFollows.mockResolvedValue(true);

    const res = await POST(createPostRequest(CONV_ID, { content: 'Hello' }), {
      params: makeConversationParams(CONV_ID),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Error al enviar mensaje');
  });

  it('creates message and returns 201 with full sender info', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: USER_A,
        name: 'Alice',
        alias: 'alice',
        profile_photo_url: 'https://example.com/alice.jpg',
      },
    });

    const createdMessage = {
      id: MSG_ID,
      conversation_id: CONV_ID,
      sender_id: USER_A,
      content: 'Hello there',
      read_at: null,
      created_at: NOW,
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return makeConversationLookupBuilder({ user_a_id: USER_A, user_b_id: USER_B });
      return makeInsertMessageBuilder(createdMessage, null);
    });
    mockAreMutualFollows.mockResolvedValue(true);

    const res = await POST(createPostRequest(CONV_ID, { content: 'Hello there' }), {
      params: makeConversationParams(CONV_ID),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.message.id).toBe(MSG_ID);
    expect(body.message.content).toBe('Hello there');
    expect(body.message.sender_name).toBe('Alice');
    expect(body.message.sender_alias).toBe('alice');
    expect(body.message.sender_profile_photo_url).toBe('https://example.com/alice.jpg');
  });

  it('sends push notification to other user after successful message insert', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: USER_A, name: 'Alice', alias: 'alice', profile_photo_url: null },
    });

    const createdMessage = {
      id: MSG_ID,
      conversation_id: CONV_ID,
      sender_id: USER_A,
      content: 'Push test',
      read_at: null,
      created_at: NOW,
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return makeConversationLookupBuilder({ user_a_id: USER_A, user_b_id: USER_B });
      return makeInsertMessageBuilder(createdMessage, null);
    });
    mockAreMutualFollows.mockResolvedValue(true);

    await POST(createPostRequest(CONV_ID, { content: 'Push test' }), {
      params: makeConversationParams(CONV_ID),
    });

    await vi.waitFor(() => {
      expect(mockSendPushToUserIfEnabled).toHaveBeenCalledWith(
        USER_B,
        expect.objectContaining({
          title: 'Mensaje de Alice',
          body: 'Push test',
          tag: `dm-${CONV_ID}`,
        }),
        'dm'
      );
    });
  });

  it('truncates push notification preview when content is over 100 characters', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: USER_A, name: 'Alice', alias: 'alice', profile_photo_url: null },
    });

    const longContent = 'a'.repeat(150);
    const createdMessage = {
      id: MSG_ID,
      conversation_id: CONV_ID,
      sender_id: USER_A,
      content: longContent,
      read_at: null,
      created_at: NOW,
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return makeConversationLookupBuilder({ user_a_id: USER_A, user_b_id: USER_B });
      return makeInsertMessageBuilder(createdMessage, null);
    });
    mockAreMutualFollows.mockResolvedValue(true);

    await POST(createPostRequest(CONV_ID, { content: longContent }), {
      params: makeConversationParams(CONV_ID),
    });

    await vi.waitFor(() => {
      expect(mockSendPushToUserIfEnabled).toHaveBeenCalledWith(
        USER_B,
        expect.objectContaining({
          body: expect.stringMatching(/\.\.\.$/),
        }),
        'dm'
      );
    });

    const callArgs = mockSendPushToUserIfEnabled.mock.calls[0] as [
      string,
      { body: string },
      string,
    ];
    expect(callArgs[1].body.length).toBe(100);
  });

  it('uses alias as sender name when session name is null', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: USER_A, name: null, alias: 'alice_alias', profile_photo_url: null },
    });

    const createdMessage = {
      id: MSG_ID,
      conversation_id: CONV_ID,
      sender_id: USER_A,
      content: 'Hi',
      read_at: null,
      created_at: NOW,
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return makeConversationLookupBuilder({ user_a_id: USER_A, user_b_id: USER_B });
      return makeInsertMessageBuilder(createdMessage, null);
    });
    mockAreMutualFollows.mockResolvedValue(true);

    await POST(createPostRequest(CONV_ID, { content: 'Hi' }), {
      params: makeConversationParams(CONV_ID),
    });

    await vi.waitFor(() => {
      expect(mockSendPushToUserIfEnabled).toHaveBeenCalledWith(
        USER_B,
        expect.objectContaining({ title: 'Mensaje de alice_alias' }),
        'dm'
      );
    });
  });

  it('returns 500 when an unexpected exception is thrown', async () => {
    mockGetServerSession.mockRejectedValue(new Error('Crash'));

    const res = await POST(createPostRequest(CONV_ID, { content: 'Hello' }), {
      params: makeConversationParams(CONV_ID),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Error interno');
  });
});
