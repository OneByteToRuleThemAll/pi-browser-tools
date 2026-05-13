import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserClearCookies(pi: any) {
  registerLegacyTool(pi, "browser_clear_cookies");
}
