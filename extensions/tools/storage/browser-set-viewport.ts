import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserSetViewport(pi: any) {
  registerLegacyTool(pi, "browser_set_viewport");
}
