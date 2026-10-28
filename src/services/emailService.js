
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendVerificationEmail = async (email, token) => {
    const verificationUrl =
        `${process.env.CLIENT_URL}/verify-email?token=${encodeURIComponent(token)}`;

    await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: "Verify Your Email - Expert IT Solutions",
        text: `Welcome to Expert IT Solutions!

Verify your email by visiting:
${verificationUrl}

This link expires in 15 minutes.

If you did not create this account, ignore this email.`,
    });
};




export const sendPasswordResetEmail = async (
    email,
    token
) => {
    const resetUrl =
        `${process.env.CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`;

    await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: "Reset Your Password - Expert IT Solutions",
        text: `Hello,

We received a request to reset your password.

Open this link to set a new password:

${resetUrl}

This link will expire in 15 minutes.

If you did not request a password reset,
you can safely ignore this email.

Expert IT Solutions`,
    });
};

