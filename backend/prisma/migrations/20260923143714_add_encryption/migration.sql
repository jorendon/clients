-- AlterTable
ALTER TABLE `parties` MODIFY `document_number` VARCHAR(255) NULL,
    MODIFY `normalized_document` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `party_contacts` MODIFY `document_number` VARCHAR(255) NULL;
