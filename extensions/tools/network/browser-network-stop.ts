import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserNetworkStop(pi: any) {
  registerLegacyTool(pi, "browser_network_stop");
}
