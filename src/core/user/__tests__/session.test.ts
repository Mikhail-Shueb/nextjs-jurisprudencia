import { createSession, validateSession, deleteSession, deleteUserSession, SESSION_EXPIRE } from '../session';

describe('Session Management & Cross-Context Storage', () => {
  const testUser = 'admin';

  afterEach(async () => {
    await deleteUserSession(testUser);
  });

  it('creates a non-empty session token with 48 hex characters (24 bytes)', async () => {
    const sessionId = await createSession(testUser);
    expect(sessionId).toBeDefined();
    expect(typeof sessionId).toBe('string');
    expect(sessionId.length).toBe(48); // 24 bytes hex = 48 chars
  });

  it('validates an active session token for the correct user', async () => {
    const sessionId = await createSession(testUser);
    const isValid = await validateSession(testUser, sessionId);
    expect(isValid).toBe(true);
  });

  it('rejects validation when username does not match session owner', async () => {
    const sessionId = await createSession(testUser);
    const isValid = await validateSession('wrong_user', sessionId);
    expect(isValid).toBe(false);
  });

  it('rejects non-existent or empty session tokens', async () => {
    expect(await validateSession(testUser, '')).toBe(false);
    expect(await validateSession('', 'some_session')).toBe(false);
    expect(await validateSession(testUser, 'non_existent_token_123456789012345678901234')).toBe(false);
  });

  it('deletes a specific session successfully', async () => {
    const sessionId = await createSession(testUser);
    expect(await validateSession(testUser, sessionId)).toBe(true);

    const deleted = await deleteSession(testUser, sessionId);
    expect(deleted).toBeGreaterThanOrEqual(1);

    expect(await validateSession(testUser, sessionId)).toBe(false);
  });

  it('deletes all sessions for a specific user', async () => {
    const s1 = await createSession(testUser);
    const s2 = await createSession(testUser);
    const otherUser = 'editor';
    const s3 = await createSession(otherUser);

    expect(await validateSession(testUser, s1)).toBe(true);
    expect(await validateSession(testUser, s2)).toBe(true);
    expect(await validateSession(otherUser, s3)).toBe(true);

    await deleteUserSession(testUser);

    expect(await validateSession(testUser, s1)).toBe(false);
    expect(await validateSession(testUser, s2)).toBe(false);
    expect(await validateSession(otherUser, s3)).toBe(true); // other user unaffected

    await deleteUserSession(otherUser);
  });

  it('shares sessions across module contexts via globalThis.__jurisprudencia_sessions__', async () => {
    const sessionId = await createSession(testUser);
    const globalSessions = (globalThis as any).__jurisprudencia_sessions__;

    expect(globalSessions).toBeDefined();
    expect(globalSessions instanceof Map).toBe(true);
    expect(globalSessions.has(sessionId)).toBe(true);
    expect(globalSessions.get(sessionId)?.user).toBe(testUser);
  });
});
