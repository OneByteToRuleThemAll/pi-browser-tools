import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserGoogleSearch(pi: any) {
  registerLegacyTool(pi, "browser_google_search");
}
