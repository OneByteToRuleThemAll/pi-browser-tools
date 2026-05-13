import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserPressKey(pi: any) {
  registerLegacyTool(pi, "browser_press_key");
}
