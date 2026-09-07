const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { requestLogger } = require("./middlewares/loggerMiddleware");
const { errorHandler } = require("./middlewares/errorMiddleware");
const authRouter = require("./features/auth/auth.router");
const fileRouter = require("./features/files/file.router");

const app = express();
app.disable("x-powered-by");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(requestLogger);

app.use("/api", authRouter);
app.use("/api/files", fileRouter);

// Global Error Handler middleware mounted below all routes
app.use(errorHandler);

module.exports = app;
