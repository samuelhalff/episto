import process from "node:process";

const omittedDependencies = process.env.npm_config_omit
  ?.split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (process.env.CI === "true" || omittedDependencies?.includes("dev")) {
  process.exit(0);
}

const { default: husky } = await import("husky");

husky();
