import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserTabs(pi: any) {
  registerLegacyTool(pi, "browser_tabs");
}
