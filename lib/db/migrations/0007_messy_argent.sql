CREATE TABLE "storage_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(32) NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT false NOT NULL,
	"last_tested_at" timestamp,
	"last_test_ok" boolean,
	"last_test_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "storage_config_provider_unique" UNIQUE("provider")
);
--> statement-breakpoint
ALTER TABLE "eft_banks" ADD COLUMN "currency" text DEFAULT 'ZAR' NOT NULL;--> statement-breakpoint
ALTER TABLE "eft_transactions" ADD COLUMN "currency" text DEFAULT 'ZAR' NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement_banks" ADD COLUMN "full_name" text;