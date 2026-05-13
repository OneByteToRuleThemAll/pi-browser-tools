import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserOpenUrl(pi: any) {
  registerLegacyTool(pi, "browser_open_url");
}
