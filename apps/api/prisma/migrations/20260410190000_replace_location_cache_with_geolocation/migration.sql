-- DropIndex
DROP INDEX IF EXISTS "LocationCountryMapping_country_idx";

-- DropIndex
DROP INDEX IF EXISTS "LocationCountryMapping_normalizedLocation_key";

-- DropTable
DROP TABLE IF EXISTS "LocationCountryMapping";

-- CreateTable
CREATE TABLE "GeoLocation" (
    "id" SERIAL NOT NULL,
    "geonameId" INTEGER,
    "cityName" TEXT NOT NULL,
    "asciiName" TEXT,
    "normalizedCityName" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "normalizedCountryName" TEXT NOT NULL,
    "admin1Code" TEXT,
    "normalizedAdmin1Code" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "population" INTEGER,
    "timezone" TEXT,
    "sourceDataset" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeoLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeoLocation_geonameId_key" ON "GeoLocation"("geonameId");

-- CreateIndex
CREATE INDEX "GeoLocation_normalizedCityName_idx" ON "GeoLocation"("normalizedCityName");

-- CreateIndex
CREATE INDEX "GeoLocation_normalizedCountryName_idx" ON "GeoLocation"("normalizedCountryName");

-- CreateIndex
CREATE INDEX "GeoLocation_countryCode_idx" ON "GeoLocation"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "GeoLocation_normalizedCityName_countryCode_normalizedAdmin1Cod_key" ON "GeoLocation"("normalizedCityName", "countryCode", "normalizedAdmin1Code");
