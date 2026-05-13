import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserGetCookies(pi: any) {
  registerLegacyTool(pi, "browser_get_cookies");
}
