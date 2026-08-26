import loginApiHandler from '../user/login';
import { createMockRequest, createMockResponse } from './mock-request';

describe('POST /api/user/login API Endpoint', () => {
  it('rejects non-POST HTTP methods with 405 Method Not Allowed', async () => {
    const req = createMockRequest({ method: 'GET' });
    const mock = createMockResponse();

    await loginApiHandler(req, mock.res);

    expect(mock.statusCode).toBe(405);
    expect(mock.jsonData.ok).toBe(false);
  });

  it('rejects requests with missing credentials with 400 Bad Request', async () => {
    const req = createMockRequest({
      method: 'POST',
      body: { user: 'admin' } // missing password
    });
    const mock = createMockResponse();

    await loginApiHandler(req, mock.res);

    expect(mock.statusCode).toBe(400);
    expect(mock.jsonData.ok).toBe(false);
    expect(mock.jsonData.message).toContain('obrigatórios');
  });

  it('authenticates valid admin credentials, sets HttpOnly cookies, and returns 200 OK', async () => {
    const req = createMockRequest({
      method: 'POST',
      body: { user: 'admin', pass: 'admin' }
    });
    const mock = createMockResponse();

    await loginApiHandler(req, mock.res);

    expect(mock.statusCode).toBe(200);
    expect(mock.jsonData.ok).toBe(true);
    expect(mock.jsonData.user).toBe('admin');
    expect(mock.headers['set-cookie']).toBeDefined();
    expect(mock.headers['set-cookie'].some((c: string) => c.includes('session='))).toBe(true);
    expect(mock.headers['set-cookie'].some((c: string) => c.includes('user=admin'))).toBe(true);
  });

  it('rejects invalid password with 401 Unauthorized', async () => {
    const req = createMockRequest({
      method: 'POST',
      body: { user: 'admin', pass: 'definitely_wrong_password_999' }
    });
    const mock = createMockResponse();

    await loginApiHandler(req, mock.res);

    expect(mock.statusCode).toBe(401);
    expect(mock.jsonData.ok).toBe(false);
    expect(mock.jsonData.message).toBe('Palavra-passe incorreta');
  });

  it('rejects non-existent username with 401 Unauthorized', async () => {
    const req = createMockRequest({
      method: 'POST',
      body: { user: 'ghost_user_does_not_exist', pass: 'somepass' }
    });
    const mock = createMockResponse();

    await loginApiHandler(req, mock.res);

    expect(mock.statusCode).toBe(401);
    expect(mock.jsonData.ok).toBe(false);
    expect(mock.jsonData.message).toBe('Utilizador não encontrado');
  });
});
