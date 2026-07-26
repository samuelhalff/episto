import { spawnSync } from "node:child_process";
import process from "node:process";

const audit = spawnSync("npm", ["audit", "--omit=dev", "--audit-level=high", "--json"], {
  encoding: "utf8",
});

let report;
try {
  report = JSON.parse(audit.stdout || "{}");
} catch {
  process.stderr.write(
    audit.stderr || audit.stdout || "npm audit returned invalid JSON\n",
  );
  process.exit(audit.status || 1);
}

const allowed = new Set(["postcss", "sharp"]);
const vulnerabilities = Object.values(report.vulnerabilities ?? {}).filter(
  (vulnerability) =>
    ["high", "critical"].includes(vulnerability.severity) &&
    !allowed.has(vulnerability.name),
);

if (vulnerabilities.length > 0) {
  process.stdout.write(
    `${JSON.stringify({ ...report, vulnerabilities: Object.fromEntries(vulnerabilities.map((v) => [v.name, v])) }, null, 2)}\n`,
  );
  process.exit(1);
}

const ignored = Object.values(report.vulnerabilities ?? {}).filter((vulnerability) =>
  allowed.has(vulnerability.name),
);
if (ignored.length > 0) {
  process.stdout.write(
    `Accepted upstream-only transitive advisories: ${ignored.map((v) => v.name).join(", ")}\n`,
  );
}
