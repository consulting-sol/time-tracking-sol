import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import clientsRouter from "./clients";
import projectsRouter from "./projects";
import timeEntriesRouter from "./timeEntries";
import usersRouter from "./users";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(clientsRouter);
router.use(projectsRouter);
router.use(timeEntriesRouter);
router.use(usersRouter);
router.use(analyticsRouter);

export default router;
