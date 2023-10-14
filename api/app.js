import express from "express";
import path from "path";
import logger from "morgan";
import { fileURLToPath } from "url";
import indexRouter from "./routes/index.js";
import usersRouter from "./routes/users.js";
import authRouter from "./routes/auth.js";
import proPageRouter from "./routes/proPage.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { verifyToken } from "./lib/verifyToken.js";

export const app = express();

// view engine setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(
  cors({
    origin: "http://localhost:5173", // Update with your client's URL
    credentials: true,
  })
);
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/api/users", usersRouter);
app.use("/api/auth", authRouter);
app.use(verifyToken);
app.use("/api/proPage", proPageRouter);

// error handler
app.use(function (err, res, next) {
  const errorStatus = err.status || 500;
  const errorMessage = err.errorMessage || "Something went wrong!";

  return res.status(errorStatus).json({
    success: false,
    status: errorStatus,
    message: errorMessage,
    stack: err.stack,
  });
});
