import { pgTable, text, serial, integer, timestamp, decimal, json ,varchar, numeric, bigint, boolean} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const horses = pgTable("horses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  odds: text("odds").notNull(), 
  raceId: bigint("race_id", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const races = pgTable("races", {
  id: bigint("id", { mode: "number" }).primaryKey(),
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
  raceId: bigint("race_id", { mode: "number" }).notNull(),
  betType: varchar('bet_type', { length: 20 }).notNull(),
  selections: json("selections").notNull(),
  totalStake: decimal("total_stake").notNull(),
  potentialReturn: decimal("potential_return").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const oddsHistory = pgTable('odds_history', {
  id: serial('id').primaryKey(),
  horseId: bigint('horse_id', { mode: "number" }).notNull(),
  betType: varchar('bet_type', { length: 20 }).notNull(),
  oddsMin: numeric('odds_min').notNull(),
  oddsMax: numeric('odds_max'),
  timestamp: timestamp('timestamp').notNull()
});

export const betCombinations = pgTable('bet_combinations', {
  id: serial('id').primaryKey(),
  oddsHistoryId: integer('odds_history_id').notNull(),
  horseId: bigint('horse_id', { mode: "number" }).notNull(),
  position: integer('position').notNull(),
});

export const betTypes = pgTable('bet_types', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 50 }).notNull(),
  description: text('description'),
  requiredHorses: integer('required_horses').notNull(),
  orderMatters: boolean('order_matters').notNull(),
});

export type Horse = typeof horses.$inferSelect;
export type Race = typeof races.$inferSelect;
export type BettingStrategy = typeof bettingStrategies.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type OddsHistory = typeof oddsHistory.$inferSelect;