import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
const CDP_PORT = Number(process.env.PI_BROWSER_CDP_PORT || 9224);
const CDP_HOST = `http://127.0.0.1:${CDP_PORT}`;
let chromeStarted = false;
let activeTargetId: string | undefined;

interface BrowserConsoleRecord {
  source?: string;
  level: string;
  text: string;
  timestamp: number;
  stack?: string;
  args?: Array<any>;
}

interface BrowserNetworkRecord {
  requestId: string;
  method: string;
  url: string;
  type: string;
  status?: number;
  mimeType?: string;
  encodedDataLength?: number;
  failed?: boolean;
  errorText?: string;
  timestamp: number;
  endTimestamp?: number;
  durationMs?: number;
}

type ActiveNetworkCollector = {
  targetId: string;
  cdp: CdpClient;
  records: BrowserNetworkRecord[];
  byRequest: Map<string, BrowserNetworkRecord>;
  startedAt: number;
};

let activeNetworkCollector: ActiveNetworkCollector | null = null;

function normalizeNetworkRecord(record: BrowserNetworkRecord) {
  return {
    requestId: record.requestId,
    method: record.method,
    url: record.url,
    type: record.type,
    status: record.status,
    mimeType: record.mimeType,
    encodedDataLength: record.encodedDataLength,
    failed: !!record.failed,
    errorText: record.errorText,
    timestamp: record.timestamp,
    endTimestamp: record.endTimestamp,
    durationMs: record.durationMs,
  };
}

function formatConsoleArg(arg: any): string {
  if (arg == null) return String(arg);
  if (Object.prototype.hasOwnProperty.call(arg, "value")) return String(arg.value);
  if (arg.unserializableValue) return String(arg.unserializableValue);
  if (arg.description) return String(arg.description);
  return String(arg);
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
  private eventHandlers = new Map<string, Set<(params: any) => void>>();
  private ws: WebSocket;

  constructor(ws: WebSocket) {
    this.ws = ws;
    ws.onmessage = (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id)!;
        this.pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else p.resolve(msg.result);
        return;
      }
      if (msg.method) this.emitEvent(msg.method, msg.params);
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

  on(method: string, handler: (params: any) => void) {
    const existing = this.eventHandlers.get(method) || new Set<(params: any) => void>();
    existing.add(handler);
    this.eventHandlers.set(method, existing);
  }

  off(method: string, handler: (params: any) => void) {
    const handlers = this.eventHandlers.get(method);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size === 0) this.eventHandlers.delete(method);
  }

  private emitEvent(method: string, params: any) {
    const handlers = this.eventHandlers.get(method);
    if (!handlers) return;
    for (const handler of handlers) {
      handler(params);
    }
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

async function getTargets() {
  return fetchJson(`${CDP_HOST}/json`) as Promise<Array<Record<string, any>>>;
}

function formatTabs(tabs: Array<Record<string, any>>) {
  return tabs.map((tab, index) => ({
    index,
    targetId: tab.id,
    title: tab.title || "",
    url: tab.url || "",
    type: tab.type,
    webSocketDebuggerUrl: tab.webSocketDebuggerUrl,
  }));
}

async function browserTabs(action: "list" | "open" | "switch" | "close", options: { url?: string; targetId?: string; index?: number } = {}) {
  if (action === "list") {
    const tabs = await getTargets();
    return { action: "list", tabs: formatTabs(tabs.filter((tab) => tab.type === "page" || tab.type === "other")) };
  }

  if (action === "open") {
    const opened = await getPageWsUrl(options.url || "about:blank");
    const tabs = await getTargets();
    const openedTab = tabs.find((tab) => tab.id === opened.targetId);
    return { action: "open", targetId: opened.targetId, tabs: formatTabs(tabs.filter((tab) => tab.type === "page" || tab.type === "other")), openedTab: openedTab ? formatTabs([openedTab])[0] : null };
  }

  if (action === "switch" || action === "close") {
    const tabs = await getTargets();
    const pages = tabs.filter((tab) => tab.type === "page");
    const target = options.targetId
      ? pages.find((tab) => tab.id === options.targetId)
      : typeof options.index === "number" && Number.isInteger(options.index)
        ? pages[options.index]
        : undefined;

    if (!target) {
      throw new Error(`Target not found for ${action}${options.targetId ? ` id ${options.targetId}` : options.index != null ? ` index ${options.index}` : ""}`);
    }

    const connection = await CdpClient.connect(await ensureChrome());
    try {
      if (action === "switch") {
        await connection.send("Target.activateTarget", { targetId: target.id });
        activeTargetId = target.id;
      } else {
        const result = await connection.send("Target.closeTarget", { targetId: target.id });
        if (!result.success) throw new Error("Failed to close target");
        if (activeTargetId === target.id) activeTargetId = undefined;
      }
      const after = await getTargets();
      return { action, targetId: target.id, tabs: formatTabs(after.filter((tab) => tab.type === "page" || tab.type === "other")) };
    } finally {
      connection.close();
    }
  }

  throw new Error(`Unsupported browser_tabs action: ${action}`);
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

async function browserClick(selector: string) {
  const target = await getPageWsUrl();
  const cdp = await CdpClient.connect(target.wsUrl);
  try {
    const position = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return null;
        el.scrollIntoView({ block: 'center', inline: 'center' });
        const after = el.getBoundingClientRect();
        return { x: after.left + after.width / 2, y: after.top + after.height / 2 };
      })()`,
      returnByValue: true,
    });
    const point = position?.result?.value;
    if (!point || typeof point.x !== "number" || typeof point.y !== "number") {
      throw new Error(`No clickable element found for selector: ${selector}`);
    }
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y, button: "left" });
    await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
    return { selector, x: point.x, y: point.y };
  } finally {
    cdp.close();
  }
}

async function browserType(selector: string, text: string, options: { clear?: boolean; delay?: number } = {}) {
  const target = await getPageWsUrl();
  const cdp = await CdpClient.connect(target.wsUrl);
  try {
    const exists = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return { ok: false };
        const tag = (el.tagName || '').toLowerCase();
        const isTextInput = ['input', 'textarea'].includes(tag) || (tag === 'div' && el.isContentEditable);
        if (!isTextInput) return { ok: false, reason: 'not-input' };
        if (${options.clear ? "true" : "false"}) el.value = '';
        el.focus();
        return { ok: true, tag };
      })()`,
      returnByValue: true,
    });
    if (!exists?.result?.value?.ok) {
      throw new Error(`No editable element found for selector: ${selector}`);
    }

    if (options.delay && options.delay > 0) await wait(options.delay * text.length);
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return null;
        const value = ${JSON.stringify(options.clear ?? true)} ? ${JSON.stringify(text)} : String(el.value || el.textContent || '') + ${JSON.stringify(text)};
        if (el.isContentEditable) el.textContent = value;
        else el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return el.value || el.textContent || '';
      })()`,
      returnByValue: true,
    });
    return { selector, text, cleared: !!options.clear };
  } finally {
    cdp.close();
  }
}

async function browserGetHtml(selector?: string) {
  const target = await getPageWsUrl();
  const cdp = await CdpClient.connect(target.wsUrl);
  try {
    const expression = selector
      ? `(() => {
          const el = document.querySelector(${JSON.stringify(selector)});
          return el ? el.outerHTML : null;
        })()`
      : '(() => document.documentElement ? document.documentElement.innerHTML : "")()';
    const result = await cdp.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
    });
    return {
      selector: selector || 'document',
      html: String(result.result?.value || ""),
      length: String(result.result?.value || "").length,
    };
  } finally {
    cdp.close();
  }
}

async function browserGetElement(selector: string, mode: "text" | "attributes" | "value" | "href" | "all") {
  const target = await getPageWsUrl();
  const cdp = await CdpClient.connect(target.wsUrl);
  try {
    const result = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return null;
        const attrs = Array.from(el.attributes || []).reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {});
        return {
          text: el.textContent || '',
          attributes: attrs,
          value: el.value,
          href: el.href || null,
        };
      })()`,
      returnByValue: true,
    });
    if (!result.result?.value) throw new Error(`No element found for selector: ${selector}`);

    const payload = result.result.value as any;
    if (mode === "text") return { selector, text: payload.text || "" };
    if (mode === "attributes") return { selector, attributes: payload.attributes || {} };
    if (mode === "value") return { selector, value: payload.value ?? null };
    if (mode === "href") return { selector, href: payload.href || null };
    return { selector, ...payload };
  } finally {
    cdp.close();
  }
}

