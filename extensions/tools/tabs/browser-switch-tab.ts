import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserSwitchTab(pi: any) {
  registerLegacyTool(pi, "browser_switch_tab");
}
