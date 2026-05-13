import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserElementScreenshot(pi: any) {
  registerLegacyTool(pi, "browser_element_screenshot");
}
