import crypto from 'crypto';

describe('Email Sync Privacy & Cryptographic Safeguards', () => {
  const TEST_SECRET = 'super-secret-sync-key-12345';
  const NON_ANON_FIELDS = ['Texto Não Anonimizado', 'Sumário Não Anonimizado'] as const;

  function stripNonAnon<T extends Record<string, any>>(content: T): T {
    const clone: Record<string, any> = { ...content };
    for (const field of NON_ANON_FIELDS) delete clone[field];
    return clone as T;
  }

  function computeSig(secret: string, action: string, uuid: string, ts: number, content?: Record<string, any>): string {
    const contentHash = content
      ? crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex')
      : undefined;
    const data = JSON.stringify({ action, uuid, ts, ...(contentHash ? { contentHash } : {}) });
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  it('strictly strips non-anonymized confidential fields before sync payload creation', () => {
    const rawDocument = {
      UUID: 'acordao-uuid-12345',
      Processo: '123/20.5YFLSB',
      Texto: 'Acórdão anonimizado com entidades protegidas...',
      Sumário: 'Sumário anonimizado...',
      'Texto Não Anonimizado': 'CONFIDENCIAL: Nome Real do Cidadão e dados bancários...',
      'Sumário Não Anonimizado': 'CONFIDENCIAL: Detalhes restritos...',
      Relator: 'Juiz Conselheiro A'
    };

    const safeDocument = stripNonAnon(rawDocument);

    expect(safeDocument.UUID).toBe('acordao-uuid-12345');
    expect(safeDocument.Texto).toBe('Acórdão anonimizado com entidades protegidas...');
    expect((safeDocument as any)['Texto Não Anonimizado']).toBeUndefined();
    expect((safeDocument as any)['Sumário Não Anonimizado']).toBeUndefined();
    expect(safeDocument.Relator).toBe('Juiz Conselheiro A');
  });

  it('computes and validates HMAC-SHA256 signatures deterministically', () => {
    const uuid = 'doc-test-999';
    const ts = 1700000000000;
    const content = { Processo: '456/21.0' };

    const sig1 = computeSig(TEST_SECRET, 'publicar', uuid, ts, content);
    const sig2 = computeSig(TEST_SECRET, 'publicar', uuid, ts, content);
    const sigTampered = computeSig(TEST_SECRET, 'publicar', uuid, ts, { Processo: 'TAMPERED' });

    expect(sig1).toBe(sig2);
    expect(sig1).not.toBe(sigTampered);
    expect(sig1).toHaveLength(64); // 32 bytes hex
  });

  it('detects tampering or altered timestamps in sync payloads', () => {
    const uuid = 'doc-test-999';
    const ts = Date.now();
    const sigOriginal = computeSig(TEST_SECRET, 'editar', uuid, ts);
    const sigAlteredTime = computeSig(TEST_SECRET, 'editar', uuid, ts + 1000);

    expect(sigOriginal).not.toBe(sigAlteredTime);
  });
});
