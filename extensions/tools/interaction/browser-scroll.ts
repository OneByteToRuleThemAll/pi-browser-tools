import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserScroll(pi: any) {
  registerLegacyTool(pi, "browser_scroll");
}
