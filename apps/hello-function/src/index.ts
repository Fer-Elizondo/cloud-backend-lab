import { http } from "@google-cloud/functions-framework";

http("hello", (_req, res) => {
  res.status(200).json({
    message: "Hello from Cloud Backend Lab",
  });
});