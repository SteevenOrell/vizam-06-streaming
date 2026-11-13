/**
 * E2E fixture server: builds the app against the sample catalog (placeholder series with seasons and local video) into
 * its own folder (.next-sample) and serves it on E2E_SAMPLE_PORT (default 3062). The real catalog.json is restored as
 * soon as the build is done, so the main build and other agents are unaffected.
 */
import { spawn, spawnSync } from "node:child_process";

const port = process.env.E2E_SAMPLE_PORT || "3062";
const shell = process.platform === "win32";
const run = (cmd, args, env = {}) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell, env: { ...process.env, ...env } });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed (${r.status})`);
};

const env = { NEXT_DIST_DIR: ".next-sample", CATALOG_SOURCE: "sample" };
try {
  run("node", ["scripts/build-catalog.ts"], env);
  run("npx", ["next", "build"], env);
} finally {
  run("node", ["scripts/build-catalog.ts"], { CATALOG_SOURCE: "" });
}
const server = spawn("npx", ["next", "start", "-p", port], { stdio: "inherit", shell, env: { ...process.env, NEXT_DIST_DIR: ".next-sample" } });
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => server.kill());
server.on("exit", (code) => process.exit(code ?? 0));