async function browserConsole(ms = 1000, level: string = "all", filter?: string) {
  const target = await getPageWsUrl();
  const cdp = await CdpClient.connect(target.wsUrl);
  const logs: BrowserConsoleRecord[] = [];

  const onConsole = (params: any) => {
    const levelValue = params?.type || "log";
    if (level !== "all" && levelValue !== level) return;
    const args = Array.isArray(params?.args) ? params.args : [];
    const text = args.length
      ? args.map(formatConsoleArg).join(" ")
      : params?.description ? String(params.description) : "";
    const record: BrowserConsoleRecord = {
      source: params?.source,
      level: levelValue,
      text,
      args,
      timestamp: Date.now(),
    };
    if (filter && !record.text.includes(filter)) return;
    logs.push(record);
    if (logs.length > 250) logs.shift();
  };

  const onException = (params: any) => {
    const text = params?.exception?.description || params?.text || "Exception";
    const stack = params?.exception?.stackTrace?.callFrames?.map((frame: any) => `${frame.functionName || "?"} @ ${frame.url}:${frame.lineNumber}:${frame.columnNumber}`).join(" -> ");
    logs.push({
      source: "exception",
      level: "error",
      text,
      stack,
      timestamp: Date.now(),
    });
    if (logs.length > 250) logs.shift();
  };

  try {
    cdp.on("Runtime.consoleAPICalled", onConsole);
    cdp.on("Runtime.exceptionThrown", onException);
    await cdp.send("Runtime.enable");
    await wait(ms);
    return {
      level,
      entries: logs,
      count: logs.length,
      durationMs: ms,
    };
  } finally {
    cdp.off("Runtime.consoleAPICalled", onConsole);
    cdp.off("Runtime.exceptionThrown", onException);
    cdp.close();
  }
}

function createNetworkCaptureHandlers(
  byRequest: Map<string, BrowserNetworkRecord>,
  records: BrowserNetworkRecord[],
  options: { method?: string; urlContains?: string; onlyErrors?: boolean } = {},
) {
  const upsert = (record: BrowserNetworkRecord) => {
    if (records.length > 500) {
      const oldest = records.shift();
      if (oldest) byRequest.delete(oldest.requestId);
    }
    byRequest.set(record.requestId, record);
    records.push(record);
  };

  const onRequest = (params: any) => {
    const request = params?.request;
    if (!request) return;
    const method = String(request.method || "GET").toUpperCase();
    const url = String(request.url || "");
    if (options.method && method !== options.method.toUpperCase()) return;
    if (options.urlContains && !url.includes(options.urlContains)) return;
    upsert({
      requestId: String(params.requestId || `${Date.now()}`),
      method,
      url,
      type: String(params.type || "other"),
      timestamp: Date.now(),
    });
  };

  const onResponse = (params: any) => {
    const record = byRequest.get(String(params.requestId));
    if (!record) return;
    const response = params?.response || {};
    record.status = response.status;
    record.mimeType = response.mimeType || record.mimeType;
    if (params?.type) record.type = params.type;
  };

  const onFinished = (params: any) => {
    const record = byRequest.get(String(params.requestId));
    if (!record) return;
    record.endTimestamp = Date.now();
    record.durationMs = (record.endTimestamp || record.timestamp) - record.timestamp;
    record.encodedDataLength = params?.encodedDataLength;
  };

  const onFailed = (params: any) => {
    const record = byRequest.get(String(params.requestId));
    if (!record) return;
    record.failed = true;
    record.errorText = params?.errorText || "failed";
    record.endTimestamp = Date.now();
    record.durationMs = (record.endTimestamp || record.timestamp) - record.timestamp;
  };

  return { upsert, onRequest, onResponse, onFinished, onFailed };
}

async function browserNetwork(ms = 1000, options: { method?: string; urlContains?: string; onlyErrors?: boolean } = {}) {
  const target = await getPageWsUrl();
  const cdp = await CdpClient.connect(target.wsUrl);
  const byRequest = new Map<string, BrowserNetworkRecord>();
  const records: BrowserNetworkRecord[] = [];
  const handlers = createNetworkCaptureHandlers(byRequest, records, options);

  try {
    cdp.on("Network.requestWillBeSent", handlers.onRequest);
    cdp.on("Network.responseReceived", handlers.onResponse);
    cdp.on("Network.loadingFinished", handlers.onFinished);
    cdp.on("Network.loadingFailed", handlers.onFailed);
    await cdp.send("Network.enable");
    await wait(ms);
    const snapshot = [...records]
      .filter((entry) => (options.onlyErrors ? !!entry.failed : true))
      .map(normalizeNetworkRecord)
      .sort((a, b) => a.timestamp - b.timestamp);
    return {
      total: snapshot.length,
      durationMs: ms,
      entries: snapshot,
    };
  } finally {
    cdp.off("Network.requestWillBeSent", handlers.onRequest);
    cdp.off("Network.responseReceived", handlers.onResponse);
    cdp.off("Network.loadingFinished", handlers.onFinished);
    cdp.off("Network.loadingFailed", handlers.onFailed);
    cdp.close();
  }
}

async function browserNetworkStart() {
  if (activeNetworkCollector) {
    return { action: "start", status: "already-running", targetId: activeNetworkCollector.targetId, startedAt: activeNetworkCollector.startedAt };
  }
  const target = await getPageWsUrl();
  const cdp = await CdpClient.connect(target.wsUrl);
  const byRequest = new Map<string, BrowserNetworkRecord>();
  const records: BrowserNetworkRecord[] = [];
  const handlers = createNetworkCaptureHandlers(byRequest, records, {});

  try {
    cdp.on("Network.requestWillBeSent", handlers.onRequest);
    cdp.on("Network.responseReceived", handlers.onResponse);
    cdp.on("Network.loadingFinished", handlers.onFinished);
    cdp.on("Network.loadingFailed", handlers.onFailed);
    await cdp.send("Network.enable");
    activeNetworkCollector = {
      targetId: target.targetId,
      cdp,
      byRequest,
      records,
      startedAt: Date.now(),
    };
    return { action: "start", status: "started", targetId: target.targetId, startedAt: activeNetworkCollector.startedAt };
  } catch (error) {
    cdp.close();
    throw error;
  }
}

