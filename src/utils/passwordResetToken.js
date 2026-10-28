
import crypto from "node:crypto";

export const generatePasswordResetToken = () => {
    const token = crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    const expires = new Date(
        Date.now() + 15 * 60 * 1000
    );

    return { token, tokenHash, expires };
};

export const hashPasswordResetToken = (token) => {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
};
