import fs from "node:fs";
import path from "node:path";
import { ZipArchive } from "archiver";

const root = process.cwd();

const functionDir = path.join(root, "apps", "hello-function");
const distDir = path.join(functionDir, "dist");
const outputDir = path.join(root, "build");
const outputFile = path.join(outputDir, "hello-function.zip");

if (!fs.existsSync(distDir)) {
  throw new Error(
    "No existe dist/. Ejecuta primero: npm run build:function"
  );
}

fs.mkdirSync(outputDir, { recursive: true });

const output = fs.createWriteStream(outputFile);

const archive = new ZipArchive({
  zlib: { level: 9 },
});

output.on("close", () => {
  console.log(`ZIP creado: ${outputFile}`);
  console.log(`Tamaño: ${archive.pointer()} bytes`);
});

archive.on("warning", (error) => {
  if (error.code === "ENOENT") {
    console.warn(error);
    return;
  }

  throw error;
});

archive.on("error", (error) => {
  throw error;
});

archive.pipe(output);

const packageJson = JSON.parse(
  fs.readFileSync(path.join(functionDir, "package.json"), "utf8")
);

delete packageJson.devDependencies;
packageJson.scripts = {
  start: packageJson.scripts?.start ?? "functions-framework --target=hello",
};

const runtimeFiles = [];

function collectRuntimeFiles(sourceDirectory, archiveDirectory) {
  for (const entry of fs.readdirSync(sourceDirectory, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDirectory, entry.name);
    const archivePath = path.posix.join(archiveDirectory, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== "__tests__") {
        collectRuntimeFiles(sourcePath, archivePath);
      }

      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".js")) {
      continue;
    }

    if (
      entry.name.endsWith(".test.js") ||
      entry.name.endsWith(".spec.js") ||
      entry.name.startsWith("test-") ||
      ["local.server.js", "local-server.js", "test-db.js"].includes(entry.name)
    ) {
      continue;
    }

    runtimeFiles.push({ sourcePath, archivePath });
  }
}

collectRuntimeFiles(distDir, "dist");

if (!runtimeFiles.some(({ archivePath }) => archivePath === "dist/index.js")) {
  throw new Error("El artefacto no contiene dist/index.js");
}

// Cloud Functions buildpacks install production dependencies from this manifest.
for (const { sourcePath, archivePath } of runtimeFiles) {
  archive.file(sourcePath, { name: archivePath });
}

archive.append(JSON.stringify(packageJson, null, 2), {
  name: "package.json",
});

await archive.finalize();
