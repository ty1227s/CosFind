import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const mobileRoot = fileURLToPath(new URL("..", import.meta.url));
const run = (script, args, env = process.env) => {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: mobileRoot,
    env,
    stdio: "inherit"
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run(resolve(mobileRoot, "node_modules", "typescript", "bin", "tsc"), ["-b"]);
run(resolve(mobileRoot, "node_modules", "vite", "bin", "vite.js"), ["build"]);
run(resolve(mobileRoot, "node_modules", "@capacitor", "cli", "bin", "capacitor"), ["sync", "android"], {
  ...process.env,
  CAPACITOR_DEV_SERVER_URL: "http://10.0.2.2:3000"
});
