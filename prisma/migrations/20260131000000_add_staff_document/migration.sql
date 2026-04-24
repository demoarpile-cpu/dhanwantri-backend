-- CreateTable
CREATE TABLE `staff_document` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clinicId` INTEGER NOT NULL,
    `staffId` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `data` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StaffDocument_clinicId_fkey`(`clinicId`),
    INDEX `StaffDocument_staffId_fkey`(`staffId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `staff_document` ADD CONSTRAINT `StaffDocument_clinicId_fkey` FOREIGN KEY (`clinicId`) REFERENCES `clinic`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_document` ADD CONSTRAINT `StaffDocument_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `clinicstaff`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
