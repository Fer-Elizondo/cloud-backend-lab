import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { findUserByEmail } from "./auth.repository.js";
import { authConfig } from "./auth.config.js";

export async function validateUser(
  email: string,
  password: string
) {
  const user = await findUserByEmail(email);

  if (!user) {
    return null;
  }

  const passwordValid = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!passwordValid) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

export function generateToken(userId: string) {
  return jwt.sign(
    {
      sub: userId,
    },
    authConfig.jwtSecret,
    {
      expiresIn: "1h",
    }
  );
}