async function browserNetworkStop() {
  if (!activeNetworkCollector) {
    return { action: "stop", status: "not-running" };
  }
  const collector = activeNetworkCollector;
  activeNetworkCollector = null;
  try {
    await collector.cdp.send("Network.disable");
  } finally {
    collector.cdp.close();
  }
  return { action: "stop", status: "stopped", targetId: collector.targetId, captured: collector.records.length, startedAt: collector.startedAt };
}

async function browserNetworkClear() {
  if (!activeNetworkCollector) {
    return { action: "clear", status: "not-running", removed: 0 };
  }
  const removed = activeNetworkCollector.records.length;
  activeNetworkCollector.records.length = 0;
  activeNetworkCollector.byRequest.clear();
  return { action: "clear", status: "cleared", removed };
}

async function browserScroll(kind: "top" | "bottom" | "selector" | "by", options: { selector?: string; x?: number; y?: number } = {}) {
  const target = await getPageWsUrl();
  const cdp = await CdpClient.connect(target.wsUrl);
  try {
    if (kind === "top") {
      await cdp.send("Runtime.evaluate", { expression: "window.scrollTo({ top: 0, left: 0, behavior: 'instant' });", returnByValue: true });
      return { kind: "top", x: 0, y: 0 };
    }

    if (kind === "bottom") {
      await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          const max = Math.max(
            document.body ? document.body.scrollHeight : 0,
            document.documentElement ? document.documentElement.scrollHeight : 0,
          );
          window.scrollTo({ top: max, left: 0, behavior: 'instant' });
          return max;
        })()`,
        returnByValue: true,
      });
      return { kind: "bottom", y: "max" };
    }

    if (kind === "selector") {
      if (!options.selector) throw new Error("selector is required for kind=selector");
      const result = await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          const el = document.querySelector(${JSON.stringify(options.selector)});
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          const top = window.scrollY + rect.top;
          const left = window.scrollX + rect.left;
          window.scrollTo({ top, left, behavior: 'instant' });
          return { x: left, y: top };
        })()`,
        returnByValue: true,
      });
      const value = result.result?.value;
      if (!value) throw new Error(`No element found for selector: ${options.selector}`);
      return { kind: "selector", selector: options.selector, x: value.x, y: value.y };
    }

    const x = Number.isFinite(options.x ?? 0) ? Number(options.x ?? 0) : 0;
    const y = Number.isFinite(options.y ?? 0) ? Number(options.y ?? 0) : 0;
    await cdp.send("Runtime.evaluate", {
      expression: `window.scrollBy({ left: ${x}, top: ${y}, behavior: 'instant' })`,
    });
    return { kind: "by", x, y };
  } finally {
    cdp.close();
  }
}

async function browserScrollToSelector(selector: string) {
  return browserScroll("selector", { selector });
}

async function browserGetElementText(selector: string) {
  return browserGetElement(selector, "text");
}

async function browserGetNetworkLog(ms = 1000, options: { method?: string; urlContains?: string; onlyErrors?: boolean } = {}) {
  if (!activeNetworkCollector) return browserNetwork(ms, options);

  await wait(ms);
  const records = [...activeNetworkCollector.records]
    .filter((entry) => (options.onlyErrors ? !!entry.failed : true))
    .filter((entry) => (options.method ? entry.method.toUpperCase() === String(options.method).toUpperCase() : true))
    .filter((entry) => (options.urlContains ? entry.url.includes(options.urlContains) : true))
    .map(normalizeNetworkRecord)
    .sort((a, b) => a.timestamp - b.timestamp);

  return {
    total: records.length,
    durationMs: ms,
    entries: records,
  };
}

async function browserClearConsoleLogs() {
  const target = await getPageWsUrl();
  const cdp = await CdpClient.connect(target.wsUrl);
  try {
    await cdp.send("Runtime.evaluate", {
      expression: "console.clear();",
      returnByValue: true,
    });
    return { cleared: true };
  } finally {
    cdp.close();
  }
}

async function browserWaitForNetworkIdle(ms = 1000) {
  return browserWaitForLoadState("networkidle0", ms);
}

async function browserWaitForSelectorDisappearance(selector: string, ms = 1000) {
  const target = await getPageWsUrl();
  const cdp = await CdpClient.connect(target.wsUrl);
  try {
    const start = Date.now();
    const end = start + ms;
    while (Date.now() < end) {
      const result = await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          const el = document.querySelector(${JSON.stringify(selector)});
          if (!el) return true;
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          const visible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
          return !visible;
        })()`,
        returnByValue: true,
      });
      if (result.result?.value) {
        return { selector, matched: true, waitedMs: Date.now() - start };
      }
      await wait(200);
    }
    return { selector, matched: false, waitedMs: Date.now() - start, timeoutMs: ms };
  } finally {
    cdp.close();
  }
}

async function browserCookieJar(action: "list" | "set" | "delete", options: { name?: string; value?: string; path?: string } = {}) {
  const target = await getPageWsUrl();
  const cdp = await CdpClient.connect(target.wsUrl);
  try {
    if (action === "list") {
      const result = await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          if (!document.cookie) return [];
          return document.cookie.split('; ').filter(Boolean).map((item) => {
            const index = item.indexOf('=');
            const name = decodeURIComponent(index >= 0 ? item.slice(0, index) : item);
            const value = decodeURIComponent(index >= 0 ? item.slice(index + 1) : '');
            return { name, value };
          });
        })()`,
        returnByValue: true,
      });
      return { action: "list", cookies: result.result?.value || [] };
    }

    if (action === "set") {
      if (!options.name) throw new Error("name is required for set action");
      const name = JSON.stringify(options.name);
      const value = JSON.stringify(options.value || "");
      const path = options.path || "/";
      await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          const path = ${JSON.stringify(path)};
          document.cookie = ${name} + '=' + ${value} + '; path=' + path;
        })()`,
        returnByValue: true,
      });
      return { action: "set", name: options.name, value: options.value || "", path };
    }

    if (action === "delete") {
      if (!options.name) throw new Error("name is required for delete action");
      const name = JSON.stringify(options.name);
      await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          const path = ${JSON.stringify(options.path || "/")};
          document.cookie = ${name} + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=' + path;
        })()`,
        returnByValue: true,
      });
      return { action: "delete", name: options.name, path: options.path || "/" };
    }

    throw new Error(`Unsupported browser_cookie_jar action: ${action}`);
  } finally {
    cdp.close();
  }
}

async function browserTabsToDeprecated(action: "new" | "list" | "switch" | "close", options: { url?: string; targetId?: string; index?: number } = {}) {
  if (action === "new") return browserTabs("open", options);
  if (action === "list") return browserTabs("list", options);
  if (action === "switch") return browserTabs("switch", options);
  return browserTabs("close", options);
}

async function browserNewTab(url = "about:blank") {
  return browserTabsToDeprecated("new", { url });
}

async function browserSwitchTab(options: { targetId?: string; index?: number }) {
  return browserTabsToDeprecated("switch", options);
}

async function browserCloseTab(options: { targetId?: string; index?: number }) {
  return browserTabsToDeprecated("close", options);
}

async function browserListTabs() {
  return browserTabsToDeprecated("list");
}

async function browserGetCookies() {
  const target = await getPageWsUrl();
  const cdp = await CdpClient.connect(target.wsUrl);
  try {
    const current = await cdp.send("Runtime.evaluate", { expression: "location.href", returnByValue: true });
    const currentUrl = typeof current.result?.value === "string" ? current.result.value : undefined;
    const payload = await cdp.send("Network.getCookies", currentUrl ? { urls: [currentUrl] } : {});
    const cookies = payload.cookies || [];
    return { count: cookies.length, url: currentUrl || null, cookies };
  } finally {
    cdp.close();
  }
}

