#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = join(__dirname, "..", "dist", "cli", "index.js");

try {
  await import(pathToFileURL(cliPath).href);
} catch (error) {
  if (error.code === "ERR_MODULE_NOT_FOUND" || error.code === "ENOENT") {
    console.error(
      "Error: OpenHarness CLI files not found.\n" +
      "The 'dist/' directory is missing — the package may not have been built before publishing.\n" +
      "\n" +
      "If you installed from source, run:\n" +
      "  cd node_modules/@openharness/core && npm run build\n" +
      "\n" +
      "If you installed from npm, please report this issue:\n" +
      "  https://github.com/openharness/openharness/issues"
    );
    process.exit(1);
  }
  throw error;
}
