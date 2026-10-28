
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
    try {
        const authorization = req.headers.authorization;

        if (
            !authorization ||
            !authorization.startsWith("Bearer ")
        ) {
            return res.status(401).json({
                success: false,
                message: "Access token required",
            });
        }

        const token = authorization.slice(7);

        const decoded = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET,
            { algorithms: ["HS256"] }
        );

        if (
            typeof decoded.sub !== "string" ||
            !mongoose.isValidObjectId(decoded.sub)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid access token",
            });
        }

        const user = await User.findById(decoded.sub);

        if (!user || !user.isVerified) {
            return res.status(401).json({
                success: false,
                message: "Account unavailable",
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError" ||
            error.name === "NotBeforeError"
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired access token",
            });
        }

        next(error);
    }
};
