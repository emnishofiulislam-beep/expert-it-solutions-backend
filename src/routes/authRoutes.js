
import { Router } from "express";
import rateLimit from "express-rate-limit";


import {
    registerUser,
    verifyEmail,
    resendVerification,
    loginUser,
} from "../controllers/authController.js";


const router = Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many attempts. Try again later.",
    },
});

const resendLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 3,
    standardHeaders: "draft-8",
    legacyHeaders: false,
});

router.post("/register", authLimiter, registerUser);
router.post("/verify-email", authLimiter, verifyEmail);
router.post(
    "/resend-verification",
    resendLimiter,
    resendVerification
);

router.post("/login", authLimiter, loginUser);

export default router;
