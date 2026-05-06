import { pgTable, serial, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const salonsTable = pgTable("salons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
});

export const insertSalonSchema = createInsertSchema(salonsTable).omit({ id: true });
export type InsertSalon = z.infer<typeof insertSalonSchema>;
export type Salon = typeof salonsTable.$inferSelect;
