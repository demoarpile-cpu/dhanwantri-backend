-- CreateTable
CREATE TABLE `subscription_invoice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clinicId` INTEGER NOT NULL,
    `invoiceNumber` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Unpaid',
    `issuedDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dueDate` DATETIME(3) NOT NULL,
    `paidDate` DATETIME(3) NULL,
    `description` VARCHAR(191) NULL,

    UNIQUE INDEX `subscription_invoice_invoiceNumber_key`(`invoiceNumber`),
    INDEX `subscription_invoice_clinicId_idx`(`clinicId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `subscription_invoice` ADD CONSTRAINT `subscription_invoice_clinicId_fkey` FOREIGN KEY (`clinicId`) REFERENCES `clinic`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
