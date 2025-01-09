import { pgTable, text, serial, integer, timestamp, decimal, json ,varchar} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const horses = pgTable("horses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  odds: text("odds").notNull(), 
  raceId: integer("race_id").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const races = pgTable("races", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  venue: text("venue").notNull(),
  startTime: timestamp("start_time").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bettingStrategies = pgTable("betting_strategies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  config: json("config").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  raceId: integer("race_id").notNull(),
  selections: json("selections").notNull(),
  totalStake: decimal("total_stake").notNull(),
  potential_return: decimal("potential_return").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const oddsHistory = pgTable('odds_history', {
  id: serial('id').primaryKey(),
  horseId: integer('horse_id').references(() => horses.id),
  odds: varchar('odds', { length: 10 }).notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});

export type Horse = typeof horses.$inferSelect;
export type Race = typeof races.$inferSelect;
export type BettingStrategy = typeof bettingStrategies.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;