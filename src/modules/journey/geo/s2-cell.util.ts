import { S2CellId, S2LatLng } from 'nodes2ts';
import { S2_INDEX_LEVELS, S2IndexLevel, S2PlaceIndex } from './geo-index.types';

const EMPTY_S2_PLACE_INDEX: S2PlaceIndex = {
  s2CellIdLevel10: null,
  s2CellIdLevel12: null,
  s2CellIdLevel14: null,
};

function toFiniteNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function hasValidCoordinates(
  latitude: number | string | null | undefined,
  longitude: number | string | null | undefined,
): boolean {
  const parsedLatitude = toFiniteNumber(latitude);
  const parsedLongitude = toFiniteNumber(longitude);

  return (
    parsedLatitude !== null
    && parsedLongitude !== null
    && parsedLatitude >= -90
    && parsedLatitude <= 90
    && parsedLongitude >= -180
    && parsedLongitude <= 180
  );
}

export function buildS2CellToken(
  latitude: number | string,
  longitude: number | string,
  level: S2IndexLevel,
): string {
  const parsedLatitude = toFiniteNumber(latitude);
  const parsedLongitude = toFiniteNumber(longitude);

  if (!hasValidCoordinates(parsedLatitude, parsedLongitude)) {
    throw new RangeError('Latitude and longitude must be finite WGS84 coordinates.');
  }

  const leafCellId = S2CellId.fromPoint(
    S2LatLng.fromDegrees(parsedLatitude, parsedLongitude).toPoint(),
  );

  return leafCellId.parentL(level).toToken();
}

export function buildS2PlaceIndex(
  latitude: number | string | null | undefined,
  longitude: number | string | null | undefined,
): S2PlaceIndex {
  if (!hasValidCoordinates(latitude, longitude)) {
    return { ...EMPTY_S2_PLACE_INDEX };
  }

  const [level10, level12, level14] = S2_INDEX_LEVELS.map(level =>
    buildS2CellToken(latitude as number | string, longitude as number | string, level),
  );

  return {
    s2CellIdLevel10: level10,
    s2CellIdLevel12: level12,
    s2CellIdLevel14: level14,
  };
}
