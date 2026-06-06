import { GeoIndexService } from '../geo/geo-index.service';
import { buildS2CellToken, buildS2PlaceIndex, hasValidCoordinates } from '../geo/s2-cell.util';

describe('GeoIndexService', () => {
  const service = new GeoIndexService();

  it('builds stable S2 tokens for every configured place level', () => {
    expect(service.buildPlaceIndex(23.0225, 72.5714)).toEqual({
      s2CellIdLevel10: '395e85',
      s2CellIdLevel12: '395e845',
      s2CellIdLevel14: '395e8457',
    });
  });

  it('returns a null S2 index when coordinates are incomplete', () => {
    expect(service.buildPlaceIndex(23.0225, null)).toEqual({
      s2CellIdLevel10: null,
      s2CellIdLevel12: null,
      s2CellIdLevel14: null,
    });
  });

  it('treats zero coordinates as valid searchable coordinates', () => {
    const index = buildS2PlaceIndex(0, 0);

    expect(index.s2CellIdLevel10).toEqual(expect.any(String));
    expect(index.s2CellIdLevel12).toEqual(expect.any(String));
    expect(index.s2CellIdLevel14).toEqual(expect.any(String));
  });

  it('rejects out-of-range coordinates for S2 token generation', () => {
    expect(hasValidCoordinates(91, 0)).toBe(false);
    expect(() => buildS2CellToken(91, 0, 10)).toThrow(RangeError);
  });
});