async function browserSetCookie(name: string, value: string, options: { url?: string; path?: string; secure?: boolean; httpOnly?: boolean; sameSite?: "Strict" | "Lax" | "None"; expires?: number } = {}) {
  if (!name) throw new Error("name is required for set_cookie");
  const target = await getPageWsUrl();
  const cdp = await CdpClient.connect(target.wsUrl);
  try {
    const current = await cdp.send("Runtime.evaluate", { expression: "location.href", returnByValue: true });
    const currentUrl = typeof current.result?.value === "string" ? current.result.value : undefined;
    const payload = await cdp.send("Network.setCookie", {
      name,
      value: value || "",
      url: options.url || currentUrl,
      path: options.path || "/",
      secure: !!options.secure,
      httpOnly: !!options.httpOnly,
      sameSite: options.sameSite || "Lax",
      expires: options.expires,
    });
    if (!payload.success) throw new Error("Failed to set cookie");
    return {
      action: "set",
      success: true,
      name,
      value: value || "",
      path: options.path || "/",
      url: options.url || currentUrl,
      sameSite: options.sameSite || "Lax",
      secure: !!options.secure,
      httpOnly: !!options.httpOnly,
    };
  } finally {
    cdp.close();
  }
}

async function browserClearCookies() {
  const target = await getPageWsUrl();
  const cdp = await CdpClient.connect(target.wsUrl);
  try {
    await cdp.send("Network.clearBrowserCookies");
    return { action: "clear", cleared: true, targetId: target.targetId };
  } finally {
    cdp.close();
  }
}

async function browserGetSelectOptions(selector: string) {
  const target = await getPageWsUrl();
  const cdp = await CdpClient.connect(target.wsUrl);
  try {
    const result = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const select = document.querySelector(${JSON.stringify(selector)});
        if (!select) return null;
        if (!(select instanceof HTMLSelectElement)) return { tag: (select.tagName || '').toLowerCase() };
        return {
          id: select.id || null,
          name: select.name || null,
          multiple: select.multiple,
          required: select.required,
          disabled: select.disabled,
          optionCount: select.options.length,
          options: Array.from(select.options).map((option, index) => ({
            index,
            value: option.value,
            text: option.text || option.label || '',
            selected: option.selected,
            disabled: option.disabled,
          })),
        };
      })()`,
      returnByValue: true,
    });
    const payload = result.result?.value;
    if (!payload) throw new Error(`No select element found for selector: ${selector}`);
    if (payload.tag) throw new Error(`Selector is not a select element: ${selector}`);
    return { selector, ...payload };
  } finally {
    cdp.close();
  }
}

async function browserSubmit(selector: string) {
  const target = await getPageWsUrl();
  const cdp = await CdpClient.connect(target.wsUrl);
  try {
    const result = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const node = document.querySelector(${JSON.stringify(selector)});
        if (!node) return null;
        const form = node.tagName === 'FORM' ? node : node.closest('form');
        if (!form) return { found: false };
        const payload = {
          id: form.id || '',
          action: form.getAttribute('action') || '',
          method: (form.getAttribute('method') || 'get').toLowerCase(),
          fieldCount: form.elements ? form.elements.length : 0,
        };
        if (form.requestSubmit) {
          form.requestSubmit();
        } else {
          form.submit();
        }
        return { submitted: true, ...payload };
      })()`,
      returnByValue: true,
    });
    if (!result.result?.value || !result.result.value.submitted) throw new Error(`No form found for selector: ${selector}`);
    return result.result.value;
  } finally {
    cdp.close();
  }
}

async function browserPressKey(key: string, selector?: string) {
  const target = await getPageWsUrl();
  const cdp = await CdpClient.connect(target.wsUrl);
  try {
    const result = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const target = ${selector ? `document.querySelector(${JSON.stringify(selector)})` : "document.activeElement"};
        if (!target) return null;
        ${selector ? "if (target.focus) target.focus();" : ""}
        const text = String(${JSON.stringify(key)});
        const code = text.length === 1
          ? (text >= 'a' && text <= 'z' ? 'Key' + text.toUpperCase() : text >= 'A' && text <= 'Z' ? 'Key' + text.toUpperCase() : text >= '0' && text <= '9' ? 'Digit' + text : text)
          : text;
        const eventInit = { key: text, code, bubbles: true, cancelable: true };
        target.dispatchEvent(new KeyboardEvent('keydown', eventInit));
        target.dispatchEvent(new KeyboardEvent('keypress', eventInit));
        target.dispatchEvent(new KeyboardEvent('keyup', eventInit));
        return { selector: ${selector ? JSON.stringify(selector) : null}, key: text, code };
      })()`,
      returnByValue: true,
    });
    if (!result.result?.value) throw new Error(`Unable to dispatch key ${key}${selector ? ` to ${selector}` : ''}`);
    return result.result.value;
  } finally {
    cdp.close();
  }
}

async function browserUploadFile(selector: string, files: string[]) {
  const target = await getPageWsUrl();
  const cdp = await CdpClient.connect(target.wsUrl);
  try {
    if (!files.length) throw new Error("files is required for upload_file");
    await cdp.send("DOM.enable");
    const root = await cdp.send("DOM.getDocument", { depth: 1 });
    const query = await cdp.send("DOM.querySelector", {
      nodeId: root.root?.nodeId,
      selector,
    });
    const nodeId = query.nodeId;
    if (!nodeId) throw new Error(`No element found for selector: ${selector}`);
    await cdp.send("DOM.setFileInputFiles", {
      nodeId,
      files,
    });
    return { selector, files };
  } finally {
    cdp.close();
  }
}

async function browserGetForms() {
  const target = await getPageWsUrl();
  const cdp = await CdpClient.connect(target.wsUrl);
  try {
    const result = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        return Array.from(document.querySelectorAll('form')).map((form, formIndex) => {
          const elements = Array.from(form.elements || []);
          return {
            index: formIndex,
            id: form.id || null,
            name: form.getAttribute('name') || null,
            action: form.getAttribute('action') || null,
            method: (form.getAttribute('method') || 'get').toLowerCase(),
            fields: elements.map((field: any, fieldIndex) => ({
              index: fieldIndex,
              tag: String(field.tagName || '').toLowerCase(),
              type: String(field.type || '').toLowerCase() || null,
              name: field.name || null,
              id: field.id || null,
              value: Object.prototype.hasOwnProperty.call(field, 'value') ? String(field.value ?? '') : null,
              checked: Object.prototype.hasOwnProperty.call(field, 'checked') ? !!field.checked : null,
              required: !!field.required,
              placeholder: field.placeholder || null,
              disabled: !!field.disabled,
            })),
          };
        });
      })()`,
      returnByValue: true,
    });
    return { count: (result.result?.value || []).length, forms: result.result?.value || [] };
  } finally {
    cdp.close();
  }
}

async function browserSetViewport(width?: number, height?: number, deviceScaleFactor = 1, mobile = false) {
  const target = await getPageWsUrl();
  const cdp = await CdpClient.connect(target.wsUrl);
  try {
    if (!width || !height) {
      await cdp.send("Emulation.clearDeviceMetricsOverride");
      return { action: "clear", width: null, height: null };
    }
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: Math.max(1, Math.trunc(width)),
      height: Math.max(1, Math.trunc(height)),
      deviceScaleFactor: Math.max(1, deviceScaleFactor),
      mobile,
    });
    return {
      width: Math.trunc(width),
      height: Math.trunc(height),
      deviceScaleFactor: Math.max(1, deviceScaleFactor),
      mobile,
      action: "set",
    };
  } finally {
    cdp.close();
  }
}

