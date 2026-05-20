CREATE TABLE "eft_partner_fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" text NOT NULL,
	"commission_mode" text DEFAULT 'handle_outside' NOT NULL,
	"fee_type" text DEFAULT 'fixed',
	"fixed_fee_value" numeric(10, 4),
	"percentage_fee_value" numeric(10, 4),
	"volume_fee_value" numeric(10, 4),
	"vat_enabled" boolean,
	"vat_rate" numeric(5, 2),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	CONSTRAINT "eft_partner_fees_partner_id_unique" UNIQUE("partner_id")
);
--> statement-breakpoint
CREATE TABLE "eft_partner_invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_amount" numeric(12, 4) NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"merchant_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eft_partner_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" text NOT NULL,
	"partner_id" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"subtotal_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"vat_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"transaction_count" integer DEFAULT 0,
	"transaction_volume" numeric(14, 2) DEFAULT '0',
	"merchant_count" integer DEFAULT 0,
	"fee_type" text NOT NULL,
	"fee_value" numeric(10, 4) NOT NULL,
	"vat_rate" numeric(5, 2) DEFAULT '15.00',
	"vat_enabled" boolean DEFAULT true,
	"status" text DEFAULT 'draft' NOT NULL,
	"due_date" timestamp,
	"paid_at" timestamp,
	"sent_at" timestamp,
	"notes" text,
	"merchant_breakdown" jsonb DEFAULT '[]'::jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "eft_partner_invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"setting_key" varchar(100) NOT NULL,
	"setting_value" text,
	"updated_at" timestamp DEFAULT now(),
	"updated_by" varchar(255),
	CONSTRAINT "platform_settings_setting_key_unique" UNIQUE("setting_key")
);
--> statement-breakpoint
CREATE TABLE "company_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"requirement_id" text,
	"original_name" text NOT NULL,
	"stored_name" text,
	"url" text NOT NULL,
	"mime_type" text,
	"size_bytes" integer,
	"notes" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_requirements" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"applies_to" text DEFAULT 'both' NOT NULL,
	"template_url" text,
	"template_original_name" text,
	"template_mime_type" text,
	"template_size_bytes" integer,
	"required" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eft_system_fees" ALTER COLUMN "volume_fee_value" SET DEFAULT '2.00';--> statement-breakpoint
ALTER TABLE "eft_banks" ADD COLUMN "eft_service_url" text;--> statement-breakpoint
ALTER TABLE "eft_transactions" ADD COLUMN "failure_reason" text;--> statement-breakpoint
ALTER TABLE "eft_transactions" ADD COLUMN "customer_account" text;--> statement-breakpoint
ALTER TABLE "eft_transactions" ADD COLUMN "customer_account_type" text;--> statement-breakpoint
ALTER TABLE "eft_transactions" ADD COLUMN "customer_bank" text;--> statement-breakpoint
ALTER TABLE "eft_transactions" ADD COLUMN "customer_branch_code" text;--> statement-breakpoint
ALTER TABLE "eft_transactions" ADD COLUMN "device_fingerprint" text;--> statement-breakpoint
ALTER TABLE "eft_transactions" ADD COLUMN "is_demo" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "partner_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "vetting_status" text DEFAULT 'APPROVED';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "vetting_rejection_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "vetting_admin_note" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "vetting_reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "vetting_reviewed_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "company_reg" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "company_address" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "company_country" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "vat_number" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "account_mode" text DEFAULT 'demo';--> statement-breakpoint
ALTER TABLE "eft_partner_fees" ADD CONSTRAINT "eft_partner_fees_partner_id_user_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eft_partner_invoice_items" ADD CONSTRAINT "eft_partner_invoice_items_invoice_id_eft_partner_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."eft_partner_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eft_partner_invoice_items" ADD CONSTRAINT "eft_partner_invoice_items_merchant_id_user_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eft_partner_invoices" ADD CONSTRAINT "eft_partner_invoices_partner_id_user_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_documents" ADD CONSTRAINT "company_documents_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_documents" ADD CONSTRAINT "company_documents_requirement_id_onboarding_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."onboarding_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_requirements" ADD CONSTRAINT "onboarding_requirements_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "eft_partner_fees_partner_idx" ON "eft_partner_fees" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "eft_partner_invoice_items_invoice_idx" ON "eft_partner_invoice_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "eft_partner_invoices_partner_idx" ON "eft_partner_invoices" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "eft_partner_invoices_status_idx" ON "eft_partner_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "eft_partner_invoices_period_idx" ON "eft_partner_invoices" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE UNIQUE INDEX "eft_partner_invoices_partner_period_uniq" ON "eft_partner_invoices" USING btree ("partner_id","period_start","period_end");--> statement-breakpoint
CREATE INDEX "company_docs_user_idx" ON "company_documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "company_docs_req_idx" ON "company_documents" USING btree ("requirement_id");--> statement-breakpoint
CREATE INDEX "onboarding_req_sort_idx" ON "onboarding_requirements" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "onboarding_req_active_idx" ON "onboarding_requirements" USING btree ("active");--> statement-breakpoint
CREATE INDEX "onboarding_req_applies_idx" ON "onboarding_requirements" USING btree ("applies_to");--> statement-breakpoint
CREATE UNIQUE INDEX "team_member_merchant_user_uniq" ON "merchant_team_members" USING btree ("merchant_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_config_merchant_url_uniq" ON "webhook_configurations" USING btree ("merchant_id","url");--> statement-breakpoint
CREATE UNIQUE INDEX "user_service_user_service_uniq" ON "user_services" USING btree ("user_id","service_name");--> statement-breakpoint
CREATE UNIQUE INDEX "eft_invoices_merchant_period_uniq" ON "eft_invoices" USING btree ("merchant_id","period_start","period_end");