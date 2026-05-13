import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserClearConsoleLogs(pi: any) {
  registerLegacyTool(pi, "browser_clear_console_logs");
}
