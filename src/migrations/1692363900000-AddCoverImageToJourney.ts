import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCoverImageToJourney1692363900000 implements MigrationInterface {
  name = 'AddCoverImageToJourney1692363900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'journey',
      new TableColumn({
        name: 'coverImage',
        type: 'varchar',
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('journey', 'coverImage');
  }
}
