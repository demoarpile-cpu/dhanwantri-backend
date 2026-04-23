/*
  Warnings:

  - A unique constraint covering the columns `[referenceId]` on the table `appointment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `appointment` ADD COLUMN `referenceId` VARCHAR(191) NULL,
    MODIFY `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `clinic` ADD COLUMN `bookingConfig` LONGTEXT NULL,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `subscriptionEnd` DATETIME(3) NULL,
    ADD COLUMN `subscriptionPlan` VARCHAR(191) NOT NULL DEFAULT 'Monthly',
    ADD COLUMN `subscriptionStart` DATETIME(3) NULL,
    MODIFY `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `clinicstaff` MODIFY `role` ENUM('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST', 'PHARMACY', 'LAB', 'RADIOLOGY', 'ACCOUNTANT', 'PATIENT') NOT NULL DEFAULT 'RECEPTIONIST';

-- AlterTable
ALTER TABLE `department` MODIFY `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `formtemplate` MODIFY `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `invoice` MODIFY `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `medicalrecord` MODIFY `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `patient` MODIFY `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `user` ADD COLUMN `phone` VARCHAR(191) NULL,
    MODIFY `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `role` ENUM('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST', 'PHARMACY', 'LAB', 'RADIOLOGY', 'ACCOUNTANT', 'PATIENT') NOT NULL DEFAULT 'RECEPTIONIST';

-- CreateTable
CREATE TABLE `formresponse` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clinicId` INTEGER NOT NULL,
    `formId` INTEGER NOT NULL,
    `patientId` INTEGER NOT NULL,
    `doctorId` INTEGER NOT NULL,
    `answers` LONGTEXT NOT NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `formresponse_clinicId_idx`(`clinicId`),
    INDEX `formresponse_formId_idx`(`formId`),
    INDEX `formresponse_patientId_idx`(`patientId`),
    INDEX `formresponse_doctorId_idx`(`doctorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clinicId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `unitPrice` DECIMAL(10, 2) NOT NULL,
    `expiryDate` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inventory_clinicId_idx`(`clinicId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_order` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clinicId` INTEGER NOT NULL,
    `patientId` INTEGER NOT NULL,
    `doctorId` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `testName` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `result` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `service_order_clinicId_idx`(`clinicId`),
    INDEX `service_order_patientId_idx`(`patientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Appointment_referenceId_key` ON `appointment`(`referenceId`);

-- AddForeignKey
ALTER TABLE `formresponse` ADD CONSTRAINT `formresponse_clinicId_fkey` FOREIGN KEY (`clinicId`) REFERENCES `clinic`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `formresponse` ADD CONSTRAINT `formresponse_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `formtemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `formresponse` ADD CONSTRAINT `formresponse_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_clinicId_fkey` FOREIGN KEY (`clinicId`) REFERENCES `clinic`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_order` ADD CONSTRAINT `service_order_clinicId_fkey` FOREIGN KEY (`clinicId`) REFERENCES `clinic`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_order` ADD CONSTRAINT `service_order_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
