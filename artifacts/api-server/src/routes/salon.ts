import { Router, type IRouter } from "express";
import { db, salonsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateSalonBody } from "@workspace/api-zod";
import { requireAuth, requireManager } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/salon", requireAuth, async (req, res): Promise<void> => {
  const [salon] = await db.select().from(salonsTable).where(eq(salonsTable.id, req.user!.salonId));
  if (!salon) {
    res.status(404).json({ error: "Salon not found" });
    return;
  }
  res.json(salon);
});

router.patch("/salon", requireAuth, requireManager, async (req, res): Promise<void> => {
  const parsed = UpdateSalonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [salon] = await db
    .update(salonsTable)
    .set(parsed.data)
    .where(eq(salonsTable.id, req.user!.salonId))
    .returning();

  res.json(salon);
});

export default router;
