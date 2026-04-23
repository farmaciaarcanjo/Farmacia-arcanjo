import { Router, type IRouter } from "express";
import healthRouter from "./health";
import laraRouter from "./lara";

const router: IRouter = Router();

router.use(healthRouter);
router.use(laraRouter);

export default router;
