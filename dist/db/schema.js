import { pgTable, text, serial, integer, timestamp, decimal, json, varchar, numeric, bigint, boolean, index } from "drizzle-orm/pg-core";
export var horses = pgTable("horses", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    raceId: bigint("race_id", { mode: "number" }).notNull(),
    frame: integer("frame").notNull(),
    number: integer("number").notNull(),
    status: text("status").notNull().default("running"),
    createdAt: timestamp("created_at").defaultNow(),
});
export var races = pgTable("races", {
    id: bigint("id", { mode: "number" }).primaryKey(),
    name: text("name").notNull(),
    venue: text("venue").notNull(),
    startTime: timestamp("start_time").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
});
export var bettingStrategies = pgTable("betting_strategies", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    config: json("config").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
});
export var tickets = pgTable("tickets", {
    id: serial("id").primaryKey(),
    raceId: bigint("race_id", { mode: "number" }).notNull(),
    betType: varchar('bet_type', { length: 20 }).notNull(),
    selections: json("selections").notNull(),
    totalStake: decimal("total_stake").notNull(),
    potentialReturn: decimal("potential_return").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
});
export var tanOddsHistory = pgTable("tan_odds_history", {
    id: serial("id").primaryKey(),
    horseId: bigint("horse_id", { mode: "number" }).notNull(),
    odds: numeric("odds").notNull(),
    timestamp: timestamp("timestamp").notNull(),
    raceId: bigint("race_id", { mode: "number" }).notNull()
}, function (table) { return ({
    horseIdx: index("tan_odds_history_horse_id_idx").on(table.horseId),
    timestampIdx: index("tan_odds_history_timestamp_idx").on(table.timestamp),
    raceIdx: index("tan_odds_history_race_id_idx").on(table.raceId)
}); });
export var fukuOdds = pgTable("fuku_odds", {
    id: serial("id").primaryKey(),
    horseId: bigint("horse_id", { mode: "number" }).notNull(),
    oddsMin: numeric("odds_min").notNull(),
    oddsMax: numeric("odds_max").notNull(),
    timestamp: timestamp("timestamp").notNull(),
    raceId: bigint("race_id", { mode: "number" }).notNull()
}, function (table) { return ({
    horseIdx: index("fuku_odds_horse_id_idx").on(table.horseId),
    raceIdx: index("fuku_odds_race_id_idx").on(table.raceId)
}); });
export var wakurenOdds = pgTable("wakuren_odds", {
    id: serial("id").primaryKey(),
    frame1: integer("frame1").notNull(),
    frame2: integer("frame2").notNull(),
    odds: numeric("odds").notNull(),
    timestamp: timestamp("timestamp").notNull(),
    raceId: bigint("race_id", { mode: "number" }).notNull()
}, function (table) { return ({
    raceIdx: index("wakuren_odds_race_id_idx").on(table.raceId),
    framesIdx: index("wakuren_odds_frames_idx").on(table.frame1, table.frame2)
}); });
export var umarenOdds = pgTable("umaren_odds", {
    id: serial("id").primaryKey(),
    horse1: integer("horse1").notNull(),
    horse2: integer("horse2").notNull(),
    odds: numeric("odds").notNull(),
    timestamp: timestamp("timestamp").notNull(),
    raceId: bigint("race_id", { mode: "number" }).notNull()
}, function (table) { return ({
    raceIdx: index("umaren_odds_race_id_idx").on(table.raceId),
    horsesIdx: index("umaren_odds_horses_idx").on(table.horse1, table.horse2)
}); });
export var betTypes = pgTable('bet_types', {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 20 }).notNull().unique(),
    name: varchar('name', { length: 50 }).notNull(),
    description: text('description'),
    requiredHorses: integer('required_horses').notNull(),
    orderMatters: boolean('order_matters').notNull(),
});
export var wideOdds = pgTable("wide_odds", {
    id: serial("id").primaryKey(),
    horse1: integer("horse1").notNull(),
    horse2: integer("horse2").notNull(),
    oddsMin: numeric("odds_min").notNull(),
    oddsMax: numeric("odds_max").notNull(),
    timestamp: timestamp("timestamp").notNull(),
    raceId: bigint("race_id", { mode: "number" }).notNull()
}, function (table) { return ({
    raceIdx: index("wide_odds_race_id_idx").on(table.raceId),
    horsesIdx: index("wide_odds_horses_idx").on(table.horse1, table.horse2)
}); });
export var umatanOdds = pgTable("umatan_odds", {
    id: serial("id").primaryKey(),
    horse1: integer("horse1").notNull(),
    horse2: integer("horse2").notNull(),
    odds: numeric("odds").notNull(),
    timestamp: timestamp("timestamp").notNull(),
    raceId: bigint("race_id", { mode: "number" }).notNull()
}, function (table) { return ({
    raceIdx: index("umatan_odds_race_id_idx").on(table.raceId),
    horsesIdx: index("umatan_odds_horses_idx").on(table.horse1, table.horse2)
}); });
export var fuku3Odds = pgTable("fuku3_odds", {
    id: serial("id").primaryKey(),
    horse1: integer("horse1").notNull(),
    horse2: integer("horse2").notNull(),
    horse3: integer("horse3").notNull(),
    odds: numeric("odds").notNull(),
    timestamp: timestamp("timestamp").notNull(),
    raceId: bigint("race_id", { mode: "number" }).notNull()
}, function (table) { return ({
    raceIdx: index("fuku3_odds_race_id_idx").on(table.raceId),
    horsesIdx: index("fuku3_odds_horses_idx").on(table.horse1, table.horse2, table.horse3)
}); });
export var tan3Odds = pgTable("tan3_odds", {
    id: serial("id").primaryKey(),
    horse1: integer("horse1").notNull(),
    horse2: integer("horse2").notNull(),
    horse3: integer("horse3").notNull(),
    odds: numeric("odds").notNull(),
    timestamp: timestamp("timestamp").notNull(),
    raceId: bigint("race_id", { mode: "number" }).notNull()
}, function (table) { return ({
    raceIdx: index("tan3_odds_race_id_idx").on(table.raceId),
    horsesIdx: index("tan3_odds_horses_idx").on(table.horse1, table.horse2, table.horse3)
}); });
