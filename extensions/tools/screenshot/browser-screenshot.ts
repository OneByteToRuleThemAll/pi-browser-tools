import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserScreenshot(pi: any) {
  registerLegacyTool(pi, "browser_screenshot");
}
