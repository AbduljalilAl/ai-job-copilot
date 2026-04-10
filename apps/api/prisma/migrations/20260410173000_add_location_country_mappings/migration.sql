-- CreateTable
CREATE TABLE "LocationCountryMapping" (
    "id" SERIAL NOT NULL,
    "normalizedLocation" TEXT NOT NULL,
    "originalLocation" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationCountryMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LocationCountryMapping_normalizedLocation_key" ON "LocationCountryMapping"("normalizedLocation");

-- CreateIndex
CREATE INDEX "LocationCountryMapping_country_idx" ON "LocationCountryMapping"("country");
