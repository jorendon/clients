-- CreateTable
CREATE TABLE `document_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `deleted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `document_types_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('ACCOUNTING', 'PAYROLL') NOT NULL,
    `name` VARCHAR(180) NOT NULL,
    `document_number` VARCHAR(60) NULL,
    `fei_ein` VARCHAR(20) NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `clients_type_idx`(`type`),
    INDEX `clients_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_contacts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `client_id` INTEGER NOT NULL,
    `first_name` VARCHAR(80) NOT NULL,
    `last_name` VARCHAR(80) NOT NULL,
    `email` VARCHAR(255) NULL,
    `phone` VARCHAR(40) NULL,
    `document_type_id` INTEGER NULL,
    `document_number` VARCHAR(60) NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `client_contacts_client_id_idx`(`client_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_addresses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `client_id` INTEGER NOT NULL,
    `kind` ENUM('FISCAL', 'MAILING', 'OTHER') NOT NULL DEFAULT 'FISCAL',
    `label` VARCHAR(80) NULL,
    `street` VARCHAR(180) NULL,
    `city` VARCHAR(80) NULL,
    `state` VARCHAR(10) NULL,
    `zip` VARCHAR(15) NULL,
    `same_as_fiscal` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `client_addresses_client_id_idx`(`client_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contractors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kind` ENUM('PERSON', 'COMPANY') NOT NULL,
    `full_name` VARCHAR(180) NOT NULL,
    `document_type_id` INTEGER NULL,
    `document_number` VARCHAR(60) NULL,
    `normalized_document` VARCHAR(60) NULL,
    `email` VARCHAR(255) NULL,
    `phone` VARCHAR(40) NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `contractors_normalized_document_key`(`normalized_document`),
    INDEX `contractors_kind_idx`(`kind`),
    INDEX `contractors_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contractor_addresses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `contractor_id` INTEGER NOT NULL,
    `street` VARCHAR(180) NULL,
    `city` VARCHAR(80) NULL,
    `state` VARCHAR(10) NULL,
    `zip` VARCHAR(15) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `contractor_addresses_contractor_id_idx`(`contractor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_contractors` (
    `client_id` INTEGER NOT NULL,
    `contractor_id` INTEGER NOT NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `client_contractors_contractor_id_idx`(`contractor_id`),
    PRIMARY KEY (`client_id`, `contractor_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `client_contacts` ADD CONSTRAINT `client_contacts_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_contacts` ADD CONSTRAINT `client_contacts_document_type_id_fkey` FOREIGN KEY (`document_type_id`) REFERENCES `document_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_addresses` ADD CONSTRAINT `client_addresses_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contractors` ADD CONSTRAINT `contractors_document_type_id_fkey` FOREIGN KEY (`document_type_id`) REFERENCES `document_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contractor_addresses` ADD CONSTRAINT `contractor_addresses_contractor_id_fkey` FOREIGN KEY (`contractor_id`) REFERENCES `contractors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_contractors` ADD CONSTRAINT `client_contractors_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_contractors` ADD CONSTRAINT `client_contractors_contractor_id_fkey` FOREIGN KEY (`contractor_id`) REFERENCES `contractors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
