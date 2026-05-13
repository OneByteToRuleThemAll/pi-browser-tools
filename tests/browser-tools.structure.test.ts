import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";
import assert from "node:assert/strict";
import { test } from "vitest";

const root = process.cwd();
const toolsDir = join(root, "extensions", "tools");
const toolDomains = [
  "navigation",
  "tabs",
  "interaction",
  "extraction",
  "observability",
  "network",
  "storage",
  "screenshot",
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function toolNameFromFile(file: string) {
  return basename(file, ".ts").replaceAll("-", "_");
}

test("tool domains expose README documentation", () => {
  for (const domain of [".", ...toolDomains, "legacy"]) {
    const readme = join(toolsDir, domain, "README.md");
    assert.doesNotThrow(() => statSync(readme), `${relative(root, readme)} should exist`);
  }
});

test("tool wrappers are one-file-per-tool legacy bridges with matching names", () => {
  const files = toolDomains.flatMap((domain) =>
    walk(join(toolsDir, domain)).filter((file) => file.endsWith(".ts")),
  );

  assert.equal(files.length, 42);

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const expectedTool = toolNameFromFile(file);
    assert.match(source, /registerLegacyTool\(pi,\s*"browser_/, `${relative(root, file)} should bridge through registerLegacyTool`);
    assert.match(source, new RegExp(`registerLegacyTool\\(pi,\\s*"${expectedTool}"\\)`), `${relative(root, file)} should register ${expectedTool}`);
  }
});

test("testing docs use standard Vitest and smoke terminology", () => {
  const testsReadme = readFileSync(join(root, "tests", "README.md"), "utf8");
  assert.match(testsReadme, /Vitest/);
  assert.match(testsReadme, /smoke/);
  const deprecatedTerms = new RegExp(["e2", "e"].join("") + "|" + ["end", "to", "end"].join("-"), "i");
  assert.doesNotMatch(testsReadme, deprecatedTerms);
});
