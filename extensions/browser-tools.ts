import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { execFile, spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const CDP_PORT = Number(process.env.PI_BROWSER_CDP_PORT || 9224);
const CDP_HOST = `http://127.0.0.1:${CDP_PORT}`;
let chromeStarted = false;
let activeTargetId: string | undefined;

function stripAnsi(value: string): string {
  return value.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "");
}

function prioritizeFinalResult(output: string): string {
  const marker = output.match(/FINAL_RESULT:\s*([\s\S]*)/i);
  if (!marker) return output;
  return `FINAL_RESULT:\n${marker[1].trim()}\n\n--- BrowserCode log ---\n${output}`;
}

function getBcodePath(): string {
  const home = homedir();
  const candidates = [
    path.join(home, ".bcode", "bin", process.platform === "win32" ? "bcode.exe" : "bcode"),
    path.join(home, ".bcode", "bin", "bcode"),
    "bcode",
  ];
  return candidates.find((candidate) => candidate === "bcode" || existsSync(candidate)) || "bcode";
}

function getChromePath(): string {
  const candidates = process.platform === "win32"
    ? [
        String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`,
        String.raw`C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`,
        path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe"),
        String.raw`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`,
        "chrome.exe",
      ]
    : ["google-chrome", "chromium", "chromium-browser"];
  return candidates.find((candidate) => candidate.includes(path.sep) ? existsSync(candidate) : true) || candidates[0];
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json() as Promise<any>;
}

async function ensureChrome(): Promise<string> {
  try {
    const version = await fetchJson(`${CDP_HOST}/json/version`);
    return version.webSocketDebuggerUrl;
  } catch {
    if (!chromeStarted) {
      chromeStarted = true;
      const profileDir = path.join(tmpdir(), "pi-browser-cdp-profile");
      mkdirSync(profileDir, { recursive: true });
      const chrome = getChromePath();
      const child = spawn(chrome, [
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${profileDir}`,
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-extensions",
        "--window-size=1280,900",
        "about:blank",
      ], { detached: true, stdio: "ignore" });
      child.unref();
    }
    for (let i = 0; i < 40; i++) {
      try {
        const version = await fetchJson(`${CDP_HOST}/json/version`);
        return version.webSocketDebuggerUrl;
      } catch {
        await wait(250);
      }
    }
    throw new Error("Chrome DevTools endpoint did not start");
  }
}

class CdpClient {
  private id = 0;
  private pending = new Map<number, { resolve: (value: any) => void; reject: (err: Error) => void }>();
  constructor(private ws: WebSocket) {
    ws.onmessage = (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id)!;
        this.pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else p.resolve(msg.result);
      }
    };
  }
  static async connect(wsUrl: string): Promise<CdpClient> {
    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error("CDP websocket failed to open"));
    });
    return new CdpClient(ws);
  }
  send(method: string, params: Record<string, unknown> = {}): Promise<any> {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  close() { this.ws.close(); }
}

async function getPageWsUrl(url?: string): Promise<{ wsUrl: string; targetId: string }> {
  const browserWs = await ensureChrome();
  if (url) {
    const browser = await CdpClient.connect(browserWs);
    try {
      const created = await browser.send("Target.createTarget", { url });
      activeTargetId = created.targetId;
    } finally {
      browser.close();
    }
    for (let i = 0; i < 20; i++) {
      const targets = await fetchJson(`${CDP_HOST}/json`);
      const page = targets.find((t: any) => t.id === activeTargetId);
      if (page?.webSocketDebuggerUrl) return { wsUrl: page.webSocketDebuggerUrl, targetId: page.id };
      await wait(100);
    }
    throw new Error("Created browser target did not appear in CDP target list");
  }
  const targets = await fetchJson(`${CDP_HOST}/json`);
  const page = targets.find((t: any) => t.id === activeTargetId) || targets.find((t: any) => t.type === "page");
  if (!page) return getPageWsUrl("about:blank");
  activeTargetId = page.id;
  return { wsUrl: page.webSocketDebuggerUrl, targetId: page.id };
}

async function browserNavigate(url: string, settleMs = 2000) {
  const target = await getPageWsUrl(url);
  const cdp = await CdpClient.connect(target.wsUrl);
  try {
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await wait(settleMs);
    return await browserSnapshot(cdp);
  } finally {
    cdp.close();
  }
}

async function browserSnapshot(existing?: CdpClient) {
  const cdp = existing || await CdpClient.connect((await getPageWsUrl()).wsUrl);
  try {
    const result = await cdp.send("Runtime.evaluate", {
      expression: `(() => ({
        title: document.title,
        url: location.href,
        text: document.body ? document.body.innerText.slice(0, 8000) : "",
        links: Array.from(document.querySelectorAll('a')).slice(0, 80).map(a => ({ text: (a.innerText || a.getAttribute('aria-label') || '').trim().slice(0, 120), href: a.href })).filter(x => x.href)
      }))()`,
      returnByValue: true,
    });
    return result.result.value;
  } finally {
    if (!existing) cdp.close();
  }
}

