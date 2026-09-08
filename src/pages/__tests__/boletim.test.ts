import { getServerSideProps } from '../boletim';

describe('Boletim Page getServerSideProps', () => {
  it('gracefully returns fallback parameters and areas when Elasticsearch is offline', async () => {
    const mockContext: any = {
      req: { headers: {}, url: '/boletim' },
      res: { setHeader: jest.fn() },
      query: {}
    };

    const response = await (getServerSideProps as any)(mockContext);

    expect(response).toBeDefined();
    expect(response.props).toBeDefined();
    expect(Array.isArray(response.props.areas)).toBe(true);
    expect(response.props.areas.length).toBeGreaterThan(0);
    expect(response.props.areas).toContain('Área Cível');
    expect(response.props.minYear).toBeGreaterThan(1900);
    expect(response.props.maxYear).toBeGreaterThanOrEqual(response.props.minYear);
    expect(response.props.isOffline).toBe(true);
  });
});
