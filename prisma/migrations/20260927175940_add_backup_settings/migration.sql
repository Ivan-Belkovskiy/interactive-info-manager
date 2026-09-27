-- AlterTable
ALTER TABLE "users" ADD COLUMN     "backupEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "backupEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "backupLastSentAt" TIMESTAMP(3);
