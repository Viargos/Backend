import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddLocationFieldsToJourneyDayPlace1692363901000 implements MigrationInterface {
  name = 'AddLocationFieldsToJourneyDayPlace1692363901000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add address column
    await queryRunner.addColumn(
      'journey_day_place',
      new TableColumn({
        name: 'address',
        type: 'varchar',
        isNullable: true,
      })
    );

    // Add latitude column
    await queryRunner.addColumn(
      'journey_day_place',
      new TableColumn({
        name: 'latitude',
        type: 'decimal',
        precision: 10,
        scale: 6,
        isNullable: true,
      })
    );

    // Add longitude column
    await queryRunner.addColumn(
      'journey_day_place',
      new TableColumn({
        name: 'longitude',
        type: 'decimal',
        precision: 10,
        scale: 6,
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('journey_day_place', 'longitude');
    await queryRunner.dropColumn('journey_day_place', 'latitude');
    await queryRunner.dropColumn('journey_day_place', 'address');
  }
}
