import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserWaitForText(pi: any) {
  registerLegacyTool(pi, "browser_wait_for_text");
}
