/*
  Warnings:

  - You are about to drop the column `client_type` on the `parties` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `parties` DROP COLUMN `client_type`;

-- CreateTable
CREATE TABLE `party_client_types` (
    `party_id` INTEGER NOT NULL,
    `client_type` ENUM('ACCOUNTING', 'PAYROLL') NOT NULL,

    PRIMARY KEY (`party_id`, `client_type`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `party_client_types` ADD CONSTRAINT `party_client_types_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
