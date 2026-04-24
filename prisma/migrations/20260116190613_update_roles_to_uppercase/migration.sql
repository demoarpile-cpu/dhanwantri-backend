/*
  Warnings:

  - You are about to alter the column `role` on the `clinicstaff` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(0))` to `Enum(EnumId(1))`.

*/
-- AlterTable
ALTER TABLE `clinicstaff` MODIFY `role` ENUM('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST', 'PATIENT') NOT NULL DEFAULT 'RECEPTIONIST';

-- AlterTable
ALTER TABLE `user` ADD COLUMN `role` ENUM('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST', 'PATIENT') NOT NULL DEFAULT 'RECEPTIONIST';
