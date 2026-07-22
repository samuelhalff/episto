#!/usr/bin/env node
/**
 * Guards against untranslated, hardcoded user-facing strings in the frontend
 * UI. It flags literal JSX text and literal user-facing props (placeholder,
 * aria-label, alt, title) that should go through next-intl (useTranslations)
 * or an allowlisted per-locale module.
 *
 * Heuristic by nature — tune via ci/hardcoded-string-allowlist.json.
 * Usage: node ci/check-hardcoded-strings.mjs [--staged]
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const allowlist = JSON.parse(
  fs.readFileSync(path.join(__dirname, "hardcoded-string-allowlist.json"), "utf8"),
);
const ignorePaths = allowlist.ignorePaths ?? [];
const allowStrings = new Set(allowlist.allowStrings ?? []);

const SCAN_ROOTS = ["frontend/src/app", "frontend/src/components"];
// High-signal, mostly-unambiguous user-facing props. `title`/`alt` are omitted:
// `title` is overwhelmingly a React component prop here (fed translated values),
// which produces noise rather than real leaks.
const USER_FACING_PROPS = ["placeholder", "aria-label"];
const FILE_RE = /\.tsx$/;

function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (FILE_RE.test(entry.name)) out.push(path.relative(repoRoot, full));
  }
}

function listFiles() {
  if (globalThis.process.argv.includes("--staged")) {
    const out = execFileSync(
      "git",
      ["diff", "--cached", "--name-only", "--diff-filter=ACM"],
      { cwd: repoRoot, encoding: "utf8" },
    );
    return out
      .split("\n")
      .filter(Boolean)
      .filter((f) => FILE_RE.test(f) && SCAN_ROOTS.some((r) => f.startsWith(r)));
  }
  const files = [];
  for (const root of SCAN_ROOTS) walk(path.join(repoRoot, root), files);
  return files;
}

function isIgnored(file) {
  if (file.includes(".test.") || file.includes(".stories.")) return true;
  return ignorePaths.some((p) => file.includes(p));
}

function looksLikeText(raw) {
  const t = raw.replace(/&[a-z]+;/gi, "").trim();
  if (t.length < 3) return false;
  if (allowStrings.has(t)) return false;
  // must contain a run of >= 2 lowercase letters (skips CONSTANTS, acronyms, codes)
  if (!/[a-zà-ÿ]{2}/.test(t)) return false;
  // symbols / numbers only
  if (/^[\s{}<>/\\|.,:;!?+\-—–·•*()[\]#0-9]+$/.test(t)) return false;
  // single code-like token (camelCase, kebab, path, url) with no spaces
  if (!/\s/.test(t) && /^[a-z][a-zA-Z0-9]*([-_/.][a-zA-Z0-9]+)+$/.test(t)) return false;
  if (/^https?:\/\//.test(t)) return false;
  return true;
}

const problems = [];
for (const file of listFiles()) {
  if (isIgnored(file)) continue;
  const lines = fs.readFileSync(path.join(repoRoot, file), "utf8").split("\n");
  lines.forEach((line, index) => {
    const code = line.replace(/\/\/.*$/, "");
    for (const prop of USER_FACING_PROPS) {
      const re = new RegExp(`\\b${prop}\\s*=\\s*"([^"]+)"`, "g");
      let m;
      while ((m = re.exec(code))) {
        if (looksLikeText(m[1]))
          problems.push({ file, line: index + 1, kind: `${prop}=`, text: m[1] });
      }
    }
    // `(?<!=)` skips TS arrow-function generics like `=> Promise<void>`.
    const textRe = /(?<!=)>([^<>{}]+)</g;
    let tm;
    while ((tm = textRe.exec(code))) {
      if (looksLikeText(tm[1]))
        problems.push({
          file,
          line: index + 1,
          kind: "jsx-text",
          text: tm[1].trim(),
        });
    }
  });
}

if (problems.length > 0) {
  globalThis.console.error(
    `\n✖ Hardcoded user-facing strings found (${problems.length}). Route them through next-intl (useTranslations) or an allowlisted per-locale module:\n`,
  );
  for (const p of problems) {
    globalThis.console.error(`  ${p.file}:${p.line}  [${p.kind}]  "${p.text}"`);
  }
  globalThis.console.error(
    `\nIf a match is intentional (brand, technical, honeypot), add the file or exact string to ci/hardcoded-string-allowlist.json.\n`,
  );
  globalThis.process.exit(1);
}
globalThis.console.log("✓ No hardcoded user-facing strings found.");