async function browserWait(ms = 1000, selector?: string, text?: string) {
  if (!selector && !text) {
    await wait(ms);
    return { waitedMs: ms };
  }

  const start = Date.now();
  const end = start + ms;
  while (Date.now() < end) {
    const target = await getPageWsUrl();
    const cdp = await CdpClient.connect(target.wsUrl);
    try {
      const result = await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          const selector = ${selector ? JSON.stringify(selector) : "null"};
          const expectedText = ${text ? JSON.stringify(text) : "null"};
          const hasSelector = selector ? !!document.querySelector(selector) : false;
          const hasText = expectedText ? document.body?.innerText?.includes(expectedText) : false;
          return { hasSelector, hasText, matches: selector ? !!document.querySelector(selector) : false };
        })()`,
        returnByValue: true,
      });
      const value = result.result?.value || {};
      const satisfied = selector && text ? value.hasSelector && value.hasText : selector ? value.matches : value.hasText;
      if (satisfied) {
        return { selector, text, waitedMs: Date.now() - start, matched: true };
      }
    } finally {
      cdp.close();
    }
    await wait(200);
  }
  return { selector, text, waitedMs: Date.now() - start, matched: false, timeoutMs: ms };
}

async function browserWaitForSelector(selector: string, ms = 1000) {
  return browserWait(ms, selector);
}

async function browserWaitForText(text: string, ms = 1000) {
  return browserWait(ms, undefined, text);
}

async function browserWaitForLoadState(state: "load" | "domcontentloaded" | "networkidle0", ms = 1000) {
  const target = await getPageWsUrl();
  const cdp = await CdpClient.connect(target.wsUrl);
  const start = Date.now();
  const end = start + ms;
  let pending = 0;
  const onRequestWillBeSent = () => { pending += 1; };
  const onRequestDone = () => { pending = Math.max(0, pending - 1); };

  try {
    await cdp.send("Runtime.enable");
    if (state === "networkidle0") {
      cdp.on("Network.requestWillBeSent", onRequestWillBeSent);
      cdp.on("Network.loadingFinished", onRequestDone);
      cdp.on("Network.loadingFailed", onRequestDone);
      await cdp.send("Network.enable");
    }

    while (Date.now() < end) {
      const ready = await cdp.send("Runtime.evaluate", {
        expression: "document.readyState || ''",
        returnByValue: true,
      });
      const readyState = String(ready.result?.value || "");

      if (state === "domcontentloaded" && (readyState === "interactive" || readyState === "complete")) {
        return { state, matched: true, waitedMs: Date.now() - start, readyState };
      }
      if (state === "load" && readyState === "complete") {
        return { state, matched: true, waitedMs: Date.now() - start, readyState };
      }
      if (state === "networkidle0" && (readyState === "interactive" || readyState === "complete") && pending === 0) {
        return { state, matched: true, waitedMs: Date.now() - start, readyState, pending };
      }

      await wait(200);
    }

    return {
      state,
      matched: false,
      waitedMs: Date.now() - start,
      timeoutMs: ms,
      pending,
    };
  } finally {
    if (state === "networkidle0") {
      cdp.off("Network.requestWillBeSent", onRequestWillBeSent);
      cdp.off("Network.loadingFinished", onRequestDone);
      cdp.off("Network.loadingFailed", onRequestDone);
    }
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

async function browserElementScreenshot(selector: string, options: { filePath?: string; fullPage?: boolean; cwd: string }) {
  const target = await getPageWsUrl();
  const cdp = await CdpClient.connect(target.wsUrl);
  try {
    await cdp.send("Page.enable");
    const dir = path.join(options.cwd, ".pi", "browser-screenshots");
    mkdirSync(dir, { recursive: true });

    const safeName = new Date().toISOString().replace(/[:.]/g, "-");
    const outPath = options.filePath
      ? path.resolve(options.cwd, options.filePath)
      : path.join(dir, `element-${safeName}.png`);
    mkdirSync(path.dirname(outPath), { recursive: true });

    const rect = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const visible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        return {
          visible,
          x: rect.x + window.scrollX,
          y: rect.y + window.scrollY,
          width: rect.width,
          height: rect.height,
          dpr: window.devicePixelRatio || 1,
        };
      })()`,
      returnByValue: true,
    });

    const value = rect.result?.value;
    if (!value || !value.visible || value.width <= 0 || value.height <= 0) {
      throw new Error(`Element not visible for selector: ${selector}`);
    }

    const result = await cdp.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      clip: {
        x: Number(value.x),
        y: Number(value.y),
        width: Number(value.width),
        height: Number(value.height),
        scale: Number(value.dpr || 1),
      },
    });

    writeFileSync(outPath, Buffer.from(result.data, "base64"));
    return { path: outPath, selector, width: value.width, height: value.height };
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

