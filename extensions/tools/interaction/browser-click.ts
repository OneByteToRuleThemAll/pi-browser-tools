import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserClick(pi: any) {
  registerLegacyTool(pi, "browser_click");
}
