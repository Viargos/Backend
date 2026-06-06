import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';
import { buildS2PlaceIndex } from '../modules/journey/geo/s2-cell.util';

type PlaceCoordinateRow = {
  id: string;
  latitude: number | string | null;
  longitude: number | string | null;
};

const S2_COLUMNS = [
  's2CellIdLevel10',
  's2CellIdLevel12',
  's2CellIdLevel14',
] as const;

const S2_INDEXES = [
  {
    column: 's2CellIdLevel10',
    name: 'IDX_journey_day_place_s2_l10',
  },
  {
    column: 's2CellIdLevel12',
    name: 'IDX_journey_day_place_s2_l12',
  },
  {
    column: 's2CellIdLevel14',
    name: 'IDX_journey_day_place_s2_l14',
  },
] as const;

export class AddS2CellsToJourneyDayPlace1769532336000 implements MigrationInterface {
  name = 'AddS2CellsToJourneyDayPlace1769532336000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const columnName of S2_COLUMNS) {
      const hasColumn = await queryRunner.hasColumn('journey_day_place', columnName);

      if (!hasColumn) {
        await queryRunner.addColumn(
          'journey_day_place',
          new TableColumn({
            name: columnName,
            type: 'varchar',
            length: '16',
            isNullable: true,
            comment: `S2 cell token for indexed nearby journey search (${columnName})`,
          }),
        );
      }
    }

    await this.backfillExistingPlaces(queryRunner);

    for (const index of S2_INDEXES) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "${index.name}"
        ON "journey_day_place" ("${index.column}")
        WHERE "${index.column}" IS NOT NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const index of [...S2_INDEXES].reverse()) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${index.name}"`);
    }

    for (const columnName of [...S2_COLUMNS].reverse()) {
      const hasColumn = await queryRunner.hasColumn('journey_day_place', columnName);

      if (hasColumn) {
        await queryRunner.dropColumn('journey_day_place', columnName);
      }
    }
  }

  private async backfillExistingPlaces(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query(`
      SELECT id, latitude, longitude
      FROM "journey_day_place"
      WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND (
          "s2CellIdLevel10" IS NULL
          OR "s2CellIdLevel12" IS NULL
          OR "s2CellIdLevel14" IS NULL
        )
    `) as PlaceCoordinateRow[];

    for (const row of rows) {
      const s2Index = buildS2PlaceIndex(row.latitude, row.longitude);

      await queryRunner.query(
        `
          UPDATE "journey_day_place"
          SET
            "s2CellIdLevel10" = $1,
            "s2CellIdLevel12" = $2,
            "s2CellIdLevel14" = $3
          WHERE id = $4
        `,
        [
          s2Index.s2CellIdLevel10,
          s2Index.s2CellIdLevel12,
          s2Index.s2CellIdLevel14,
          row.id,
        ],
      );
    }
  }
}
