CREATE TABLE IF NOT EXISTS "eft_invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_amount" numeric(12, 4) NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"transaction_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eft_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" text NOT NULL,
	"merchant_id" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"subtotal_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"vat_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"transaction_count" integer DEFAULT 0,
	"transaction_volume" numeric(14, 2) DEFAULT '0',
	"fee_type" text NOT NULL,
	"fee_value" numeric(10, 4) NOT NULL,
	"vat_rate" numeric(5, 2) DEFAULT '15.00',
	"vat_enabled" boolean DEFAULT true,
	"status" text DEFAULT 'draft' NOT NULL,
	"due_date" timestamp,
	"paid_at" timestamp,
	"sent_at" timestamp,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "eft_invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eft_merchant_fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" text NOT NULL,
	"fee_type" text DEFAULT 'fixed' NOT NULL,
	"fixed_fee_value" numeric(10, 4),
	"percentage_fee_value" numeric(10, 4),
	"volume_fee_value" numeric(10, 4),
	"vat_enabled" boolean,
	"vat_rate" numeric(5, 2),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "eft_merchant_fees_merchant_id_unique" UNIQUE("merchant_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eft_system_fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fixed_fee_value" numeric(10, 4) DEFAULT '5.00' NOT NULL,
	"percentage_fee_value" numeric(10, 4) DEFAULT '2.50' NOT NULL,
	"volume_fee_value" numeric(10, 4) DEFAULT '0.0500' NOT NULL,
	"vat_enabled" boolean DEFAULT true,
	"vat_rate" numeric(5, 2) DEFAULT '15.00',
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ALTER COLUMN "status_code" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ALTER COLUMN "attempt_number" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ALTER COLUMN "attempt_number" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "is_read" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "user_services" ALTER COLUMN "is_enabled" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "eft_transactions" ADD COLUMN IF NOT EXISTS "status_reason" text;--> statement-breakpoint
ALTER TABLE "eft_transactions" ADD COLUMN IF NOT EXISTS "updated_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "eft_settings" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "secret_hash" text;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "eft_invoice_items" ADD CONSTRAINT "eft_invoice_items_invoice_id_eft_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."eft_invoices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "eft_invoice_items" ADD CONSTRAINT "eft_invoice_items_transaction_id_eft_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."eft_transactions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "eft_invoices" ADD CONSTRAINT "eft_invoices_merchant_id_user_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "eft_invoices" ADD CONSTRAINT "eft_invoices_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "eft_merchant_fees" ADD CONSTRAINT "eft_merchant_fees_merchant_id_user_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "eft_system_fees" ADD CONSTRAINT "eft_system_fees_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "eft_invoice_items_invoice_idx" ON "eft_invoice_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "eft_invoices_merchant_idx" ON "eft_invoices" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "eft_invoices_status_idx" ON "eft_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "eft_invoices_period_idx" ON "eft_invoices" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "eft_invoices_number_idx" ON "eft_invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "eft_merchant_fees_merchant_idx" ON "eft_merchant_fees" USING btree ("merchant_id");--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "eft_transactions" ADD CONSTRAINT "eft_transactions_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;