import boletimCountHandler from '../boletim/count';
import { createMockRequest, createMockResponse } from './mock-request';

describe('GET /api/boletim/count API Endpoint', () => {
  it('returns status 200 with count of rulings matching area, year, and month', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: {
        area: 'Área Cível',
        year: '2024',
        month: '5'
      }
    });
    const mock = createMockResponse();

    await boletimCountHandler(req, mock.res);

    expect(mock.statusCode).toBe(200);
    expect(mock.jsonData).toBeDefined();
    expect(typeof mock.jsonData.count).toBe('number');
    expect(mock.jsonData.count).toBeGreaterThanOrEqual(0);
  });

  it('handles default parameters when query strings are omitted', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: {}
    });
    const mock = createMockResponse();

    await boletimCountHandler(req, mock.res);

    expect(mock.statusCode).toBe(200);
    expect(mock.jsonData).toBeDefined();
    expect(typeof mock.jsonData.count).toBe('number');
  });
});
