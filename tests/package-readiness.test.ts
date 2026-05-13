import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import { test } from "vitest";

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

function fileExists(path: string) {
  assert.doesNotThrow(() => statSync(join(root, path)), `${path} should exist`);
}

test("package manifest is ready for local/GitHub installation", () => {
  assert.equal(packageJson.name, "pi-browser-tools");
  assert.equal(packageJson.version, "0.2.0");
  assert.equal(packageJson.type, "module");
  assert.deepEqual(packageJson.pi?.extensions, ["./dist/browser-tools.js"]);
  assert.equal(packageJson.dependencies?.typebox, "^1.1.38");
  assert.equal(packageJson.peerDependencies?.["@earendil-works/pi-coding-agent"], "*");
});

test("publish files include runtime code and phase-4 docs", () => {
  for (const entry of [
    "dist",
    "extensions",
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    "REPO_STRUCTURE.md",
    "ROADMAP.md",
    "SMOKE_CHECKLIST.md",
  ]) {
    assert.ok(packageJson.files.includes(entry), `package files should include ${entry}`);
    fileExists(entry);
  }
});

test("standard test scripts use Vitest and keep smoke explicit", () => {
  assert.match(packageJson.scripts.build, /^esbuild extensions\/browser-tools\.ts /);
  assert.equal(packageJson.scripts.prepack, "npm run build");
  assert.match(packageJson.scripts.test, /^vitest run /);
  assert.match(packageJson.scripts["test:all"], /^vitest run$/);
  assert.match(packageJson.scripts["test:smoke"], /browser-tools\.smoke\.test\.ts/);
});
