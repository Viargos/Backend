import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJourneyLinkAndLocationToPosts1726156800000
  implements MigrationInterface
{
  name = 'AddJourneyLinkAndLocationToPosts1726156800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "posts" 
      ADD COLUMN "journey_id" uuid NULL,
      ADD COLUMN "location" varchar NULL,
      ADD COLUMN "latitude" decimal(10,8) NULL,
      ADD COLUMN "longitude" decimal(11,8) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "posts" 
      ADD CONSTRAINT "FK_posts_journey_id" 
      FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "posts" DROP CONSTRAINT "FK_posts_journey_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "posts" 
      DROP COLUMN "journey_id",
      DROP COLUMN "location",
      DROP COLUMN "latitude",
      DROP COLUMN "longitude"
    `);
  }
}