export default function browserToolsExtension(pi: ExtensionAPI) {
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
    name: "browser_tabs",
    label: "Browser Tabs",
    description: "List/open/switch/close browser tabs and windows.",
    promptSnippet: "Use browser_tabs to manage CDP tabs: list, open, switch, or close.",
    parameters: Type.Object({
      action: Type.Union([
        Type.Literal("list"),
        Type.Literal("open"),
        Type.Literal("switch"),
        Type.Literal("close"),
      ], { description: "Operation to perform." }),
      url: Type.Optional(Type.String({ description: "URL to open when action=open." })),
      targetId: Type.Optional(Type.String({ description: "Target id for switch/close." })),
      index: Type.Optional(Type.Number({ description: "Tab index for switch/close (in current list order)." })),
    }),
    async execute(_id, params) {
      const result = await browserTabs(params.action, params);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_new_tab",
    label: "Browser New Tab",
    description: "Open a new tab (optionally with URL).",
    promptSnippet: "Use browser_new_tab when you need a fresh tab context.",
    parameters: Type.Object({
      url: Type.Optional(Type.String({ description: "Optional URL to open in the new tab." })),
    }),
    async execute(_id, params) {
      const result = await browserNewTab(params.url);
      return { content: [{ type: "text", text: `Opened tab ${result.targetId}.` }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_list_tabs",
    label: "Browser List Tabs",
    description: "List all currently open tabs/pages.",
    promptSnippet: "Use browser_list_tabs to inspect tabs before switching or closing.",
    parameters: Type.Object({}),
    async execute() {
      const result = await browserListTabs();
      return { content: [{ type: "text", text: `Found ${result.tabs?.length || 0} tab(s).` }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_switch_tab",
    label: "Browser Switch Tab",
    description: "Switch active tab by targetId or index.",
    promptSnippet: "Use browser_switch_tab when you need to continue in a specific tab.",
    parameters: Type.Object({
      targetId: Type.Optional(Type.String({ description: "Target id for switch action." })),
      index: Type.Optional(Type.Number({ description: "Tab index from browser_list_tabs order." })),
    }),
    async execute(_id, params) {
      const result = await browserSwitchTab({ targetId: params.targetId, index: params.index });
      return { content: [{ type: "text", text: `Switched to ${result.targetId}.` }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_close_tab",
    label: "Browser Close Tab",
    description: "Close a tab by targetId or index.",
    promptSnippet: "Use browser_close_tab to remove a tab no longer needed.",
    parameters: Type.Object({
      targetId: Type.Optional(Type.String({ description: "Target id for close action." })),
      index: Type.Optional(Type.Number({ description: "Tab index from browser_list_tabs order." })),
    }),
    async execute(_id, params) {
      const result = await browserCloseTab({ targetId: params.targetId, index: params.index });
      return { content: [{ type: "text", text: `Closed ${result.targetId}.` }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_click",
    label: "Browser Click",
    description: "Click an element by CSS selector on the current tab.",
    promptSnippet: "Use browser_click with a CSS selector to perform a deterministic click.",
    parameters: Type.Object({
      selector: Type.String({ description: "CSS selector for clickable element." }),
    }),
    async execute(_id, params) {
      const click = await browserClick(params.selector);
      return { content: [{ type: "text", text: `Clicked ${params.selector} at (${click.x}, ${click.y})` }], details: click };
    },
  });

  pi.registerTool({
    name: "browser_type",
    label: "Browser Type",
    description: "Type text into an input, textarea, or contenteditable on the current tab.",
    promptSnippet: "Use browser_type to fill form fields reliably.",
    parameters: Type.Object({
      selector: Type.String({ description: "CSS selector for input element." }),
      text: Type.String({ description: "Text to type." }),
      clear: Type.Optional(Type.Boolean({ description: "Clear existing value first. Default true." })),
      delay: Type.Optional(Type.Number({ description: "Delay between keystrokes in ms. Default 0.", minimum: 0 })),
    }),
    async execute(_id, params) {
      const typed = await browserType(params.selector, params.text, { clear: params.clear ?? true, delay: params.delay ?? 0 });
      return { content: [{ type: "text", text: `Typed ${params.text.length} character(s) into ${params.selector}.` }], details: typed };
    },
  });

  pi.registerTool({
    name: "browser_submit",
    label: "Browser Submit",
    description: "Submit a form by selector (form or form control inside it).",
    promptSnippet: "Use browser_submit for deterministic form submits.",
    parameters: Type.Object({
      selector: Type.String({ description: "Selector for form or control inside a form." }),
    }),
    async execute(_id, params) {
      const payload = await browserSubmit(params.selector);
      return { content: [{ type: "text", text: `Submitted form ${payload.id || payload.action}.` }], details: payload };
    },
  });

  pi.registerTool({
    name: "browser_press_key",
    label: "Browser Press Key",
    description: "Dispatch a keyboard event sequence to active or specified element.",
    promptSnippet: "Use browser_press_key when interaction requires key presses.",
    parameters: Type.Object({
      key: Type.String({ description: "Keyboard key or text character to dispatch." }),
      selector: Type.Optional(Type.String({ description: "Optional selector to focus before dispatching key." })),
    }),
    async execute(_id, params) {
      const payload = await browserPressKey(params.key, params.selector);
      return { content: [{ type: "text", text: `Dispatched key ${payload.key}.` }], details: payload };
    },
  });

  pi.registerTool({
    name: "browser_upload_file",
    label: "Browser Upload File",
    description: "Attach file path(s) to a file input element.",
    promptSnippet: "Use browser_upload_file to attach file(s) before submitting forms.",
    parameters: Type.Object({
      selector: Type.String({ description: "CSS selector for file input element." }),
      files: Type.Array(Type.String(), { description: "Absolute file paths to attach." }),
    }),
    async execute(_id, params) {
      const payload = await browserUploadFile(params.selector, params.files);
      return { content: [{ type: "text", text: `Attached ${payload.files.length} file(s) to ${params.selector}.` }], details: payload };
    },
  });

  pi.registerTool({
    name: "browser_get_select_options",
    label: "Browser Get Select Options",
    description: "Get select input options and metadata.",
    promptSnippet: "Use browser_get_select_options for deterministic select introspection.",
    parameters: Type.Object({
      selector: Type.String({ description: "CSS selector for select element." }),
    }),
    async execute(_id, params) {
      const payload = await browserGetSelectOptions(params.selector);
      return { content: [{ type: "text", text: `Select ${params.selector} has ${payload.optionCount} options.` }], details: payload };
    },
  });

  pi.registerTool({
    name: "browser_get_forms",
    label: "Browser Get Forms",
    description: "List page forms and their field metadata.",
    promptSnippet: "Use browser_get_forms for deterministic form inspection.",
    parameters: Type.Object({}),
    async execute() {
      const payload = await browserGetForms();
      return { content: [{ type: "text", text: `Found ${payload.count} form(s).` }], details: payload };
    },
  });

  pi.registerTool({
    name: "browser_wait",
    label: "Browser Wait",
    description: "Wait for milliseconds, or wait until selector/text appears.",
    promptSnippet: "Use browser_wait for explicit waits and simple selector/text readiness checks.",
    parameters: Type.Object({
      ms: Type.Optional(Type.Number({ description: "Minimum wait duration in milliseconds. Default 1000.", minimum: 0, maximum: 120000 })),
      selector: Type.Optional(Type.String({ description: "Optional selector to wait for." })),
      text: Type.Optional(Type.String({ description: "Optional text snippet to wait for in the page body." })),
    }),
    async execute(_id, params) {
      const result = await browserWait(params.ms ?? 1000, params.selector, params.text);
      const status = result.matched ? "condition met" : "timeout";
      return { content: [{ type: "text", text: `Wait complete (${status}).` }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_wait_for_selector",
    label: "Browser Wait For Selector",
    description: "Wait until a selector appears in the DOM.",
    promptSnippet: "Use browser_wait_for_selector when you need a deterministic selector appearance signal.",
    parameters: Type.Object({
      selector: Type.String({ description: "CSS selector to wait for." }),
      ms: Type.Optional(Type.Number({ description: "Maximum wait duration in milliseconds. Default 1000.", minimum: 0, maximum: 120000 })),
    }),
    async execute(_id, params) {
      const result = await browserWaitForSelector(params.selector, params.ms ?? 1000);
      return { content: [{ type: "text", text: `Selector wait ${result.matched ? 'passed' : 'timed out'}.` }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_wait_for_text",
    label: "Browser Wait For Text",
    description: "Wait until text appears in document body.",
    promptSnippet: "Use browser_wait_for_text for deterministic text appearance waits.",
    parameters: Type.Object({
      text: Type.String({ description: "Text snippet to wait for." }),
      ms: Type.Optional(Type.Number({ description: "Maximum wait duration in milliseconds. Default 1000.", minimum: 0, maximum: 120000 })),
    }),
    async execute(_id, params) {
      const result = await browserWaitForText(params.text, params.ms ?? 1000);
      return { content: [{ type: "text", text: `Text wait ${result.matched ? 'passed' : 'timed out'}.` }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_wait_for_load_state",
    label: "Browser Wait For Load State",
    description: "Wait for a document load milestone or network-idle style state.",
    promptSnippet: "Use browser_wait_for_load_state with 'domcontentloaded', 'load', or 'networkidle0'.",
    parameters: Type.Object({
      state: Type.Union([
        Type.Literal("load"),
        Type.Literal("domcontentloaded"),
        Type.Literal("networkidle0"),
      ], { description: "Load state to wait for." }),
      ms: Type.Optional(Type.Number({ description: "Maximum wait duration in milliseconds. Default 1000.", minimum: 0, maximum: 120000 })),
    }),
    async execute(_id, params) {
      const result = await browserWaitForLoadState(params.state, params.ms ?? 1000);
      return { content: [{ type: "text", text: `Load state ${result.state} ${result.matched ? 'ready' : 'timed out'}.` }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_console",
    label: "Browser Console",
    description: "Capture recent browser console messages and exceptions.",
    promptSnippet: "Use browser_console to collect log/warn/error messages and console exceptions.",
    parameters: Type.Object({
      ms: Type.Optional(Type.Number({ description: "Capture duration in milliseconds. Default 1000.", minimum: 0, maximum: 120000 })),
      level: Type.Optional(Type.Union([
        Type.Literal("all"),
        Type.Literal("log"),
        Type.Literal("warning"),
        Type.Literal("error"),
        Type.Literal("info"),
      ], { description: "Filter console level. Default: all." })),
      filter: Type.Optional(Type.String({ description: "Optional substring to include only matching console lines." })),
    }),
    async execute(_id, params) {
      const result = await browserConsole(params.ms ?? 1000, params.level || "all", params.filter);
      return { content: [{ type: "text", text: `Captured ${result.count} console entries.` }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_scroll",
    label: "Browser Scroll",
    description: "Scroll page viewport (bottom/top/by pixels/into selector).",
    promptSnippet: "Use browser_scroll to move viewport position deterministically.",
    parameters: Type.Object({
      kind: Type.Union([
        Type.Literal("top"),
        Type.Literal("bottom"),
        Type.Literal("selector"),
        Type.Literal("by"),
      ], { description: "Scroll direction/type." }),
      selector: Type.Optional(Type.String({ description: "Selector target when kind='selector'." })),
      x: Type.Optional(Type.Number({ description: "X delta or target x coordinate for kind='by'." })),
      y: Type.Optional(Type.Number({ description: "Y delta or target y coordinate for kind='by'." })),
    }),
    async execute(_id, params) {
      const result = await browserScroll(params.kind, {
        selector: params.selector,
        x: params.x,
        y: params.y,
      });
      return { content: [{ type: "text", text: `Scrolled: ${result.kind}.` }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_scroll_to_selector",
    label: "Browser Scroll To Selector",
    description: "Scroll until a selector enters viewport bounds.",
    promptSnippet: "Use browser_scroll_to_selector when you need a section visible before interaction.",
    parameters: Type.Object({
      selector: Type.String({ description: "CSS selector to reveal." }),
    }),
    async execute(_id, params) {
      const result = await browserScrollToSelector(params.selector);
      return { content: [{ type: "text", text: `Scrolled to selector ${params.selector}.` }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_clear_console_logs",
    label: "Browser Clear Console Logs",
    description: "Trigger console.clear() on the current page.",
    promptSnippet: "Use browser_clear_console_logs if you need a fresh browser console trace window.",
    parameters: Type.Object({}),
    async execute() {
      const result = await browserClearConsoleLogs();
      return { content: [{ type: "text", text: "Browser console cleared." }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_network",
    label: "Browser Network",
    description: "Capture recent network requests for the active tab.",
    promptSnippet: "Use browser_network to capture url/method/status/type/size for a short interval.",
    parameters: Type.Object({
      ms: Type.Optional(Type.Number({ description: "Capture duration in milliseconds. Default 1000.", minimum: 0, maximum: 120000 })),
      method: Type.Optional(Type.String({ description: "Optional HTTP method filter (e.g., GET, POST)." })),
      urlContains: Type.Optional(Type.String({ description: "Optional substring filter for request URL." })),
      onlyErrors: Type.Optional(Type.Boolean({ description: "Only include failed requests." })),
    }),
    async execute(_id, params) {
      const result = await browserNetwork(params.ms ?? 1000, {
        method: params.method,
        urlContains: params.urlContains,
        onlyErrors: params.onlyErrors,
      });
      return { content: [{ type: "text", text: `Captured ${result.total} network events.` }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_wait_for_network_idle",
    label: "Browser Wait For Network Idle",
    description: "Wait until there are no currently active network requests.",
    promptSnippet: "Use browser_wait_for_network_idle for deterministic API-idle waits.",
    parameters: Type.Object({
      ms: Type.Optional(Type.Number({ description: "Maximum wait duration in milliseconds. Default 1000.", minimum: 0, maximum: 120000 })),
    }),
    async execute(_id, params) {
      const result = await browserWaitForNetworkIdle(params.ms ?? 1000);
      return { content: [{ type: "text", text: `Network idle wait ${result.matched ? 'ready' : 'timed out'}.` }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_wait_for_invisible",
    label: "Browser Wait For Invisible",
    description: "Wait until selector is missing or no longer visible.",
    promptSnippet: "Use browser_wait_for_invisible when overlay loaders should disappear.",
    parameters: Type.Object({
      selector: Type.String({ description: "CSS selector to wait to disappear." }),
      ms: Type.Optional(Type.Number({ description: "Maximum wait duration in milliseconds. Default 1000.", minimum: 0, maximum: 120000 })),
    }),
    async execute(_id, params) {
      const result = await browserWaitForSelectorDisappearance(params.selector, params.ms ?? 1000);
      return { content: [{ type: "text", text: `Selector invisible ${result.matched ? 'ready' : 'timed out'}.` }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_get_network_log",
    label: "Browser Network Log",
    description: "Get recent network calls with optional filters for method/url.",
    promptSnippet: "Use browser_get_network_log for a short captured network summary.",
    parameters: Type.Object({
      ms: Type.Optional(Type.Number({ description: "Capture duration in milliseconds. Default 1000.", minimum: 0, maximum: 120000 })),
      method: Type.Optional(Type.String({ description: "Optional HTTP method filter (e.g., GET, POST)." })),
      urlContains: Type.Optional(Type.String({ description: "Optional URL substring filter." })),
      onlyErrors: Type.Optional(Type.Boolean({ description: "Only include failed requests." })),
    }),
    async execute(_id, params) {
      const result = await browserGetNetworkLog(params.ms ?? 1000, {
        method: params.method,
        urlContains: params.urlContains,
        onlyErrors: params.onlyErrors,
      });
      return { content: [{ type: "text", text: `Network log captured ${result.total} event(s).` }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_network_start",
    label: "Browser Network Start",
    description: "Start continuous network capture for later retrieval via browser_get_network_log.",
    promptSnippet: "Start background network logging when you need persistent capture across steps.",
    parameters: Type.Object({}),
    async execute() {
      const result = await browserNetworkStart();
      return { content: [{ type: "text", text: `Network capture ${result.status}.` }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_network_stop",
    label: "Browser Network Stop",
    description: "Stop continuous network capture and return summary metadata.",
    promptSnippet: "Stop active background network capture before switching flows.",
    parameters: Type.Object({}),
    async execute() {
      const result = await browserNetworkStop();
      return { content: [{ type: "text", text: `Network capture ${result.status}.` }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_network_clear",
    label: "Browser Network Clear",
    description: "Clear buffered network events from active background capture.",
    promptSnippet: "Clear in-memory network log between test phases.",
    parameters: Type.Object({}),
    async execute() {
      const result = await browserNetworkClear();
      return { content: [{ type: "text", text: result.status === "cleared" ? `Network log cleared (${result.removed}).` : `Network capture ${result.status}.` }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_cookie_jar",
    label: "Browser Cookie Jar",
    description: "List, set, and delete cookies for current page domain via document.cookie.",
    promptSnippet: "Use browser_cookie_jar to read or mutate document cookies.",
    parameters: Type.Object({
      action: Type.Union([
        Type.Literal("list"),
        Type.Literal("set"),
        Type.Literal("delete"),
      ], { description: "Cookie action." }),
      name: Type.Optional(Type.String({ description: "Cookie name for set/delete." })),
      value: Type.Optional(Type.String({ description: "Cookie value for set." })),
      path: Type.Optional(Type.String({ description: "Cookie path for set/delete (default '/')." })),
    }),
    async execute(_id, params) {
      const result = await browserCookieJar(params.action, {
        name: params.name,
        value: params.value,
        path: params.path,
      });
      return { content: [{ type: "text", text: `Cookie action ${result.action} completed.` }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_get_cookies",
    label: "Browser Get Cookies",
    description: "Read all cookies for current page URL/domain.",
    promptSnippet: "Use browser_get_cookies for full cookie metadata.",
    parameters: Type.Object({}),
    async execute() {
      const result = await browserGetCookies();
      return { content: [{ type: "text", text: `Found ${result.count} cookie(s).` }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_set_cookie",
    label: "Browser Set Cookie",
    description: "Set a cookie on the current page context.",
    promptSnippet: "Use browser_set_cookie with name/value for deterministic authentication flows.",
    parameters: Type.Object({
      name: Type.String({ description: "Cookie name." }),
      value: Type.String({ description: "Cookie value." }),
      url: Type.Optional(Type.String({ description: "Optional URL override (defaults to current page URL)." })),
      path: Type.Optional(Type.String({ description: "Cookie path (default '/')." })),
      secure: Type.Optional(Type.Boolean({ description: "Set secure flag." })),
      httpOnly: Type.Optional(Type.Boolean({ description: "Set HttpOnly flag." })),
      sameSite: Type.Optional(Type.Union([
        Type.Literal("Strict"),
        Type.Literal("Lax"),
        Type.Literal("None"),
      ], { description: "SameSite value." })),
      expires: Type.Optional(Type.Number({ description: "UNIX epoch seconds for expiry." })),
    }),
    async execute(_id, params) {
      const result = await browserSetCookie(params.name, params.value, {
        url: params.url,
        path: params.path,
        secure: params.secure,
        httpOnly: params.httpOnly,
        sameSite: params.sameSite,
        expires: params.expires,
      });
      return { content: [{ type: "text", text: `Set cookie ${result.name}.` }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_clear_cookies",
    label: "Browser Clear Cookies",
    description: "Clear all browser cookies from current profile session.",
    promptSnippet: "Use browser_clear_cookies to reset cookie state.",
    parameters: Type.Object({}),
    async execute() {
      const result = await browserClearCookies();
      return { content: [{ type: "text", text: result.cleared ? "Cookies cleared." : "No cookies were cleared." }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_set_viewport",
    label: "Browser Set Viewport",
    description: "Set viewport size/device scale or clear custom viewport override.",
    promptSnippet: "Use browser_set_viewport before screenshots for deterministic sizing.",
    parameters: Type.Object({
      width: Type.Optional(Type.Number({ description: "Viewport width in CSS pixels." })),
      height: Type.Optional(Type.Number({ description: "Viewport height in CSS pixels." })),
      deviceScaleFactor: Type.Optional(Type.Number({ description: "Device scale factor. Default: 1." })),
      mobile: Type.Optional(Type.Boolean({ description: "Enable mobile viewport heuristics." })),
    }),
    async execute(_id, params) {
      const result = await browserSetViewport(
        params.width,
        params.height,
        params.deviceScaleFactor || 1,
        params.mobile || false,
      );
      return { content: [{ type: "text", text: result.action === "clear" ? "Viewport override cleared." : `Viewport set to ${result.width}x${result.height}.` }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_get_html",
    label: "Browser Get HTML",
    description: "Return full page HTML, or element HTML by selector.",
    promptSnippet: "Use browser_get_html to extract DOM HTML for assertions and audits.",
    parameters: Type.Object({
      selector: Type.Optional(Type.String({ description: "Optional selector to capture element HTML." })),
    }),
    async execute(_id, params) {
      const result = await browserGetHtml(params.selector);
      return { content: [{ type: "text", text: `Returned HTML length: ${result.length}` }], details: result };
    },
  });

  pi.registerTool({
    name: "browser_get_element",
    label: "Browser Get Element",
    description: "Extract text, attributes, value, and href from a selected element.",
    promptSnippet: "Use browser_get_element to inspect a single DOM node.",
    parameters: Type.Object({
      selector: Type.String({ description: "CSS selector for target element." }),
      mode: Type.Optional(Type.Union([
        Type.Literal("text"),
        Type.Literal("attributes"),
        Type.Literal("value"),
        Type.Literal("href"),
        Type.Literal("all"),
      ], { description: "What to return from the element. Default: all." })),
    }),
    async execute(_id, params) {
      const payload = await browserGetElement(params.selector, params.mode || "all");
      return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }], details: payload };
    },
  });

  pi.registerTool({
    name: "browser_get_element_text",
    label: "Browser Get Element Text",
    description: "Extract only text content from a selected element.",
    promptSnippet: "Use browser_get_element_text for a quick text-only capture.",
    parameters: Type.Object({
      selector: Type.String({ description: "CSS selector for target element." }),
    }),
    async execute(_id, params) {
      const payload = await browserGetElementText(params.selector);
      return { content: [{ type: "text", text: String(payload?.text || "") }], details: payload };
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
    name: "browser_element_screenshot",
    label: "Browser Element Screenshot",
    description: "Capture a screenshot for a single DOM element by selector.",
    promptSnippet: "Use browser_element_screenshot when you need visual QA around one control or region.",
    parameters: Type.Object({
      selector: Type.String({ description: "CSS selector for target element." }),
      path: Type.Optional(Type.String({ description: "Optional output path relative to cwd, e.g. .pi/browser-screenshots/field.png. Defaults to a timestamped PNG." })),
      fullPage: Type.Optional(Type.Boolean({ description: "If true, keep current viewport metrics while capturing selector." })),
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const payload = await browserElementScreenshot(params.selector, { filePath: params.path, fullPage: !!params.fullPage, cwd: ctx.cwd });
      return {
        content: [{ type: "text", text: `Element screenshot saved: ${payload.path}` }],
        details: payload,
      };
    },
  });

  pi.registerTool({
    name: "browser_take_element_screenshot",
    label: "Browser Take Element Screenshot",
    description: "Alias for browser_element_screenshot.",
    promptSnippet: "Use browser_take_element_screenshot for familiar naming while capturing one element.",
    parameters: Type.Object({
      selector: Type.String({ description: "CSS selector for target element." }),
      path: Type.Optional(Type.String({ description: "Optional output path relative to cwd, e.g. .pi/browser-screenshots/field.png. Defaults to a timestamped PNG." })),
      fullPage: Type.Optional(Type.Boolean({ description: "If true, keep current viewport metrics while capturing selector." })),
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const payload = await browserElementScreenshot(params.selector, { filePath: params.path, fullPage: !!params.fullPage, cwd: ctx.cwd });
      return {
        content: [{ type: "text", text: `Element screenshot saved: ${payload.path}` }],
        details: payload,
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

  pi.registerCommand("browser-tools", {
    description: "Show browser tool integration status",
    handler: async (_args, ctx) => {
      ctx.ui.notify(`Browser tools registered. CDP: ${CDP_HOST}`, "info");
    },
  });
}
