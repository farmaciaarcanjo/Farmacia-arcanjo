import { Router, type IRouter } from "express";
import healthRouter from "./health";
import laraRouter from "./lara";
import instagramRouter from "./instagram";

const router: IRouter = Router();

router.use(healthRouter);
router.use(laraRouter);
router.use(instagramRouter);

export default router;
