import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOrderToJourneyDayPlace1708800000000 implements MigrationInterface {
  name = 'AddOrderToJourneyDayPlace1708800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add order column (nullable for backward compatibility)
    await queryRunner.addColumn(
      'journey_day_place',
      new TableColumn({
        name: 'order',
        type: 'integer',
        isNullable: true,
        comment: 'Display order for drag-and-drop persistence (0-indexed)',
      })
    );

    console.log('✅ Added "order" column to journey_day_place table');

    // Step 2: Backfill existing records with default order
    // This assigns order based on current database ID sequence
    // Places without order will get 0, 1, 2, ... based on existing position
    const backfillQuery = `
      UPDATE journey_day_place
      SET "order" = subquery.row_num - 1
      FROM (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY "journeyDayId"
            ORDER BY id ASC
          ) as row_num
        FROM journey_day_place
      ) AS subquery
      WHERE journey_day_place.id = subquery.id
        AND journey_day_place."order" IS NULL;
    `;

    await queryRunner.query(backfillQuery);

    const updatedCount = await queryRunner.query(
      `SELECT COUNT(*) as count FROM journey_day_place WHERE "order" IS NOT NULL`
    );

    console.log(`✅ Backfilled order for ${updatedCount[0].count} existing places`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: Remove the order column
    await queryRunner.dropColumn('journey_day_place', 'order');
    console.log('✅ Rolled back: Removed "order" column from journey_day_place table');
  }
}
