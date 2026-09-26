import { http } from "@google-cloud/functions-framework";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const client = new SecretManagerServiceClient();

http("hello", async (req, res) => {
  console.log(
    JSON.stringify({
      severity: "INFO",
      event: "request_received",
      method: req.method,
      path: req.path,
    })
  );

  try {
    const projectId = process.env.GCP_PROJECT_ID;

    if (!projectId) {
      throw new Error("GCP_PROJECT_ID environment variable is not configured");
    }

    const [version] = await client.accessSecretVersion({
      name: `projects/${projectId}/secrets/app-message/versions/latest`,
    });

    const message = version.payload?.data?.toString() ?? "Secret not found";

    console.log(
      JSON.stringify({
        severity: "INFO",
        event: "secret_accessed",
        secret: "app-message",
      })
    );

    res.status(200).json({
      message,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        severity: "ERROR",
        event: "secret_access_failed",
        error: error instanceof Error ? error.message : String(error),
      })
    );

    res.status(500).json({
      message: "Error accessing secret",
    });
  }
});