
import crypto from "node:crypto";

const COOKIE_NAME = "refreshToken";

const getRefreshDays = () => {
    const days = Number(
        process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7
    );

    if (!Number.isInteger(days) || days < 1 || days > 30) {
        throw new Error("Invalid refresh token expiry");
    }

    return days;
};

export const generateRefreshToken = () => {
    return crypto.randomBytes(48).toString("hex");
};

export const hashRefreshToken = (token) => {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
};

export const getRefreshExpiry = () => {
    return new Date(
        Date.now() + getRefreshDays() * 24 * 60 * 60 * 1000
    );
};

const cookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/v1/auth",
});

export const setRefreshCookie = (res, token) => {
    res.cookie(COOKIE_NAME, token, {
        ...cookieOptions(),
        maxAge: getRefreshDays() * 24 * 60 * 60 * 1000,
    });
};

export const clearRefreshCookie = (res) => {
    res.clearCookie(COOKIE_NAME, cookieOptions());
};
