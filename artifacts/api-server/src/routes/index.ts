import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import salonRouter from "./salon";
import usersRouter from "./users";
import servicesRouter from "./services";
import appointmentsRouter from "./appointments";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(salonRouter);
router.use(usersRouter);
router.use(servicesRouter);
router.use(appointmentsRouter);
router.use(dashboardRouter);

export default router;
