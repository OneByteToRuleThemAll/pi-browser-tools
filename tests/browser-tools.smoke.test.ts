import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { test } from "vitest";

type ToolCallContext = { cwd: string };
type ToolResult = { content?: Array<{ text: string }>; details?: unknown };
type ToolSpec = {
  name: string;
  execute: (_id: string, params: Record<string, any>, _signal?: unknown, _onUpdate?: unknown, ctx?: ToolCallContext) => Promise<ToolResult>;
};

const runSmoke = process.env.RUN_BROWSER_TOOLS_SMOKE === "1";

test.skipIf(!runSmoke)("browser-tools real-browser smoke flow", async () => {
  const { default: registerBrowserTools } = await import("../extensions/browser-tools.ts");
  const tools = new Map<string, ToolSpec>();
  registerBrowserTools({
    registerTool: (spec: ToolSpec) => {
      tools.set(spec.name, spec);
    },
    registerCommand: () => undefined,
  } as any);

  const execute = async (name: string, params: Record<string, any> = {}, cwd: string = process.cwd()) => {
    const tool = tools.get(name);
    assert(tool, `tool not registered: ${name}`);
    const output = await tool!.execute(name, params, undefined, undefined, { cwd } as ToolCallContext);
    return output;
  };

  const root = mkdtempSync(path.join(tmpdir(), "pi-browser-tools-smoke-"));
  const fixturePath = path.join(root, "index.html");
  const artifactPath = path.join(root, "artifacts");
  mkdirSync(artifactPath, { recursive: true });

  writeFileSync(
    fixturePath,
    `<!doctype html>\n` +
      `<html><head><meta charset="utf-8" /><title>pi-browser-tools smoke</title></head>\n` +
      `<body>\n` +
      `  <input id="user" />\n` +
      `  <button id="submit" onclick="document.getElementById('output').textContent = 'hello ' + document.getElementById('user').value">Submit</button>\n` +
      `  <div id="output"></div>\n` +
      `</body></html>`,
    "utf8",
  );

  const server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(readFileSync(fixturePath, "utf8"));
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(0, () => resolve());
    server.once("error", reject);
  });
  const address = server.address();
  const port = typeof address === "string" ? undefined : address?.port;
  assert.ok(typeof port === "number");
  const url = `http://127.0.0.1:${port}/index.html`;

  const open = await execute("browser_open_url", { url, settleMs: 500 }, root);
  assert.equal(typeof open?.details?.url, "string");

  const tabList = await execute("browser_list_tabs", {}, root);
  const tabs = ((tabList?.details as { tabs?: Array<{ targetId: string; url?: string; index: number }> })?.tabs || []);
  const target = tabs.find((t) => typeof t.url === "string" && t.url.includes(`/index.html`) );
  assert.ok(target, "fixture tab should be discoverable");
  await execute("browser_switch_tab", { targetId: target.targetId }, root);

  try {
    const type = await execute("browser_type", { selector: "#user", text: "alice" }, root);
    assert.equal(type?.details?.selector, "#user");

    const click = await execute("browser_click", { selector: "#submit" }, root);
    assert.equal(typeof click?.details?.x, "number");

    const wait = await execute("browser_wait_for_text", { text: "hello alice", ms: 1500 }, root);
    assert.equal(wait?.details?.matched, true);

    const payload = await execute("browser_get_element_text", { selector: "#output" }, root);
    assert.equal(String((payload?.details as any)?.text), "hello alice");

    const snapshot = await execute("browser_snapshot", {}, root);
    assert.ok(String((snapshot?.details as any)?.text || "").includes("hello alice"));

    const screenshot = await execute("browser_screenshot", { path: "artifacts/final.png", fullPage: true }, root);
    const screenshotPath = (screenshot?.details as any)?.path || path.join(root, "artifacts/final.png");
    assert.equal(existsSync(screenshotPath), true);

    const openSecond = await execute("browser_new_tab", { url: "about:blank" }, root);
    assert.equal(typeof openSecond?.details?.targetId, "string");

    const list = await execute("browser_list_tabs", {}, root);
    const tabs = (list?.details as { tabs: { targetId: string; index: number }[] }).tabs;
    assert.ok(Array.isArray(tabs) && tabs.length >= 2);

    const close = await execute("browser_close_tab", { index: 1 }, root);
    assert.equal(typeof close?.details?.targetId, "string");

    const after = await execute("browser_wait", { ms: 100 }, root);
    assert.equal(typeof after?.details?.waitedMs, "number");
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(() => resolve(undefined)));
    rmSync(root, { recursive: true, force: true });
  }
});
