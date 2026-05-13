import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserWaitForSelector(pi: any) {
  registerLegacyTool(pi, "browser_wait_for_selector");
}
