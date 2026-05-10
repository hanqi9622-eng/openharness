import fs from "node:fs";
import path from "node:path";
import type { CrossServiceImpact, ProjectAnalysis, ServiceModule, WorkspaceMode } from "../types/index.js";

const SERVICE_INDICATORS: Record<string, { language: string; framework: string }> = {
  "pom.xml": { language: "java", framework: "spring-boot" },
  "build.gradle": { language: "java", framework: "spring-boot" },
  "build.gradle.kts": { language: "java", framework: "spring-boot" },
  "package.json": { language: "javascript", framework: "node" },
  "go.mod": { language: "go", framework: "go" },
  "Cargo.toml": { language: "rust", framework: "rust" },
  "requirements.txt": { language: "python", framework: "python" },
  "pyproject.toml": { language: "python", framework: "python" },
  "Gemfile": { language: "ruby", framework: "ruby" },
  "*.csproj": { language: "csharp", framework: "dotnet" },
};

export function detectProjectStructure(projectRoot: string): ProjectAnalysis {
  const services = detectServices(projectRoot);
  const languages = [...new Set(services.map((s) => s.language).filter(Boolean))] as string[];
  const frameworks = [...new Set(services.map((s) => s.framework).filter(Boolean))] as string[];
  const buildTools = detectBuildTools(projectRoot, services);
  const packageManager = detectPackageManager(projectRoot);
  const mode = determineMode(projectRoot, services);

  return {
    mode,
    services,
    languages,
    frameworks,
    buildTools,
    packageManager,
  };
}

function detectServices(projectRoot: string): ServiceModule[] {
  const services: ServiceModule[] = [];
  const entries = fs.readdirSync(projectRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dirPath = path.join(projectRoot, entry.name);

    if (isSkippedDirectory(entry.name)) continue;

    const serviceInfo = detectServiceInDir(dirPath);
    if (serviceInfo) {
      services.push({
        name: entry.name,
        path: entry.name,
        language: serviceInfo.language,
        framework: serviceInfo.framework,
      });
    }
  }

  const rootInfo = detectServiceInDir(projectRoot);
  if (rootInfo && services.length === 0) {
    services.push({
      name: path.basename(projectRoot),
      path: ".",
      language: rootInfo.language,
      framework: rootInfo.framework,
    });
  }

  return services;
}

function detectServiceInDir(dirPath: string): { language: string; framework: string } | null {
  for (const [filename, info] of Object.entries(SERVICE_INDICATORS)) {
    const filePath = path.join(dirPath, filename);
    if (fs.existsSync(filePath)) {
      if (filename === "package.json") {
        return detectNodeFramework(filePath, info);
      }
      if (filename === "pom.xml") {
        return detectSpringFromPom(filePath, info);
      }
      return info;
    }
  }

  const csprojFiles = fs.readdirSync(dirPath).filter((f) => f.endsWith(".csproj"));
  if (csprojFiles.length > 0) {
    return SERVICE_INDICATORS["*.csproj"];
  }

  return null;
}

function detectNodeFramework(
  packageJsonPath: string,
  defaultInfo: { language: string; framework: string }
): { language: string; framework: string } {
  try {
    const content = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const deps = { ...content.dependencies, ...content.devDependencies };

    if (deps["next"]) return { language: "typescript", framework: "next.js" };
    if (deps["nuxt"]) return { language: "typescript", framework: "nuxt" };
    if (deps["@nestjs/core"]) return { language: "typescript", framework: "nestjs" };
    if (deps["express"]) return { language: "javascript", framework: "express" };
    if (deps["react"]) return { language: "typescript", framework: "react" };
    if (deps["vue"]) return { language: "typescript", framework: "vue" };
    if (content.type === "module" || deps["typescript"]) {
      return { language: "typescript", framework: "node" };
    }
    return defaultInfo;
  } catch {
    return defaultInfo;
  }
}

function detectSpringFromPom(
  pomPath: string,
  defaultInfo: { language: string; framework: string }
): { language: string; framework: string } {
  try {
    const content = fs.readFileSync(pomPath, "utf-8");
    if (content.includes("spring-boot")) return { language: "java", framework: "spring-boot" };
    if (content.includes("spring-cloud")) return { language: "java", framework: "spring-cloud" };
    return defaultInfo;
  } catch {
    return defaultInfo;
  }
}

function isSkippedDirectory(name: string): boolean {
  const alwaysSkipped = [
    "node_modules",
    ".git",
    ".idea",
    ".vscode",
    "dist",
    "build",
    "target",
    ".next",
    ".nuxt",
    "coverage",
    "__pycache__",
    ".gradle",
    ".mvn",
    "scripts",
    "infra",
    "deploy",
    "k8s",
    "terraform",
    "helm",
    ".github",
    ".claude",
    ".cursor",
    ".trae",
    ".codex",
    ".openharness",
    "openspec",
    "harness",
    "hooks",
    "docs",
    "standards",
    "examples",
    "test",
    "tests",
    "__tests__",
    ".circleci",
    ".mvn",
    ".idea",
    "logs",
    "tmp",
    "temp",
  ];
  if (alwaysSkipped.includes(name)) return true;
  if (name.startsWith(".")) return true;
  return false;
}

