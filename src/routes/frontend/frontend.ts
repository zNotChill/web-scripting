import { Router } from "../../deps.ts";
import { editorRouter } from "./editor.ts";

const router = new Router();

router.use(editorRouter.routes());

export const frontendRouter = router;