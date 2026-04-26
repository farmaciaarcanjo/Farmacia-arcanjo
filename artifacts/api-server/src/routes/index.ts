import { Router, type IRouter } from "express";
import healthRouter from "./health";
import laraRouter from "./lara";
import instagramRouter from "./instagram";
import pushRouter from "./push";

const router: IRouter = Router();

router.use(healthRouter);
router.use(laraRouter);
router.use(instagramRouter);
router.use("/push", pushRouter);

export default router;
