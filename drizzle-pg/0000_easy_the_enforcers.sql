CREATE TYPE "public"."note_type" AS ENUM('general', 'escalation', 'compliance', 'reminder');--> statement-breakpoint
CREATE TYPE "public"."team_location" AS ENUM('hq', 'remote');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'preparer', 'owner');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_open_id" varchar(64),
	"user_name" varchar(128),
	"action" varchar(64) NOT NULL,
	"resource" varchar(128),
	"details" text,
	"ip_address" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "briefing_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"briefing_date" varchar(10) NOT NULL,
	"action_text" text NOT NULL,
	"section" varchar(64),
	"completed_by" varchar(128),
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canopy_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_hash" varchar(64),
	"csv_content" text NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"source" varchar(32) DEFAULT 'manual' NOT NULL,
	"filename" varchar(255),
	"received_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_name" varchar(255) NOT NULL,
	"is_escalated" boolean DEFAULT false NOT NULL,
	"is_vip" boolean DEFAULT false NOT NULL,
	"extension_filed" boolean DEFAULT false NOT NULL,
	"do_not_contact" boolean DEFAULT false NOT NULL,
	"escalated_at" timestamp,
	"escalated_by" varchar(128),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "client_flags_client_name_unique" UNIQUE("client_name")
);
--> statement-breakpoint
CREATE TABLE "client_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_name" varchar(255) NOT NULL,
	"note" text NOT NULL,
	"note_type" "note_type" DEFAULT 'general' NOT NULL,
	"author_name" varchar(128),
	"author_open_id" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_name" varchar(255) NOT NULL,
	"reminder_text" text NOT NULL,
	"remind_at" timestamp NOT NULL,
	"is_dismissed" boolean DEFAULT false NOT NULL,
	"created_by" varchar(128),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(128) NOT NULL,
	"value" text NOT NULL,
	"label" varchar(255),
	"category" varchar(64) DEFAULT 'general',
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"updatedBy" varchar(64),
	CONSTRAINT "dashboard_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "ip_allowlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" varchar(128) NOT NULL,
	"ip_address" varchar(64) NOT NULL,
	"added_by" varchar(128),
	"added_by_open_id" varchar(64),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpi_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL,
	"total_active" integer DEFAULT 0 NOT NULL,
	"overdue_rate" integer DEFAULT 0 NOT NULL,
	"overdue_count" integer DEFAULT 0 NOT NULL,
	"bottleneck_count" integer DEFAULT 0 NOT NULL,
	"bottleneck_stage" varchar(128),
	"most_behind_overdue_count" integer DEFAULT 0 NOT NULL,
	"most_behind_name" varchar(128),
	"snapshot_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"ip_address" varchar(64),
	"user_agent" text,
	"created_at" bigint NOT NULL,
	"last_active_at" bigint NOT NULL,
	"expires_at" bigint NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"mfa_verified" boolean DEFAULT false NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"role" varchar(64),
	"location" "team_location" DEFAULT 'hq' NOT NULL,
	"capacity" integer DEFAULT 30 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"canopy_name" varchar(128),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"password_hash" varchar(255),
	"reset_token" varchar(128),
	"reset_token_expiry" timestamp,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"password_changed_at" bigint,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" bigint,
	"mfa_secret" varchar(512),
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"mfa_backup_codes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	"last_login_ip" varchar(64),
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE INDEX "password_history_user_created_idx" ON "password_history" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_token_idx" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_active_idx" ON "sessions" USING btree ("user_id","is_revoked","expires_at");
