-- HermesChat 额度 / 计费 / 购买申请
-- 与 Prisma + JPA 共表对齐：状态/模式统一用 TEXT，避免双 ORM 枚举冲突

CREATE TABLE IF NOT EXISTS "billing_config" (
  "id" TEXT PRIMARY KEY DEFAULT 'default',
  "mode" TEXT NOT NULL DEFAULT 'TRIAL_THEN_PAID',
  "trial_days" INTEGER NOT NULL DEFAULT 7,
  "trial_credits" INTEGER NOT NULL DEFAULT 100,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "billing_config" ("id", "mode", "trial_days", "trial_credits", "updated_at")
VALUES ('default', 'TRIAL_THEN_PAID', 7, 100, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "free_access" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "billing_mode" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trial_start_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trial_end_at" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "credit_purchase_requests" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "note" TEXT,
  "contact" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "admin_id" TEXT,
  "admin_note" TEXT,
  "granted_amount" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMP(3)
);

-- 强制 TEXT，兼容 JPA @Enumerated(STRING) 与 Prisma
ALTER TABLE "credit_purchase_requests" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
ALTER TABLE "billing_config" ALTER COLUMN "mode" TYPE TEXT USING "mode"::text;
ALTER TABLE "users" ALTER COLUMN "billing_mode" TYPE TEXT USING "billing_mode"::text;

CREATE INDEX IF NOT EXISTS "credit_purchase_requests_user_id_created_at_idx"
  ON "credit_purchase_requests" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "credit_purchase_requests_status_idx"
  ON "credit_purchase_requests" ("status");
