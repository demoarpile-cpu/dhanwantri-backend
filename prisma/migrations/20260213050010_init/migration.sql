/*
  Warnings:

  - You are about to drop the column `fees` on the `appointment` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `service_order` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,clinicId]` on the table `clinicstaff` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `ClinicStaff_userId_clinicId_role_key` ON `clinicstaff`;

-- AlterTable
ALTER TABLE `appointment` DROP COLUMN `fees`,
    ADD COLUMN `billingAmount` DECIMAL(10, 2) NULL,
    ADD COLUMN `isPaid` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `queueStatus` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    ADD COLUMN `tokenNumber` INTEGER NULL;

-- AlterTable
ALTER TABLE `clinic` ADD COLUMN `brandingColor` VARCHAR(191) NULL DEFAULT '#2D3BAE',
    ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    ADD COLUMN `lastTokenDate` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `lastTokenNumber` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `userLimit` INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE `clinicstaff` ADD COLUMN `roles` LONGTEXT NULL,
    MODIFY `role` ENUM('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST', 'PHARMACY', 'LAB', 'RADIOLOGY', 'ACCOUNTANT', 'PATIENT', 'DOCUMENT_CONTROLLER') NOT NULL DEFAULT 'RECEPTIONIST';

-- AlterTable
ALTER TABLE `medicalrecord` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'Active';

-- AlterTable
ALTER TABLE `service_order` DROP COLUMN `status`,
    ADD COLUMN `paymentStatus` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    ADD COLUMN `testStatus` VARCHAR(191) NOT NULL DEFAULT 'Pending';

-- AlterTable
ALTER TABLE `staff_document` MODIFY `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `user` MODIFY `role` ENUM('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST', 'PHARMACY', 'LAB', 'RADIOLOGY', 'ACCOUNTANT', 'PATIENT', 'DOCUMENT_CONTROLLER') NOT NULL DEFAULT 'RECEPTIONIST';

-- CreateTable
CREATE TABLE `patient_document` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clinicId` INTEGER NOT NULL,
    `patientId` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'OTHER',
    `name` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `patient_document_clinicId_idx`(`clinicId`),
    INDEX `patient_document_patientId_idx`(`patientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ClinicStaff_userId_idx` ON `clinicstaff`(`userId`);

-- CreateIndex
CREATE UNIQUE INDEX `ClinicStaff_userId_clinicId_key` ON `clinicstaff`(`userId`, `clinicId`);

-- AddForeignKey
ALTER TABLE `patient_document` ADD CONSTRAINT `patient_document_clinicId_fkey` FOREIGN KEY (`clinicId`) REFERENCES `clinic`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `patient_document` ADD CONSTRAINT `patient_document_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RedefineIndex
CREATE INDEX `ClinicStaff_clinicId_idx` ON `clinicstaff`(`clinicId`);
DROP INDEX `ClinicStaff_clinicId_fkey` ON `clinicstaff`;
