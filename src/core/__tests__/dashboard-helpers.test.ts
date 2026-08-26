import { updateTooltipPosition } from '../dashboard-helpers';
import { listAggregation } from '../indices-helpers';

describe('Dashboard & Indices Visualization Helpers', () => {
  describe('Tooltip Positioning', () => {
    let container: HTMLDivElement;
    let tooltip: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
      container.id = 'test-container';
      // Mock getBoundingClientRect
      container.getBoundingClientRect = jest.fn(() => ({
        left: 50,
        top: 50,
        width: 500,
        height: 300,
        right: 550,
        bottom: 350,
        x: 50,
        y: 50,
        toJSON: () => {}
      }));
      document.body.appendChild(container);

      tooltip = document.createElement('div');
      Object.defineProperty(tooltip, 'offsetWidth', { value: 100, configurable: true });
      Object.defineProperty(tooltip, 'offsetHeight', { value: 40, configurable: true });
      document.body.appendChild(tooltip);
    });

    afterEach(() => {
      document.body.removeChild(container);
      document.body.removeChild(tooltip);
    });

    it('positions tooltip within container bounds', () => {
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: 200,
        clientY: 150
      });

      updateTooltipPosition(tooltip, mouseEvent, 'test-container');

      expect(tooltip.style.opacity).toBe('1');
      expect(tooltip.style.left).toBe('50px'); // 200 - 50 - 100 = 50px
      expect(tooltip.style.top).toBe('60px');  // 150 - 50 - 40 = 60px
    });

    it('clamps tooltip position when cursor is near the left edge', () => {
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: 60,
        clientY: 150
      });

      updateTooltipPosition(tooltip, mouseEvent, 'test-container');

      // 60 - 50 - 100 = -90 -> clamped to 0
      expect(tooltip.style.left).toBe('0px');
    });
  });

  describe('Indices Aggregations Generator', () => {
    it('generates multi-dimensional terms and group aggregations', () => {
      const aggResult = listAggregation('Área', 'Secção');

      expect(aggResult.MinAno).toBeDefined();
      expect(aggResult.MaxAno).toBeDefined();
      expect(aggResult.Área).toBeDefined();
      expect(aggResult.Área.terms).toBeDefined();
      expect(aggResult.Área.aggs?.Group).toBeDefined();
    });

    it('generates single term aggregation when group is not provided', () => {
      const aggResult = listAggregation('Relator Nome Profissional');

      expect(aggResult['Relator Nome Profissional']).toBeDefined();
      expect(aggResult['Relator Nome Profissional'].aggs?.Group).toBeUndefined();
    });
  });
});
