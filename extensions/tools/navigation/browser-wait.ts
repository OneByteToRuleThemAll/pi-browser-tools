import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserWait(pi: any) {
  registerLegacyTool(pi, "browser_wait");
}
