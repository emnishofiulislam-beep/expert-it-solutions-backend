
import User from "../models/User.js";
import { registerSchema } from "../validators/authValidator.js";
import {
    generateVerificationToken,
    hashVerificationToken,
} from "../utils/verificationToken.js";
import { sendVerificationEmail } from "../services/emailService.js";


import { loginSchema } from "../validators/authValidator.js";
import { generateAccessToken } from "../utils/generateToken.js";


import RefreshToken from "../models/RefreshToken.js";

import {
    generateRefreshToken,
    hashRefreshToken,
    getRefreshExpiry,
    setRefreshCookie,
    clearRefreshCookie,
} from "../utils/refreshToken.js";




import {
    forgotPasswordSchema,
    resetPasswordSchema,
} from "../validators/authValidator.js";

import {
    generatePasswordResetToken,
    hashPasswordResetToken,
} from "../utils/passwordResetToken.js";

import {
    sendPasswordResetEmail,
} from "../services/emailService.js";




export const registerUser = async (req, res, next) => {
    try {
        const result = registerSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const { fullName, email, phone, password } = result.data;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered",
            });
        }

        const { token, tokenHash, expires } =
            generateVerificationToken();

        const user = await User.create({
            fullName,
            email,
            phone,
            password,
            verificationTokenHash: tokenHash,
            verificationTokenExpires: expires,
        });

        try {
            await sendVerificationEmail(email, token);
        } catch (mailError) {
            console.error("Verification email failed:", mailError);
            return res.status(503).json({
                success: false,
                message:
                    "Account created, but email delivery failed. Please request a new verification link.",
            });
        }

        return res.status(201).json({
            success: true,
            message: "Registration successful. Check your email.",
            data: { user: user.toJSON() },
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Email already registered",
            });
        }
        next(error);
    }
};

export const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.body;

        if (typeof token !== "string" ||
            !/^[a-f0-9]{64}$/.test(token)) {
            return res.status(400).json({
                success: false,
                message: "Invalid verification token",
            });
        }

        const tokenHash = hashVerificationToken(token);

        const user = await User.findOne({
            verificationTokenHash: tokenHash,
            verificationTokenExpires: { $gt: new Date() },
            isVerified: false,
        }).select(
            "+verificationTokenHash +verificationTokenExpires"
        );

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired verification link",
            });
        }

        const updatedUser = await User.findOneAndUpdate(
            {
                _id: user._id,
                verificationTokenHash: tokenHash,
                verificationTokenExpires: { $gt: new Date() },
                isVerified: false,
            },
            {
                $set: { isVerified: true },
                $unset: {
                    verificationTokenHash: "",
                    verificationTokenExpires: "",
                },
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(400).json({
                success: false,
                message: "Verification link already used or expired",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Email verified successfully",
        });
    } catch (error) {
        next(error);
    }
};

export const resendVerification = async (req, res, next) => {
    try {
        const email = req.body?.email;

        if (typeof email !== "string" ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            email.length > 254) {
            return res.status(400).json({
                success: false,
                message: "Valid email is required",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({
            email: normalizedEmail,
            isVerified: false,
        });

        const genericMessage =
            "If an unverified account exists, a verification email will be sent.";

        if (!user) {
            return res.status(200).json({
                success: true,
                message: genericMessage,
            });
        }

        const { token, tokenHash, expires } =
            generateVerificationToken();

        await User.updateOne(
            { _id: user._id, isVerified: false },
            {
                $set: {
                    verificationTokenHash: tokenHash,
                    verificationTokenExpires: expires,
                },
            }
        );

        try {
            await sendVerificationEmail(normalizedEmail, token);
        } catch (mailError) {
            console.error("Resend email failed:", mailError);
            return res.status(503).json({
                success: false,
                message: "Email service unavailable. Try again later.",
            });
        }

        return res.status(200).json({
            success: true,
            message: genericMessage,
        });
    } catch (error) {
        next(error);
    }
};




export const loginUser = async (req, res, next) => {
    try {
        const result = loginSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const { email, password } = result.data;

        const user = await User.findOne({ email }).select(
            "+password"
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const isPasswordValid =
            await user.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                code: "EMAIL_NOT_VERIFIED",
                message: "Please verify your email before login",
            });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken();

        await RefreshToken.create({
            user: user._id,
            tokenHash: hashRefreshToken(refreshToken),
            expiresAt: getRefreshExpiry(),
        });

        setRefreshCookie(res, refreshToken);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user: user.toJSON(),
                accessToken,
                tokenType: "Bearer",
                expiresIn: 900,
            },
        });
    } catch (error) {
        next(error);
    }
};




