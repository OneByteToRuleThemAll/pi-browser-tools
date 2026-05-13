import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserListTabs(pi: any) {
  registerLegacyTool(pi, "browser_list_tabs");
}
