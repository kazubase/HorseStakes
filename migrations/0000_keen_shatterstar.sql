CREATE TABLE IF NOT EXISTS "betting_strategies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"config" json NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "horses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"odds" text NOT NULL,
	"race_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "races" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"venue" text NOT NULL,
	"start_time" timestamp NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"race_id" integer NOT NULL,
	"selections" json NOT NULL,
	"total_stake" numeric NOT NULL,
	"potential_return" numeric NOT NULL,
	"created_at" timestamp DEFAULT now()
);
