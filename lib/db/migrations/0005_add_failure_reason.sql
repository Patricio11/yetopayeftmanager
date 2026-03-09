-- Add failure_reason column to eft_transactions
ALTER TABLE eft_transactions ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Create index for analytics queries on created_at + status
CREATE INDEX IF NOT EXISTS eft_transaction_created_status_idx ON eft_transactions (created_at, status);
