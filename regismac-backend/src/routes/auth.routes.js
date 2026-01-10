import { Router } from "express";
import { googleAuth, googleCallback, logout, getCurrentUser } from "../controllers/auth.controller.js";

const router = Router();

router.get("/google", googleAuth);
router.get("/google/callback", googleCallback);
router.post("/logout", logout);
router.get("/me", getCurrentUser);

export default router;

