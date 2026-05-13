import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserTakeElementScreenshot(pi: any) {
  registerLegacyTool(pi, "browser_take_element_screenshot");
}
