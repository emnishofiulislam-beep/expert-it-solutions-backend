
import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";

import {
    updateProfileSchema,
    changePasswordSchema,
} from "../validators/authValidator.js";

import { clearRefreshCookie } from "../utils/refreshToken.js";

// UPDATE PROFILE
export const updateProfile = async (req, res, next) => {
    try {
        const result = updateProfileSchema.safeParse(
            req.body
        );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: result.data },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: { user: user.toJSON() },
        });
    } catch (error) {
        next(error);
    }
};

// CHANGE PASSWORD
export const changePassword = async (req, res, next) => {
    try {
        const result = changePasswordSchema.safeParse(
            req.body
        );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const {
            currentPassword,
            newPassword,
        } = result.data;

        const user = await User.findById(
            req.user._id
        ).select("+password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const isValid = await user.comparePassword(
            currentPassword
        );

        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: "Current password is incorrect",
            });
        }

        user.password = newPassword;
        user.passwordChangedAt = new Date();

        // User.js pre-save middleware hashes password.
        await user.save();

        // Revoke existing refresh sessions.
        await RefreshToken.deleteMany({
            user: user._id,
        });

        clearRefreshCookie(res);

        return res.status(200).json({
            success: true,
            message:
                "Password changed successfully. Please login again.",
        });
    } catch (error) {
        next(error);
    }
};
