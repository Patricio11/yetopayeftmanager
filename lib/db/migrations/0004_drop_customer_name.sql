-- Drop customer_name column from customer_bank_tokens if it exists
ALTER TABLE "customer_bank_tokens" DROP COLUMN IF EXISTS "customer_name";

-- Drop customer_name column from tokenization_audit_log if it exists
ALTER TABLE "tokenization_audit_log" DROP COLUMN IF EXISTS "customer_name";
