import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserSnapshot(pi: any) {
  registerLegacyTool(pi, "browser_snapshot");
}
