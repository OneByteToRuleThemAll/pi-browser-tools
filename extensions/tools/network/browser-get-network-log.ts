import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserGetNetworkLog(pi: any) {
  registerLegacyTool(pi, "browser_get_network_log");
}
