import express from "express";
import { handleAgentQuery } from "../controllers/agent.controller.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/query", isAuthenticated, handleAgentQuery);

export default router;
