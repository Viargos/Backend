import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateRefreshTokensTable1769532333000
  implements MigrationInterface
{
  name = 'CreateRefreshTokensTable1769532333000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'refresh_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tokenHash',
            type: 'varchar',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'tokenId',
            type: 'varchar',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'isRevoked',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'lastUsedAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'userAgent',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({
        name: 'IDX_refresh_tokens_tokenHash',
        columnNames: ['tokenHash'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({
        name: 'IDX_refresh_tokens_tokenId',
        columnNames: ['tokenId'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({
        name: 'IDX_refresh_tokens_userId',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({
        name: 'IDX_refresh_tokens_expiresAt',
        columnNames: ['expiresAt'],
      }),
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'refresh_tokens',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    const table = await queryRunner.getTable('refresh_tokens');
    const foreignKey = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('userId') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('refresh_tokens', foreignKey);
    }

    // Drop indexes
    await queryRunner.dropIndex('refresh_tokens', 'IDX_refresh_tokens_expiresAt');
    await queryRunner.dropIndex('refresh_tokens', 'IDX_refresh_tokens_userId');
    await queryRunner.dropIndex('refresh_tokens', 'IDX_refresh_tokens_tokenId');
    await queryRunner.dropIndex('refresh_tokens', 'IDX_refresh_tokens_tokenHash');

    // Drop table
    await queryRunner.dropTable('refresh_tokens');
  }
}
