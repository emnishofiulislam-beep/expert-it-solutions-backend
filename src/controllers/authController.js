
import User from "../models/User.js";
import { registerSchema } from "../validators/authValidator.js";
import {
    generateVerificationToken,
    hashVerificationToken,
} from "../utils/verificationToken.js";
import { sendVerificationEmail } from "../services/emailService.js";


import { loginSchema } from "../validators/authValidator.js";
import { generateAccessToken } from "../utils/generateToken.js";


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
        // Step 1: Validate input
        const result = loginSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const { email, password } = result.data;

        // Step 2: Find user with password
        const user = await User.findOne({ email }).select(
            "+password"
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // Step 3: Compare hashed password
        const isPasswordValid = await user.comparePassword(
            password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // Step 4: Check email verification
        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                code: "EMAIL_NOT_VERIFIED",
                message: "Please verify your email before login",
            });
        }

        // Step 5: Generate access token
        const accessToken = generateAccessToken(user);

        // Step 6: Send response
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

