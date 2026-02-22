-- AlterTable
ALTER TABLE "AdjustmentCampaign" ADD COLUMN     "linkedCampaignId" INTEGER,
ADD COLUMN     "revertAt" TIMESTAMP(3);
