import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddUserPresenceFields1769532335000 implements MigrationInterface {
  name = 'AddUserPresenceFields1769532335000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('user', [
      new TableColumn({
        name: 'isOnline',
        type: 'boolean',
        default: false,
      }),
      new TableColumn({
        name: 'lastSeen',
        type: 'timestamptz',
        isNullable: true,
      }),
    ]);

    await queryRunner.createIndex(
      'user',
      new TableIndex({
        name: 'IDX_user_isOnline',
        columnNames: ['isOnline'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('user', 'IDX_user_isOnline');
    await queryRunner.dropColumn('user', 'lastSeen');
    await queryRunner.dropColumn('user', 'isOnline');
  }
}
