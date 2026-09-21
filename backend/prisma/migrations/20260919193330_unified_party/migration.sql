/*
  Warnings:

  - You are about to drop the `client_addresses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `client_contacts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `clients` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `contractor_addresses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `contractors` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `client_addresses` DROP FOREIGN KEY `client_addresses_client_id_fkey`;

-- DropForeignKey
ALTER TABLE `client_contacts` DROP FOREIGN KEY `client_contacts_client_id_fkey`;

-- DropForeignKey
ALTER TABLE `client_contacts` DROP FOREIGN KEY `client_contacts_document_type_id_fkey`;

-- DropForeignKey
ALTER TABLE `client_contractors` DROP FOREIGN KEY `client_contractors_client_id_fkey`;

-- DropForeignKey
ALTER TABLE `client_contractors` DROP FOREIGN KEY `client_contractors_contractor_id_fkey`;

-- DropForeignKey
ALTER TABLE `contractor_addresses` DROP FOREIGN KEY `contractor_addresses_contractor_id_fkey`;

-- DropForeignKey
ALTER TABLE `contractors` DROP FOREIGN KEY `contractors_document_type_id_fkey`;

-- DropTable
DROP TABLE `client_addresses`;

-- DropTable
DROP TABLE `client_contacts`;

-- DropTable
DROP TABLE `clients`;

-- DropTable
DROP TABLE `contractor_addresses`;

-- DropTable
DROP TABLE `contractors`;

-- CreateTable
CREATE TABLE `parties` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kind` ENUM('PERSON', 'COMPANY') NOT NULL,
    `full_name` VARCHAR(180) NOT NULL,
    `is_client` BOOLEAN NOT NULL DEFAULT false,
    `client_type` ENUM('ACCOUNTING', 'PAYROLL') NULL,
    `registry_number` VARCHAR(60) NULL,
    `document_type_id` INTEGER NULL,
    `document_number` VARCHAR(60) NULL,
    `normalized_document` VARCHAR(60) NULL,
    `email` VARCHAR(255) NULL,
    `phone` VARCHAR(40) NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `parties_normalized_document_key`(`normalized_document`),
    INDEX `parties_kind_idx`(`kind`),
    INDEX `parties_is_client_idx`(`is_client`),
    INDEX `parties_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `party_contacts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `party_id` INTEGER NOT NULL,
    `first_name` VARCHAR(80) NULL,
    `last_name` VARCHAR(80) NULL,
    `email` VARCHAR(255) NULL,
    `phone` VARCHAR(40) NULL,
    `document_type_id` INTEGER NULL,
    `document_number` VARCHAR(60) NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `party_contacts_party_id_idx`(`party_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `party_addresses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `party_id` INTEGER NOT NULL,
    `kind` ENUM('FISCAL', 'MAILING', 'OTHER') NOT NULL DEFAULT 'FISCAL',
    `label` VARCHAR(80) NULL,
    `street` VARCHAR(180) NULL,
    `city` VARCHAR(80) NULL,
    `state` VARCHAR(10) NULL,
    `zip` VARCHAR(15) NULL,
    `same_as_fiscal` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `party_addresses_party_id_idx`(`party_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `parties` ADD CONSTRAINT `parties_document_type_id_fkey` FOREIGN KEY (`document_type_id`) REFERENCES `document_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_contacts` ADD CONSTRAINT `party_contacts_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_contacts` ADD CONSTRAINT `party_contacts_document_type_id_fkey` FOREIGN KEY (`document_type_id`) REFERENCES `document_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_addresses` ADD CONSTRAINT `party_addresses_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_contractors` ADD CONSTRAINT `client_contractors_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_contractors` ADD CONSTRAINT `client_contractors_contractor_id_fkey` FOREIGN KEY (`contractor_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
