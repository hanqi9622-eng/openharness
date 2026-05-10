#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const entryPoint = pathToFileURL(join(__dirname, "..", "dist", "cli", "index.js")).href;

import(entryPoint);
