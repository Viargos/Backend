import { Injectable } from '@nestjs/common';
import { S2PlaceIndex } from './geo-index.types';
import { buildS2PlaceIndex } from './s2-cell.util';

@Injectable()
export class GeoIndexService {
  buildPlaceIndex(
    latitude: number | string | null | undefined,
    longitude: number | string | null | undefined,
  ): S2PlaceIndex {
    return buildS2PlaceIndex(latitude, longitude);
  }
}
