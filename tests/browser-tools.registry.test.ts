import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { test } from "vitest";
import registerBrowserTools from "../extensions/browser-tools.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const coreSource = readFileSync(join(__dirname, "..", "extensions", "browser-tools-core.ts"), "utf8");
const indexSource = readFileSync(join(__dirname, "..", "extensions", "tools", "index.ts"), "utf8");

function legacyToolNames() {
  return Array.from(coreSource.matchAll(/name:\s*"(browser_[^"]+)"/g)).map((match) => match[1]);
}

function registeredToolNames() {
  const tools = new Map<string, unknown>();
  const commands = new Map<string, unknown>();
  registerBrowserTools({
    registerTool(spec: { name: string }) {
      tools.set(spec.name, spec);
    },
    registerCommand(name: string, spec: unknown) {
      commands.set(name, spec);
    },
  } as any);
  return { tools: Array.from(tools.keys()).sort(), commands };
}

test("modular registry exposes the full legacy browser tool surface", () => {
  const expected = Array.from(new Set(legacyToolNames())).sort();
  const { tools } = registeredToolNames();

  assert.deepEqual(tools, expected);
  assert.equal(tools.length, 42);
});

test("modular registry registers browser tools status command", () => {
  const { commands } = registeredToolNames();

  assert.equal(commands.has("browser-tools"), true);
  assert.equal(commands.has("browsercode"), false);
});

test("each legacy tool has a modular wrapper registered from tools/index.ts", () => {
  const expected = Array.from(new Set(legacyToolNames())).sort();
  for (const toolName of expected) {
    const pascal = toolName
      .replace(/^browser_/, "browser_")
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
    assert.match(indexSource, new RegExp(`register${pascal}\\(`), `${toolName} should be registered by tools/index.ts`);
  }
});