async function browserEval(expression: string) {
  const target = await getPageWsUrl();
  const cdp = await CdpClient.connect(target.wsUrl);
  try {
    const result = await cdp.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Evaluation failed");
    return result.result.value ?? result.result.description ?? null;
  } finally {
    cdp.close();
  }
}

async function browserScreenshot(options: { filePath?: string; fullPage?: boolean; cwd: string }) {
  const target = await getPageWsUrl();
  const cdp = await CdpClient.connect(target.wsUrl);
  try {
    await cdp.send("Page.enable");
    const dir = path.join(options.cwd, ".pi", "browser-screenshots");
    mkdirSync(dir, { recursive: true });
    const safeName = new Date().toISOString().replace(/[:.]/g, "-");
    const outPath = options.filePath
      ? path.resolve(options.cwd, options.filePath)
      : path.join(dir, `screenshot-${safeName}.png`);
    mkdirSync(path.dirname(outPath), { recursive: true });

    let originalMetrics: any | undefined;
    if (options.fullPage) {
      const metrics = await cdp.send("Page.getLayoutMetrics");
      originalMetrics = metrics;
      const contentSize = metrics.contentSize;
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        mobile: false,
        width: Math.ceil(contentSize.width),
        height: Math.ceil(contentSize.height),
        deviceScaleFactor: 1,
      });
    }

    const result = await cdp.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: !!options.fullPage,
    });
    writeFileSync(outPath, Buffer.from(result.data, "base64"));

    if (originalMetrics) {
      await cdp.send("Emulation.clearDeviceMetricsOverride");
    }

    return outPath;
  } finally {
    cdp.close();
  }
}

function formatSnapshot(snapshot: any) {
  return [
    `Title: ${snapshot.title || "(none)"}`,
    `URL: ${snapshot.url || "(unknown)"}`,
    snapshot.text ? `Text preview:\n${String(snapshot.text).slice(0, 3000)}` : "No page text found.",
    snapshot.links?.length ? `Links:\n${snapshot.links.slice(0, 20).map((l: any, i: number) => `${i + 1}. ${l.text || "(no text)"} — ${l.href}`).join("\n")}` : undefined,
  ].filter(Boolean).join("\n\n");
}

function extractGoogleFromSnapshot(snapshot: any): Array<{ title: string; url: string }> {
  const results: Array<{ title: string; url: string }> = [];
  const seen = new Set<string>();
  for (const link of snapshot.links || []) {
    let href = String(link.href || "");
    if (href.includes("/url?q=")) {
      try { href = new URL(href).searchParams.get("q") || href; } catch {}
    }
    if (!href.startsWith("http") || /google\./i.test(new URL(href).hostname) || seen.has(href)) continue;
    const title = String(link.text || "").trim();
    if (!title || title.length < 3) continue;
    seen.add(href);
    results.push({ title, url: href });
    if (results.length >= 8) break;
  }
  return results;
}

