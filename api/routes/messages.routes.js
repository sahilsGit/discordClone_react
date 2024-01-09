import {
  fetchMessages,
  sendDirectMessage,
  sendServerMessage,
} from "../controllers/messages.controllers.js";
import { verifyToken } from "../middlewares/auth.middlewares.js";
import express from "express";

const router = express.Router();
router.use(verifyToken);

router.post("/direct", sendDirectMessage);
router.post("/server", sendServerMessage);
router.get("/fetch", fetchMessages);

export default router;
