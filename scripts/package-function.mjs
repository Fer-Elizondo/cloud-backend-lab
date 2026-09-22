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

archive.directory(distDir, "dist");

const packageJson = JSON.parse(
  fs.readFileSync(path.join(functionDir, "package.json"), "utf8")
);

delete packageJson.scripts?.build;

archive.append(JSON.stringify(packageJson, null, 2), {
  name: "package.json",
});

await archive.finalize();