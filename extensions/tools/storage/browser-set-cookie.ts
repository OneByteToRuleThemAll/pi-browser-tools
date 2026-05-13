import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserSetCookie(pi: any) {
  registerLegacyTool(pi, "browser_set_cookie");
}
