import express from "express";
import projectRouter from "./routes/project.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import authRouter from "./auth/auth.routes.js";
import { parseRuntimeConfig } from "./config/environment.js";

// The complete application entry point requires both authentication and database configuration.
parseRuntimeConfig();

const app = express();

app.use(express.json());

app.use("/api/v1/auth", authRouter);
app.use("/api/v1", projectRouter);

app.use(errorHandler);

export { app };
export const hello = app;
