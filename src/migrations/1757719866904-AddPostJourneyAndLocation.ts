import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPostJourneyAndLocation1757719866904 implements MigrationInterface {
    name = 'AddPostJourneyAndLocation1757719866904'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "posts" ADD "journey_id" uuid`);
        await queryRunner.query(`ALTER TABLE "posts" ADD "location" character varying`);
        await queryRunner.query(`ALTER TABLE "posts" ADD "latitude" numeric(10,8)`);
        await queryRunner.query(`ALTER TABLE "posts" ADD "longitude" numeric(11,8)`);
        await queryRunner.query(`ALTER TABLE "journey" ALTER COLUMN "createdAt" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "journey" ALTER COLUMN "createdAt" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "journey" ALTER COLUMN "updatedAt" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "journey" ALTER COLUMN "updatedAt" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "posts" ADD CONSTRAINT "FK_41553f830fe06fa8dcd353463af" FOREIGN KEY ("journey_id") REFERENCES "journey"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "posts" DROP CONSTRAINT "FK_41553f830fe06fa8dcd353463af"`);
        await queryRunner.query(`ALTER TABLE "journey" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "journey" ALTER COLUMN "updatedAt" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "journey" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "journey" ALTER COLUMN "createdAt" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "longitude"`);
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "latitude"`);
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "location"`);
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "journey_id"`);
    }

}
