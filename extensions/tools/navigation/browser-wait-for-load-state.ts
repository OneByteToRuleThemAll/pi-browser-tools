import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserWaitForLoadState(pi: any) {
  registerLegacyTool(pi, "browser_wait_for_load_state");
}
