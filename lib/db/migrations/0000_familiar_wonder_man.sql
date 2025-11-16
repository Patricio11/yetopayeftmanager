CREATE TABLE "eft_bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" text NOT NULL,
	"eft_banks_id" uuid,
	"account_number" text NOT NULL,
	"account_holder_name" text NOT NULL,
	"account_name" text,
	"account_type" text DEFAULT 'cheque',
	"branch_code" text,
	"branch_name" text,
	"bank_code" text,
	"is_primary" boolean DEFAULT false,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eft_banks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_name" text NOT NULL,
	"code" text NOT NULL,
	"color" text,
	"branch_code" text,
	"enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "eft_banks_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "eft_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" text NOT NULL,
	"banks_enabled" jsonb DEFAULT '[]'::jsonb,
	"default_expiry_hours" integer DEFAULT 24,
	"single_use_tokens" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "eft_settings_merchant_id_unique" UNIQUE("merchant_id")
);
--> statement-breakpoint
CREATE TABLE "eft_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"reference" text NOT NULL,
	"eft_bank_id" uuid,
	"notify_url" text,
	"success_url" text,
	"failure_url" text,
	"cancelled_url" text,
	"aborted_url" text,
	"description" text,
	"status" text DEFAULT 'not_started',
	"customer_email" text,
	"customer_name" text,
	"tc_accepted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"token" text,
	CONSTRAINT "eft_transactions_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "payment_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"transaction_id" uuid NOT NULL,
	"merchant_id" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"is_revoked" boolean DEFAULT false,
	"ip_address" text,
	"user_agent" text,
	"access_count" integer DEFAULT 0,
	"last_accessed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"full_name" text,
	"phone" text,
	"role" text DEFAULT 'merchant',
	"company_name" text,
	"company_logo_url" text,
	"address" jsonb DEFAULT '{}'::jsonb,
	"bank_account" jsonb DEFAULT '{}'::jsonb,
	"kyc_status" text DEFAULT 'pending',
	"is_active" boolean DEFAULT true,
	"last_login" timestamp,
	"balance" numeric(10, 2) DEFAULT '0',
	"withdrawable_balance" numeric(10, 2) DEFAULT '0',
	"api_secret_key" text,
	"mfa_enabled" boolean DEFAULT false,
	"mfa_secret" text,
	"failed_login_attempts" numeric DEFAULT '0',
	"locked_until" timestamp,
	"last_password_change" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"notification_preferences" jsonb DEFAULT '{}'::jsonb,
	"avatar_url" text,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" text NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"key_prefix" text NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"last_used_at" timestamp,
	"usage_count" jsonb DEFAULT '{"total":0,"today":0}'::jsonb,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	"revoked_by" text,
	CONSTRAINT "api_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "merchant_team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"invited_by" text,
	"invited_at" timestamp DEFAULT now(),
	"accepted_at" timestamp,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" text NOT NULL,
	"url" text NOT NULL,
	"events" jsonb DEFAULT '[]'::jsonb,
	"secret" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"retry_policy" jsonb DEFAULT '{"maxRetries":3,"backoffMultiplier":2}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_config_id" uuid,
	"transaction_id" uuid,
	"event" text NOT NULL,
	"payload" jsonb,
	"response" jsonb,
	"status_code" jsonb,
	"success" boolean,
	"error_message" text,
	"attempt_number" jsonb DEFAULT '1'::jsonb,
	"next_retry_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"delivered_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"resource_id" text,
	"changes" jsonb,
	"ip_address" text,
	"user_agent" text,
	"method" text,
	"endpoint" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"is_read" jsonb DEFAULT 'false'::jsonb,
	"read_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"category" text NOT NULL,
	"severity" text NOT NULL,
	"details" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"service_name" text NOT NULL,
	"is_enabled" jsonb DEFAULT 'false'::jsonb,
	"configuration" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eft_bank_accounts" ADD CONSTRAINT "eft_bank_accounts_merchant_id_user_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eft_bank_accounts" ADD CONSTRAINT "eft_bank_accounts_eft_banks_id_eft_banks_id_fk" FOREIGN KEY ("eft_banks_id") REFERENCES "public"."eft_banks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eft_settings" ADD CONSTRAINT "eft_settings_merchant_id_user_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eft_transactions" ADD CONSTRAINT "eft_transactions_merchant_id_user_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eft_transactions" ADD CONSTRAINT "eft_transactions_eft_bank_id_eft_banks_id_fk" FOREIGN KEY ("eft_bank_id") REFERENCES "public"."eft_banks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_tokens" ADD CONSTRAINT "payment_tokens_transaction_id_eft_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."eft_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_tokens" ADD CONSTRAINT "payment_tokens_merchant_id_user_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_merchant_id_user_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_revoked_by_user_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_team_members" ADD CONSTRAINT "merchant_team_members_merchant_id_user_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_team_members" ADD CONSTRAINT "merchant_team_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_team_members" ADD CONSTRAINT "merchant_team_members_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_configurations" ADD CONSTRAINT "webhook_configurations_merchant_id_user_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_config_id_webhook_configurations_id_fk" FOREIGN KEY ("webhook_config_id") REFERENCES "public"."webhook_configurations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_services" ADD CONSTRAINT "user_services_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "eft_bank_account_merchant_idx" ON "eft_bank_accounts" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "eft_transaction_merchant_idx" ON "eft_transactions" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "eft_transaction_status_idx" ON "eft_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "eft_transaction_reference_idx" ON "eft_transactions" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "payment_token_hash_idx" ON "payment_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "payment_token_transaction_idx" ON "payment_tokens" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "payment_token_expires_idx" ON "payment_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "api_key_merchant_idx" ON "api_keys" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "api_key_key_idx" ON "api_keys" USING btree ("key");--> statement-breakpoint
CREATE INDEX "team_member_merchant_idx" ON "merchant_team_members" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "team_member_user_idx" ON "merchant_team_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "webhook_config_merchant_idx" ON "webhook_configurations" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "webhook_delivery_config_idx" ON "webhook_deliveries" USING btree ("webhook_config_id");--> statement-breakpoint
CREATE INDEX "webhook_delivery_transaction_idx" ON "webhook_deliveries" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "audit_log_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_log_resource_idx" ON "audit_logs" USING btree ("resource");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notification_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "system_log_user_idx" ON "system_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "system_log_category_idx" ON "system_logs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "system_log_severity_idx" ON "system_logs" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "system_log_created_idx" ON "system_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_service_user_idx" ON "user_services" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_service_name_idx" ON "user_services" USING btree ("service_name");