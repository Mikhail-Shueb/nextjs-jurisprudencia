import type { NextApiRequest, NextApiResponse } from 'next';

export function createMockRequest(options: Partial<NextApiRequest> = {}): NextApiRequest {
  return {
    method: 'GET',
    url: '/api/test',
    headers: { host: 'localhost:3000' },
    query: {},
    cookies: {},
    body: {},
    ...options
  } as unknown as NextApiRequest;
}

export type MockResponse = {
  res: NextApiResponse;
  statusCode: number;
  jsonData: any;
  headers: Record<string, any>;
};

export function createMockResponse(): MockResponse {
  const state: MockResponse = {
    res: {} as NextApiResponse,
    statusCode: 200,
    jsonData: null,
    headers: {}
  };

  const mockRes = {
    get statusCode() {
      return state.statusCode;
    },
    set statusCode(code: number) {
      state.statusCode = code;
    },
    status(code: number) {
      state.statusCode = code;
      return this;
    },
    json(data: any) {
      state.jsonData = data;
      return this;
    },
    setHeader(name: string, value: any) {
      state.headers[name.toLowerCase()] = value;
      return this;
    },
    end() {
      return this;
    }
  };

  state.res = mockRes as unknown as NextApiResponse;
  return state;
}
