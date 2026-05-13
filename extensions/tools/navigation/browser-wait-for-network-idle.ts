import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserWaitForNetworkIdle(pi: any) {
  registerLegacyTool(pi, "browser_wait_for_network_idle");
}
