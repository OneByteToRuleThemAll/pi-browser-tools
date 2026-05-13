import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserNetworkClear(pi: any) {
  registerLegacyTool(pi, "browser_network_clear");
}
