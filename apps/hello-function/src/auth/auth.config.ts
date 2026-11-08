import { parseAuthConfig } from "../config/environment.js";

const { JWT_SECRET: jwtSecret } = parseAuthConfig();

export const authConfig = {
  jwtSecret,
};
