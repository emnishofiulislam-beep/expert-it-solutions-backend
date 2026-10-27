
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { registerUser } from "../controllers/authController.js";

const router = Router();

const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many attempts. Try again later.",
    },
});

router.post("/register", registerLimiter, registerUser);

export default router;
