
import User from "../models/User.js";
import { registerSchema } from "../validators/authValidator.js";

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

        const user = await User.create({
            fullName,
            email,
            phone,
            password,
        });

        return res.status(201).json({
            success: true,
            message: "Account created. Email verification pending.",
            data: {
                user: user.toJSON(),
            },
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
