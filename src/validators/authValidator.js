
import { z } from "zod";

export const registerSchema = z.object({
    fullName: z.string().trim().min(2).max(100),
    email: z.email().trim().toLowerCase(),
    phone: z.string().trim().min(7).max(20),
    password: z.string().min(8).max(128),
    confirmPassword: z.string(),
    agreeTerms: z.literal(true),
}).strict().refine(
    (data) => data.password === data.confirmPassword,
    {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    }
);


export const loginSchema = z.object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(1, "Password is required"),
}).strict();





export const forgotPasswordSchema = z.object({
    email: z.email().trim().toLowerCase(),
}).strict();

export const resetPasswordSchema = z.object({
    token: z.string().regex(
        /^[a-f0-9]{64}$/,
        "Invalid reset token"
    ),

    password: z.string()
        .min(8, "Password must be at least 8 characters")
        .max(128),

    confirmPassword: z.string(),
}).strict().refine(
    (data) => data.password === data.confirmPassword,
    {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    }
);