export default function browsercodeExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "browser_open_url",
    label: "Browser Open URL",
    description: "Open a URL in a real Chrome browser via CDP and return title, URL, text preview, and links.",
    promptSnippet: "Use browser_open_url to open a web page in a real browser and inspect its visible text and links.",
    parameters: Type.Object({
      url: Type.String({ description: "URL to open." }),
      settleMs: Type.Optional(Type.Number({ description: "Milliseconds to wait after opening. Default 2000.", minimum: 0, maximum: 15000 })),
    }),
    async execute(_id, params, _signal, onUpdate) {
      onUpdate?.({ content: [{ type: "text", text: `Opening ${params.url}` }] });
      const snapshot = await browserNavigate(params.url, params.settleMs ?? 2000);
      return { content: [{ type: "text", text: formatSnapshot(snapshot) }], details: snapshot };
    },
  });

  pi.registerTool({
    name: "browser_snapshot",
    label: "Browser Snapshot",
    description: "Read the current browser page title, URL, visible text preview, and links.",
    promptSnippet: "Use browser_snapshot after browser navigation to inspect the current page.",
    parameters: Type.Object({}),
    async execute() {
      const snapshot = await browserSnapshot();
      return { content: [{ type: "text", text: formatSnapshot(snapshot) }], details: snapshot };
    },
  });

  pi.registerTool({
    name: "browser_screenshot",
    label: "Browser Screenshot",
    description: "Capture a PNG screenshot of the current browser page and save it to disk.",
    promptSnippet: "Use browser_screenshot to save a screenshot of the current browser page.",
    parameters: Type.Object({
      path: Type.Optional(Type.String({ description: "Optional output path relative to cwd, e.g. .pi/browser-screenshots/page.png. Defaults to a timestamped PNG." })),
      fullPage: Type.Optional(Type.Boolean({ description: "Capture full page instead of viewport. Default false." })),
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const outPath = await browserScreenshot({ filePath: params.path, fullPage: !!params.fullPage, cwd: ctx.cwd });
      return {
        content: [{ type: "text", text: `Screenshot saved: ${outPath}` }],
        details: { path: outPath, fullPage: !!params.fullPage },
      };
    },
  });

  pi.registerTool({
    name: "browser_eval",
    label: "Browser Eval",
    description: "Evaluate JavaScript in the current browser page and return a JSON-serializable result.",
    promptSnippet: "Use browser_eval for targeted DOM extraction or browser-side checks on the current page.",
    parameters: Type.Object({
      expression: Type.String({ description: "JavaScript expression to evaluate. Use an IIFE for multi-line logic." }),
    }),
    async execute(_id, params) {
      const value = await browserEval(params.expression);
      return { content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }], details: { value } };
    },
  });

  pi.registerTool({
    name: "browser_google_search",
    label: "Browser Google Search",
    description: "Perform a Google search in the real browser and return page title plus parsed result links when available.",
    promptSnippet: "Use browser_google_search when the user asks to search Google with the browser.",
    parameters: Type.Object({
      query: Type.String({ description: "Google search query." }),
      settleMs: Type.Optional(Type.Number({ description: "Milliseconds to wait after search. Default 3000.", minimum: 0, maximum: 15000 })),
    }),
    async execute(_id, params, _signal, onUpdate) {
      const url = `https://www.google.com/search?q=${encodeURIComponent(params.query)}&hl=en&num=10`;
      onUpdate?.({ content: [{ type: "text", text: `Searching Google for: ${params.query}` }] });
      const snapshot = await browserNavigate(url, params.settleMs ?? 3000);
      const results = extractGoogleFromSnapshot(snapshot);
      const text = [
        `Google search completed for: ${params.query}`,
        `Title: ${snapshot.title || "(none)"}`,
        `URL: ${snapshot.url || url}`,
        results.length ? results.map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}`).join("\n") : `No organic result links parsed. Visible text preview:\n${String(snapshot.text || "").slice(0, 2000)}`,
      ].join("\n\n");
      return { content: [{ type: "text", text }], details: { snapshot, results } };
    },
  });

  pi.registerTool({
    name: "browser_run",
    label: "BrowserCode",
    description: "Run BrowserCode's autonomous browser-capable agent for complex browser tasks. Prefer browser_open_url/browser_eval/browser_google_search for deterministic browser operations.",
    promptSnippet: "Use browser_run for complex autonomous browser tasks; prefer deterministic browser_* tools for simple navigation/search/extraction.",
    promptGuidelines: [
      "Use browser_open_url, browser_snapshot, browser_eval, and browser_google_search for reliable browser operations.",
      "Use browser_run only when an autonomous BrowserCode agent is needed for multi-step browser work.",
    ],
    parameters: Type.Object({
      task: Type.String({ description: "Browser task for BrowserCode to perform." }),
      timeoutSeconds: Type.Optional(Type.Number({ description: "Max runtime in seconds. Default 120.", minimum: 10, maximum: 1800 })),
    }),
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const bcode = getBcodePath();
      const timeout = Math.max(10, Math.min(params.timeoutSeconds ?? 120, 1800));
      onUpdate?.({ content: [{ type: "text", text: `Starting BrowserCode: ${params.task}` }] });
      try {
        const browserTask = `${params.task}\n\nWhen finished, print a concise final answer starting with FINAL_RESULT:`;
        const { stdout, stderr } = await execFileAsync(bcode, ["run", browserTask], {
          cwd: ctx.cwd,
          timeout: timeout * 1000,
          maxBuffer: 1024 * 1024 * 10,
          signal: signal as AbortSignal | undefined,
          env: {
            ...process.env,
            DO_NOT_TRACK: process.env.DO_NOT_TRACK || "1",
            PATH: `${path.join(homedir(), ".bcode", "bin")}${path.delimiter}${process.env.PATH || ""}`,
          },
        });
        const output = stripAnsi([stdout?.trim(), stderr?.trim()].filter(Boolean).join("\n\n"));
        return { content: [{ type: "text", text: prioritizeFinalResult(output || "BrowserCode completed with no output.") }], details: { bcode, timeoutSeconds: timeout } };
      } catch (error: any) {
        const stdout = error?.stdout ? stripAnsi(String(error.stdout).trim()) : "";
        const stderr = error?.stderr ? stripAnsi(String(error.stderr).trim()) : "";
        const message = [stdout, stderr].filter(Boolean).join("\n\n");
        if (message) return { content: [{ type: "text", text: prioritizeFinalResult(message) }], details: { bcode, timeoutSeconds: timeout, warning: error?.message } };
        return { content: [{ type: "text", text: `BrowserCode failed: ${error?.message || "unknown error"}` }], details: { bcode, timeoutSeconds: timeout }, isError: true };
      }
    },
  });

  pi.registerCommand("browsercode", {
    description: "Show BrowserCode/browser tool integration status",
    handler: async (_args, ctx) => {
      ctx.ui.notify(`Browser tools registered. BrowserCode: ${getBcodePath()}, CDP: ${CDP_HOST}`, "info");
    },
  });
}
