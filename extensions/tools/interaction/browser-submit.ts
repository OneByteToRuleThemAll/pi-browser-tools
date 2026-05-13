import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserSubmit(pi: any) {
  registerLegacyTool(pi, "browser_submit");
}
