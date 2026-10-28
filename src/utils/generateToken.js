
import jwt from "jsonwebtoken";

export const generateAccessToken = (user) => {
    if (!process.env.JWT_ACCESS_SECRET) {
        throw new Error("JWT_ACCESS_SECRET is missing");
    }

    return jwt.sign(
        {
            sub: user._id.toString(),
        },
        process.env.JWT_ACCESS_SECRET,
        {
            expiresIn: "15m",
            algorithm: "HS256",
        }
    );
};
