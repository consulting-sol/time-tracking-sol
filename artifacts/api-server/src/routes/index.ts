import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clientsRouter from "./clients";
import projectsRouter from "./projects";
import timeEntriesRouter from "./timeEntries";
import usersRouter from "./users";
import analyticsRouter from "./analytics";
import syncRouter from "./sync";

const router: IRouter = Router();

router.use(healthRouter);
router.use(syncRouter);
router.use(clientsRouter);
router.use(projectsRouter);
router.use(timeEntriesRouter);
router.use(usersRouter);
router.use(analyticsRouter);

export default router;
