import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserCloseTab(pi: any) {
  registerLegacyTool(pi, "browser_close_tab");
}
