import { pgTable, serial, text, numeric, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { salonsTable } from "./salons";
import { servicesTable } from "./services";
import { usersTable } from "./users";

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

export const appointmentsTable = pgTable("appointments", {
  id: serial("id").primaryKey(),
  clientName: text("client_name").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  status: appointmentStatusEnum("status").notNull().default("CONFIRMED"),
  rating: integer("rating"),
  comment: text("comment"),
  salonId: integer("salon_id").notNull().references(() => salonsTable.id),
  serviceId: integer("service_id").notNull().references(() => servicesTable.id),
  employeeId: integer("employee_id").notNull().references(() => usersTable.id),
});

export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({ id: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointmentsTable.$inferSelect;
