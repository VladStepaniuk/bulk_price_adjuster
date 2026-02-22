-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdjustmentCampaign" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT,
    "collectionId" TEXT,
    "collectionTitle" TEXT,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "strategy" TEXT NOT NULL,
    "rounding" TEXT NOT NULL DEFAULT 'NONE',
    "status" TEXT NOT NULL DEFAULT 'completed',
    "scheduledAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "revertedAt" TIMESTAMP(3),
    "revertCampaignId" INTEGER,
    "compareAtPrice" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AdjustmentCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdjustmentLog" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "variantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL DEFAULT '',
    "productTitle" TEXT NOT NULL,
    "variantTitle" TEXT NOT NULL,
    "oldPrice" DOUBLE PRECISION NOT NULL,
    "newPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AdjustmentLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AdjustmentLog" ADD CONSTRAINT "AdjustmentLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdjustmentCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
