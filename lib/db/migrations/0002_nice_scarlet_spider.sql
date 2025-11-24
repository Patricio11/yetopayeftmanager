CREATE TABLE "customer_bank_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"bank_id" uuid,
	"bank_code" varchar(50) NOT NULL,
	"account_number" varchar(50),
	"account_type" varchar(50),
	"account_name" varchar(255),
	"device_fingerprint" varchar(64) NOT NULL,
	"device_info" jsonb,
	"ip_address" varchar(45),
	"last_used_at" timestamp,
	"usage_count" integer DEFAULT 0,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokenization_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_id" uuid,
	"merchant_id" text NOT NULL,
	"action" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"device_fingerprint" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_bank_tokens" ADD CONSTRAINT "customer_bank_tokens_merchant_id_user_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_bank_tokens" ADD CONSTRAINT "customer_bank_tokens_bank_id_eft_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."eft_banks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokenization_audit_log" ADD CONSTRAINT "tokenization_audit_log_token_id_customer_bank_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."customer_bank_tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_tokens_merchant_idx" ON "customer_bank_tokens" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "customer_tokens_bank_code_idx" ON "customer_bank_tokens" USING btree ("bank_code");--> statement-breakpoint
CREATE INDEX "customer_tokens_device_fingerprint_idx" ON "customer_bank_tokens" USING btree ("device_fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_tokens_unique_idx" ON "customer_bank_tokens" USING btree ("merchant_id","bank_code","device_fingerprint");--> statement-breakpoint
CREATE INDEX "tokenization_audit_token_idx" ON "tokenization_audit_log" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "tokenization_audit_merchant_idx" ON "tokenization_audit_log" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "tokenization_audit_action_idx" ON "tokenization_audit_log" USING btree ("action");