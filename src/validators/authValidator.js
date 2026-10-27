
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
