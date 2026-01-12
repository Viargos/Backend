import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintToPostLikes1736640000000
  implements MigrationInterface
{
  name = 'AddUniqueConstraintToPostLikes1736640000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, remove duplicate likes, keeping only the oldest one for each user-post pair
    await queryRunner.query(`
      DELETE FROM "post_likes"
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM "post_likes"
        GROUP BY post_id, user_id
      )
    `);

    // After cleaning duplicates, recalculate like counts for all posts to fix any inconsistencies
    await queryRunner.query(`
      UPDATE "post"
      SET "likeCount" = (
        SELECT COUNT(*)
        FROM "post_likes"
        WHERE "post_likes"."post_id" = "post"."id"
      )
    `);

    // Ensure likeCount is never negative
    await queryRunner.query(`
      UPDATE "post"
      SET "likeCount" = 0
      WHERE "likeCount" < 0
    `);

    // Now add the unique constraint to prevent future duplicates
    await queryRunner.query(`
      ALTER TABLE "post_likes"
      ADD CONSTRAINT "UQ_post_likes_post_user"
      UNIQUE ("post_id", "user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the unique constraint
    await queryRunner.query(`
      ALTER TABLE "post_likes"
      DROP CONSTRAINT IF EXISTS "UQ_post_likes_post_user"
    `);
  }
}
