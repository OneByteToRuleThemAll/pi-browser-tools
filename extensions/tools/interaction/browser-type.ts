import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserType(pi: any) {
  registerLegacyTool(pi, "browser_type");
}
