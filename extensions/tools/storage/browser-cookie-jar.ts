import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserCookieJar(pi: any) {
  registerLegacyTool(pi, "browser_cookie_jar");
}
