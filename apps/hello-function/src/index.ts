import { http } from "@google-cloud/functions-framework";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";


const client = new SecretManagerServiceClient();

http("hello", async (_req, res) => {
  try {
    const projectId = process.env.GCP_PROJECT_ID;

    if (!projectId) {
      throw new Error("GCP_PROJECT_ID environment variable is not configured");
    }

    const [version] = await client.accessSecretVersion({
      name: `projects/${projectId}/secrets/app-message/versions/latest`,
    });

    const message = version.payload?.data?.toString() ?? "Secret not found";

    res.status(200).json({
      message,
    });
  } catch (error) {
    console.error("Error accessing Secret Manager:", error);

    res.status(500).json({
      message: "Error accessing secret",
    });
  }
});