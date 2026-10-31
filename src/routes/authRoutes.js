
import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
    registerUser,
    verifyEmail,
    resendVerification,
    loginUser,
    refreshAccessToken,
    logoutUser,
    getMe,
    forgotPassword,
    resetPassword,
} from "../controllers/authController.js";

import {
    updateProfile,
    changePassword,
} from "../controllers/profileController.js";

import { protect } from "../middlewares/authMiddleware.js";

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

router.post(
    "/refresh-token",
    authLimiter,
    refreshAccessToken
);

router.post("/logout", authLimiter, logoutUser);

router.get("/me", protect, getMe);




const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 50,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many attempts. Try again later.",
    },
});

router.post(
    "/forgot-password",
    passwordResetLimiter,
    forgotPassword
);

router.post(
    "/reset-password",
    passwordResetLimiter,
    resetPassword
);



router.patch("/profile", protect, updateProfile);

router.patch(
    "/change-password",
    authLimiter,
    protect,
    changePassword
);


export default router;
