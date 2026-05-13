import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserNetwork(pi: any) {
  registerLegacyTool(pi, "browser_network");
}
