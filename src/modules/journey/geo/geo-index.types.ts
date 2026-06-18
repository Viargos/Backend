export const S2_INDEX_LEVELS = [10, 12, 14] as const;

export type S2IndexLevel = typeof S2_INDEX_LEVELS[number];

export type S2PlaceIndex = {
  s2CellIdLevel10: string | null;
  s2CellIdLevel12: string | null;
  s2CellIdLevel14: string | null;
};
