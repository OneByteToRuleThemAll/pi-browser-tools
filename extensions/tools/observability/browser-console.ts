import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserConsole(pi: any) {
  registerLegacyTool(pi, "browser_console");
}
