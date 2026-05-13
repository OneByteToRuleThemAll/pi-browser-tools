import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserGetHtml(pi: any) {
  registerLegacyTool(pi, "browser_get_html");
}
