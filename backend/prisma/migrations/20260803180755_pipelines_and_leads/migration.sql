-- CreateEnum
CREATE TYPE "PipelineKind" AS ENUM ('SALES', 'LEADS');

-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "convertedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "pipelines" ADD COLUMN     "kind" "PipelineKind" NOT NULL DEFAULT 'SALES',
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;
