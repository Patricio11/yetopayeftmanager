CREATE TABLE "email_broadcast_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"broadcast_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "email_broadcasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" text NOT NULL,
	"content" text NOT NULL,
	"recipient_type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_recipients" integer DEFAULT 0,
	"sent_count" integer DEFAULT 0,
	"failed_count" integer DEFAULT 0,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp,
	"last_resent_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "merchant_disabled_banks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" text NOT NULL,
	"bank_id" uuid NOT NULL,
	"disabled_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement_banks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_name" text NOT NULL,
	"code" text NOT NULL,
	"color" text,
	"branch_code" text,
	"enabled" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settlement_banks_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "payment_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"provider" text NOT NULL,
	"provider_config" jsonb DEFAULT '{}'::jsonb,
	"icon" text,
	"is_active" boolean DEFAULT false,
	"requires_setup" boolean DEFAULT false,
	"display_order" integer DEFAULT 0,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_services_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "eft_merchant_fees" DROP CONSTRAINT "eft_merchant_fees_merchant_id_unique";--> statement-breakpoint
ALTER TABLE "eft_bank_accounts" ADD COLUMN "settlement_bank_id" uuid;--> statement-breakpoint
ALTER TABLE "eft_transactions" ADD COLUMN "payment_method" text DEFAULT 'eft_direct';--> statement-breakpoint
ALTER TABLE "eft_transactions" ADD COLUMN "provider_transaction_id" text;--> statement-breakpoint
ALTER TABLE "eft_transactions" ADD COLUMN "provider_data" jsonb;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "kyc_data" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "kyc_submitted_at" timestamp;--> statement-breakpoint
ALTER TABLE "eft_invoice_items" ADD COLUMN "service_name" text;--> statement-breakpoint
ALTER TABLE "eft_merchant_fees" ADD COLUMN "service_name" text DEFAULT 'eft_direct';--> statement-breakpoint
ALTER TABLE "eft_system_fees" ADD COLUMN "service_name" text DEFAULT 'eft_direct';--> statement-breakpoint
ALTER TABLE "email_broadcast_recipients" ADD CONSTRAINT "email_broadcast_recipients_broadcast_id_email_broadcasts_id_fk" FOREIGN KEY ("broadcast_id") REFERENCES "public"."email_broadcasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_broadcast_recipients" ADD CONSTRAINT "email_broadcast_recipients_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_broadcasts" ADD CONSTRAINT "email_broadcasts_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_disabled_banks" ADD CONSTRAINT "merchant_disabled_banks_merchant_id_user_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_disabled_banks" ADD CONSTRAINT "merchant_disabled_banks_bank_id_eft_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."eft_banks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_broadcast_recipients_broadcast_idx" ON "email_broadcast_recipients" USING btree ("broadcast_id");--> statement-breakpoint
CREATE INDEX "email_broadcasts_created_at_idx" ON "email_broadcasts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "email_broadcasts_status_idx" ON "email_broadcasts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "merchant_disabled_banks_merchant_idx" ON "merchant_disabled_banks" USING btree ("merchant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_disabled_banks_unique_idx" ON "merchant_disabled_banks" USING btree ("merchant_id","bank_id");--> statement-breakpoint
CREATE INDEX "payment_services_code_idx" ON "payment_services" USING btree ("code");--> statement-breakpoint
CREATE INDEX "payment_services_category_idx" ON "payment_services" USING btree ("category");--> statement-breakpoint
CREATE INDEX "payment_services_active_idx" ON "payment_services" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "eft_bank_accounts" ADD CONSTRAINT "eft_bank_accounts_settlement_bank_id_settlement_banks_id_fk" FOREIGN KEY ("settlement_bank_id") REFERENCES "public"."settlement_banks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "eft_merchant_fees_merchant_service_uniq" ON "eft_merchant_fees" USING btree ("merchant_id","service_name");--> statement-breakpoint
CREATE UNIQUE INDEX "eft_system_fees_service_uniq" ON "eft_system_fees" USING btree ("service_name");