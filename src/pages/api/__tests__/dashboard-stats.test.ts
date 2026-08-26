import statsHandler, { DashboardStatsResponse } from '../dashboard/stats';
import { createMockRequest, createMockResponse } from './mock-request';

describe('GET /api/dashboard/stats API Endpoint', () => {
  it('returns status 200 with complete structured statistical indicators', async () => {
    const req = createMockRequest({ method: 'GET' });
    const mock = createMockResponse();

    await statsHandler(req, mock.res);

    expect(mock.statusCode).toBe(200);
    expect(mock.jsonData).toBeDefined();

    const stats = mock.jsonData as DashboardStatsResponse;

    // Verify key KPI numbers
    expect(stats.totalDocs).toBeGreaterThan(0);
    expect(stats.unanimousPercent).toBeGreaterThan(0);
    expect(stats.unanimousPercent).toBeLessThanOrEqual(100);
    expect(stats.topRelator).toBeDefined();
    expect(stats.topRelator.name).toBeTruthy();

    // Verify temporal distributions
    expect(Array.isArray(stats.yearlyStats)).toBe(true);
    expect(stats.yearlyStats.length).toBeGreaterThanOrEqual(5);

    expect(Array.isArray(stats.monthlyStats)).toBe(true);
    expect(stats.monthlyStats.length).toBe(12); // All 12 months

    // Verify legal areas breakdown
    expect(Array.isArray(stats.areaStats)).toBe(true);
    expect(stats.areaStats.some(a => a.name.includes('Cível'))).toBe(true);
    expect(stats.areaStats.some(a => a.name.includes('Criminal'))).toBe(true);

    // Verify decisions feed
    expect(Array.isArray(stats.recentDecisions)).toBe(true);
    expect(stats.recentDecisions.length).toBeGreaterThan(0);
    expect(stats.recentDecisions[0].processo).toBeTruthy();
    expect(stats.recentDecisions[0].data).toBeTruthy();
  });
});
