import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserNetworkStart(pi: any) {
  registerLegacyTool(pi, "browser_network_start");
}