function detectBuildTools(projectRoot: string, services: ServiceModule[]): string[] {
  const tools = new Set<string>();

  for (const service of services) {
    const servicePath = path.join(projectRoot, service.path);
    if (fs.existsSync(path.join(servicePath, "pom.xml"))) tools.add("maven");
    if (
      fs.existsSync(path.join(servicePath, "build.gradle")) ||
      fs.existsSync(path.join(servicePath, "build.gradle.kts"))
    )
      tools.add("gradle");
    if (fs.existsSync(path.join(servicePath, "package.json"))) tools.add("npm");
    if (fs.existsSync(path.join(servicePath, "go.mod"))) tools.add("go");
    if (fs.existsSync(path.join(servicePath, "Cargo.toml"))) tools.add("cargo");
    if (fs.existsSync(path.join(servicePath, "Makefile"))) tools.add("make");
  }

  return Array.from(tools);
}

function detectPackageManager(projectRoot: string): string {
  if (fs.existsSync(path.join(projectRoot, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(projectRoot, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(projectRoot, "package-lock.json"))) return "npm";
  if (fs.existsSync(path.join(projectRoot, "go.sum"))) return "go";
  return "unknown";
}

function determineMode(projectRoot: string, services: ServiceModule[]): WorkspaceMode {
  if (services.length <= 1) return "single";

  if (fs.existsSync(path.join(projectRoot, "pnpm-workspace.yaml"))) return "monorepo";
  if (fs.existsSync(path.join(projectRoot, "lerna.json"))) return "monorepo";
  if (fs.existsSync(path.join(projectRoot, "nx.json"))) return "monorepo";
  if (fs.existsSync(path.join(projectRoot, "turbo.json"))) return "monorepo";

  const languages = [...new Set(services.map((s) => s.language).filter(Boolean))];
  if (languages.length > 1) return "microservices";

  const frameworks = [...new Set(services.map((s) => s.framework).filter(Boolean))];
  if (frameworks.length > 1) return "microservices";

  return "monorepo";
}

export function detectCrossServiceDependencies(
  projectRoot: string,
  services: ServiceModule[]
): CrossServiceImpact[] {
  const deps: CrossServiceImpact[] = [];

  for (const service of services) {
    const servicePath = path.join(projectRoot, service.path);
    const sharedLibsPath = path.join(projectRoot, "shared-libs");
    const sharedPath = path.join(projectRoot, "shared");

    if (fs.existsSync(sharedLibsPath) || fs.existsSync(sharedPath)) {
      deps.push({
        sourceService: service.name,
        targetServices: ["shared-libs"],
        impactType: "shared-lib",
        description: `${service.name} depends on shared libraries`,
        severity: "warning",
      });
    }

    if (service.language === "java") {
      deps.push(...detectJavaCrossDeps(servicePath, service.name, services));
    }

    if (service.language === "typescript" || service.language === "javascript") {
      deps.push(...detectNodeCrossDeps(servicePath, service.name, services));
    }
  }

  return deps;
}

function detectJavaCrossDeps(
  servicePath: string,
  serviceName: string,
  allServices: ServiceModule[]
): CrossServiceImpact[] {
  const deps: CrossServiceImpact[] = [];
  const pomPath = path.join(servicePath, "pom.xml");

  if (!fs.existsSync(pomPath)) return deps;

  try {
    const content = fs.readFileSync(pomPath, "utf-8");
    const targets: string[] = [];
    for (const other of allServices) {
      if (other.name === serviceName) continue;
      const artifactId = other.name.replace(/-/g, "-");
      const groupId = other.name.replace(/-/g, ".");
      if (content.includes(`<artifactId>${artifactId}</artifactId>`) || content.includes(`<groupId>${groupId}</groupId>`)) {
        targets.push(other.name);
      }
    }
    if (targets.length > 0) {
      deps.push({
        sourceService: serviceName,
        targetServices: targets,
        impactType: "api-contract",
        description: `${serviceName} references ${targets.join(", ")} in pom.xml`,
        severity: "blocking",
      });
    }
  } catch {
    return deps;
  }

  return deps;
}

function detectNodeCrossDeps(
  servicePath: string,
  serviceName: string,
  allServices: ServiceModule[]
): CrossServiceImpact[] {
  const deps: CrossServiceImpact[] = [];
  const pkgPath = path.join(servicePath, "package.json");

  if (!fs.existsSync(pkgPath)) return deps;

  try {
    const content = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const allDeps = { ...content.dependencies, ...content.devDependencies };
    const targets: string[] = [];
    const serviceNames = new Set(allServices.filter((s) => s.name !== serviceName).map((s) => s.name));

    for (const depName of Object.keys(allDeps)) {
      if (serviceNames.has(depName) || depName.startsWith("@") && serviceNames.has(depName.split("/").pop() ?? "")) {
        targets.push(depName);
      }
    }
    if (targets.length > 0) {
      deps.push({
        sourceService: serviceName,
        targetServices: targets,
        impactType: "shared-lib",
        description: `${serviceName} depends on ${targets.join(", ")}`,
        severity: "warning",
      });
    }
  } catch {
    return deps;
  }

  return deps;
}
