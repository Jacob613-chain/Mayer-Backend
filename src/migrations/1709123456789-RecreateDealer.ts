import { MigrationInterface, QueryRunner } from "typeorm";

export class RecreateDealer1709123456789 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // First, rename the existing table (if it exists) to backup
        await queryRunner.query(`
            DROP TABLE IF EXISTS "dealers_backup" CASCADE;
            ALTER TABLE IF EXISTS "dealers" RENAME TO "dealers_backup";
        `);

        // Create the new table with the correct structure
        await queryRunner.query(`
            CREATE TABLE "dealers" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "dealer_id" varchar NOT NULL UNIQUE,
                "name" varchar NOT NULL,
                "logo" varchar NULL,
                "reps" text[] NOT NULL DEFAULT '{}',
                "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Drop the backup table
        await queryRunner.query(`
            DROP TABLE IF EXISTS "dealers_backup" CASCADE;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "dealers" CASCADE`);
    }
}