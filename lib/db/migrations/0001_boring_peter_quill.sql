ALTER TABLE "eft_banks" ADD COLUMN "display_order" integer DEFAULT 0;--> statement-breakpoint
CREATE INDEX "eft_banks_display_order_idx" ON "eft_banks" USING btree ("display_order");