import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserNewTab(pi: any) {
  registerLegacyTool(pi, "browser_new_tab");
}
