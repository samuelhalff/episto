#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const exceptionPath = path.join(__dirname, "file-size-exceptions.json");
const excludedPrefixes = [
  "backend/dist/",
  "shared/dist/",
  "frontend/.next/",
  "coverage/",
];

function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/");
}

export function getFileSizeLimit(filePath) {
  const normalizedPath = normalizePath(filePath);

  if (/\.(test|spec)\.tsx?$/.test(normalizedPath)) {
    return 700;
  }

  if (normalizedPath.endsWith(".md")) {
    return 600;
  }

  if (/\.(ts|tsx)$/.test(normalizedPath)) {
    return 500;
  }

  return null;
}

export function isTmpPath(filePath) {
  return path.posix.basename(normalizePath(filePath)).startsWith("tmp-");
}

function shouldCheckPath(filePath) {
  const normalizedPath = normalizePath(filePath);
  return !excludedPrefixes.some((prefix) => normalizedPath.startsWith(prefix));
}

function loadExceptions() {
  return JSON.parse(fs.readFileSync(exceptionPath, "utf8"));
}

export function resolveSizeViolation(filePath, lineCount, exceptions) {
  const normalizedPath = normalizePath(filePath);
  const lineLimit = getFileSizeLimit(normalizedPath);

  if (lineLimit === null || !shouldCheckPath(normalizedPath)) {
    return null;
  }

  const exceptionLimit = exceptions[normalizedPath];
  if (typeof exceptionLimit === "number") {
    if (lineCount > exceptionLimit) {
      return `${normalizedPath} is ${lineCount} lines and exceeds grandfathered limit ${exceptionLimit}.`;
    }

    return null;
  }

  if (lineCount > lineLimit) {
    return `${normalizedPath} is ${lineCount} lines and exceeds ${lineLimit} lines.`;
  }

  return null;
}

function getCandidateFiles(stagedOnly) {
  const args = stagedOnly
    ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR"]
    : ["ls-files"];

  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean)
    .map(normalizePath);
}

function getLineCount(filePath) {
  return fs.readFileSync(path.join(repoRoot, filePath), "utf8").split(/\r?\n/).length;
}

function collectViolations({ stagedOnly }) {
  const exceptions = loadExceptions();
  const violations = [];

  for (const filePath of getCandidateFiles(stagedOnly)) {
    if (!fs.existsSync(path.join(repoRoot, filePath))) {
      continue;
    }

    if (stagedOnly && isTmpPath(filePath)) {
      violations.push(`tmp-* files are not allowed in staged changes: ${filePath}`);
      continue;
    }

    const violation = resolveSizeViolation(filePath, getLineCount(filePath), exceptions);
    if (violation) {
      violations.push(violation);
    }
  }

  return violations;
}

function run() {
  const stagedOnly = globalThis.process.argv.includes("--staged");
  const violations = collectViolations({ stagedOnly });

  if (violations.length > 0) {
    globalThis.console.error("File size guard failed:");
    for (const violation of violations) {
      globalThis.console.error(`- ${violation}`);
    }
    globalThis.process.exit(1);
  }

  globalThis.console.log("File size guard passed.");
}

if (import.meta.url === `file://${globalThis.process.argv[1]}`) {
  run();
}
