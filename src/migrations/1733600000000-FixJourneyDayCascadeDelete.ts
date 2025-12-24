import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixJourneyDayCascadeDelete1733600000000
  implements MigrationInterface
{
  name = 'FixJourneyDayCascadeDelete1733600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the existing foreign key constraint
    // The constraint name from the error is FK_98359c0937624295215dde75d93
    await queryRunner.query(`
      ALTER TABLE "journey_day" 
      DROP CONSTRAINT IF EXISTS "FK_98359c0937624295215dde75d93"
    `);

    // Recreate the foreign key constraint with ON DELETE CASCADE
    // Try journeyId first (TypeORM camelCase convention)
    try {
      await queryRunner.query(`
        ALTER TABLE "journey_day" 
        ADD CONSTRAINT "FK_98359c0937624295215dde75d93" 
        FOREIGN KEY ("journeyId") 
        REFERENCES "journey"("id") 
        ON DELETE CASCADE 
        ON UPDATE NO ACTION
      `);
    } catch (error) {
      // If journeyId doesn't exist, try journey_id (snake_case)
      await queryRunner.query(`
        ALTER TABLE "journey_day" 
        ADD CONSTRAINT "FK_98359c0937624295215dde75d93" 
        FOREIGN KEY ("journey_id") 
        REFERENCES "journey"("id") 
        ON DELETE CASCADE 
        ON UPDATE NO ACTION
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the CASCADE constraint
    await queryRunner.query(`
      ALTER TABLE "journey_day" 
      DROP CONSTRAINT IF EXISTS "FK_98359c0937624295215dde75d93"
    `);

    // Recreate without CASCADE (restore original behavior)
    // Try journeyId first
    try {
      await queryRunner.query(`
        ALTER TABLE "journey_day" 
        ADD CONSTRAINT "FK_98359c0937624295215dde75d93" 
        FOREIGN KEY ("journeyId") 
        REFERENCES "journey"("id") 
        ON DELETE NO ACTION 
        ON UPDATE NO ACTION
      `);
    } catch (error) {
      // If journeyId doesn't exist, try journey_id
      await queryRunner.query(`
        ALTER TABLE "journey_day" 
        ADD CONSTRAINT "FK_98359c0937624295215dde75d93" 
        FOREIGN KEY ("journey_id") 
        REFERENCES "journey"("id") 
        ON DELETE NO ACTION 
        ON UPDATE NO ACTION
      `);
    }
  }
}











