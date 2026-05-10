#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, extname } from "node:path";

const changedFile = process.argv[2] || "";

const needBackend = /\.(java|xml)$/.test(changedFile) || changedFile.endsWith("pom.xml");
const needFrontend = /\.(ts|tsx|vue)$/.test(changedFile) || changedFile.endsWith("package.json");
const needMigration = /\.(sql)$/.test(changedFile) || changedFile.includes("db/migration/");

if (!needBackend && !needFrontend && !needMigration) {
  process.exit(0);
}

const projectRoot = resolve(process.cwd());
let checksPassed = true;

if (needBackend && existsSync(resolve(projectRoot, "backend"))) {
  const backendDir = resolve(projectRoot, "backend");
  try {
    execSync("mvn compile -q -DskipTests", { cwd: backendDir, stdio: "pipe", timeout: 120000 });
    console.log("✅ Backend compile passed");
    try {
      execSync("mvn test -q", { cwd: backendDir, stdio: "pipe", timeout: 300000 });
      console.log("✅ Backend unit tests passed");
    } catch {
      console.log("⚠️  Backend unit tests failed (non-blocking)");
    }
  } catch {
    console.log("❌ Backend compile failed");
    checksPassed = false;
  }
}

if (needFrontend && existsSync(resolve(projectRoot, "frontend"))) {
  const frontendDir = resolve(projectRoot, "frontend");
  try {
    execSync("npx vue-tsc --noEmit", { cwd: frontendDir, stdio: "pipe", timeout: 120000 });
    console.log("✅ Frontend type check passed");
  } catch {
    console.log("❌ Frontend type check failed");
    checksPassed = false;
  }
}

if (needMigration && existsSync(resolve(projectRoot, "backend"))) {
  const backendDir = resolve(projectRoot, "backend");
  try {
    execSync("mvn flyway:validate -q", { cwd: backendDir, stdio: "pipe", timeout: 60000 });
    console.log("✅ Flyway validation passed");
  } catch {
    console.log("⚠️  Flyway validation failed (non-blocking)");
  }
}

if (checksPassed) {
  console.log("✅ All auto-checks passed after write");
} else {
  console.log("❌ Some auto-checks failed after write");
}

process.exit(0);
