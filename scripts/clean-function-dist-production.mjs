import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const productionDistDirectory = fileURLToPath(
  new URL("../apps/hello-function/dist-production/", import.meta.url)
);

rmSync(productionDistDirectory, { recursive: true, force: true });
