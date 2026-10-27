
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/authRoutes.js";
import { errorHandler } from "./middlewares/errorMiddleware.js";

const app = express();

app.use(helmet());

app.use(
    cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
    })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/api/v1/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Ecommerce API is running",
    });
});

app.use("/api/v1/auth", authRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found",
    });
});

app.use(errorHandler);

export default app;
