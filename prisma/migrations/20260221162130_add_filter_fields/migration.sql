-- AlterTable
ALTER TABLE "AdjustmentCampaign" ADD COLUMN     "filterType" TEXT NOT NULL DEFAULT 'collection',
ADD COLUMN     "filterValue" TEXT;
