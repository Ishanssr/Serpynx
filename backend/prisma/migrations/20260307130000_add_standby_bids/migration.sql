-- Add new BidStatus value for standby assignments
ALTER TYPE "BidStatus" ADD VALUE IF NOT EXISTS 'STANDBY';

-- Add optional primary / standby bid references on tasks
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "primaryBidId" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "standbyBidId" TEXT;

