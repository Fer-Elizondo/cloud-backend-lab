import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const distDirectory = fileURLToPath(
  new URL("../apps/hello-function/dist/", import.meta.url)
);

rmSync(distDirectory, { recursive: true, force: true });