// REFRESH ACCESS TOKEN
export const refreshAccessToken = async (
    req,
    res,
    next
) => {
    try {
        const oldToken = req.cookies?.refreshToken;

        if (
            typeof oldToken !== "string" ||
            !/^[a-f0-9]{96}$/.test(oldToken)
        ) {
            return res.status(401).json({
                success: false,
                message: "Refresh token required",
            });
        }

        const newToken = generateRefreshToken();
        const newExpiry = getRefreshExpiry();

        // Atomically rotate the refresh token.
        const session = await RefreshToken.findOneAndUpdate(
            {
                tokenHash: hashRefreshToken(oldToken),
                expiresAt: { $gt: new Date() },
            },
            {
                $set: {
                    tokenHash: hashRefreshToken(newToken),
                    expiresAt: newExpiry,
                },
            },
            { new: true }
        );

        if (!session) {
            clearRefreshCookie(res);

            return res.status(401).json({
                success: false,
                message: "Invalid or expired refresh token",
            });
        }

        const user = await User.findById(session.user);

        if (!user || !user.isVerified) {
            await RefreshToken.deleteOne({
                _id: session._id,
            });

            clearRefreshCookie(res);

            return res.status(401).json({
                success: false,
                message: "Account unavailable",
            });
        }

        const accessToken = generateAccessToken(user);

        setRefreshCookie(res, newToken);

        return res.status(200).json({
            success: true,
            message: "Token refreshed successfully",
            data: {
                accessToken,
                tokenType: "Bearer",
                expiresIn: 900,
            },
        });
    } catch (error) {
        next(error);
    }
};

// LOGOUT CURRENT SESSION
export const logoutUser = async (req, res, next) => {
    try {
        const token = req.cookies?.refreshToken;

        if (
            typeof token === "string" &&
            /^[a-f0-9]{96}$/.test(token)
        ) {
            await RefreshToken.deleteOne({
                tokenHash: hashRefreshToken(token),
            });
        }

        clearRefreshCookie(res);

        return res.status(200).json({
            success: true,
            message: "Logout successful",
        });
    } catch (error) {
        next(error);
    }
};

// GET CURRENT USER PROFILE
export const getMe = async (req, res, next) => {
    try {
        return res.status(200).json({
            success: true,
            data: {
                user: req.user.toJSON(),
            },
        });
    } catch (error) {
        next(error);
    }
};











export const forgotPassword = async (req, res, next) => {
    try {
        const result = forgotPasswordSchema.safeParse(
            req.body
        );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Valid email is required",
            });
        }

        const { email } = result.data;

        const genericMessage =
            "If an account exists, a password reset email will be sent.";

        const user = await User.findOne({ email });

        if (user) {
            const { token, tokenHash, expires } =
                generatePasswordResetToken();

            await User.updateOne(
                { _id: user._id },
                {
                    $set: {
                        resetPasswordTokenHash: tokenHash,
                        resetPasswordExpires: expires,
                    },
                }
            );

            try {
                await sendPasswordResetEmail(email, token);
            } catch (mailError) {
                console.error(
                    "Password reset email failed:",
                    mailError
                );
            }
        }

        return res.status(200).json({
            success: true,
            message: genericMessage,
        });
    } catch (error) {
        next(error);
    }
};








export const resetPassword = async (req, res, next) => {
    try {
        const result = resetPasswordSchema.safeParse(
            req.body
        );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const { token, password } = result.data;

        const tokenHash = hashPasswordResetToken(token);

        const user = await User.findOne({
            resetPasswordTokenHash: tokenHash,
            resetPasswordExpires: { $gt: new Date() },
        }).select(
            "+resetPasswordTokenHash +resetPasswordExpires"
        );

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset token",
            });
        }

        // Atomically consume the reset token.
        const consumed = await User.findOneAndUpdate(
            {
                _id: user._id,
                resetPasswordTokenHash: tokenHash,
                resetPasswordExpires: { $gt: new Date() },
            },
            {
                $unset: {
                    resetPasswordTokenHash: "",
                    resetPasswordExpires: "",
                },
            },
            { new: true }
        );

        if (!consumed) {
            return res.status(400).json({
                success: false,
                message: "Reset token already used or expired",
            });
        }

        // Save triggers the bcrypt password hashing hook.
        consumed.password = password;
        consumed.passwordChangedAt = new Date();

        await consumed.save();

        // Revoke all existing refresh sessions.
        await RefreshToken.deleteMany({
            user: consumed._id,
        });

        clearRefreshCookie(res);

        return res.status(200).json({
            success: true,
            message:
                "Password reset successful. Please login again.",
        });
    } catch (error) {
        next(error);
    }
};




