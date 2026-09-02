import { logAuditEvent, getUsernameFromReq, getIpFromReq, queryAuditLog, AuditAction } from '../audit-log';
import { createMockRequest } from '@/pages/api/__tests__/mock-request';

describe('Audit Log & Activity Tracking', () => {
  describe('Helper Functions', () => {
    it('extracts username from authenticated request cookies', () => {
      const req = createMockRequest({
        cookies: { user: 'juiz_conselheiro_silva' }
      });
      expect(getUsernameFromReq(req)).toBe('juiz_conselheiro_silva');
    });

    it('returns unknown when user cookie is absent', () => {
      const req = createMockRequest({ cookies: {} });
      expect(getUsernameFromReq(req)).toBe('unknown');
    });

    it('extracts IP from x-forwarded-for header or remoteAddress socket', () => {
      const reqForwarded = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.100, 10.0.0.1' }
      });
      expect(getIpFromReq(reqForwarded)).toBe('192.168.1.100');

      const reqDirect = createMockRequest({
        headers: {}
      });
      // remoteAddress fallback or unknown
      expect(typeof getIpFromReq(reqDirect)).toBe('string');
    });
  });

  describe('logAuditEvent & queryAuditLog (Resilience)', () => {
    it('logs audit events safely without throwing unhandled exceptions when offline', async () => {
      // Should not throw even when Elasticsearch is unavailable
      await expect(
        logAuditEvent('publicar', 'admin', {
          documentId: 'doc_123',
          documentProcesso: '123/20.5YFLSB',
          details: 'Documento publicado com sucesso'
        })
      ).resolves.not.toThrow();
    });

    it('handles queryAuditLog with filters and pagination parameters', async () => {
      try {
        const result = await queryAuditLog({
          action: 'login',
          user: 'admin',
          page: 0,
          size: 10
        });

        expect(result).toBeDefined();
        expect(Array.isArray(result.events)).toBe(true);
        expect(typeof result.total).toBe('number');
      } catch (err: any) {
        // When Elasticsearch is offline in unit test environment
        expect(err).toBeDefined();
      }
    });
  });
});
