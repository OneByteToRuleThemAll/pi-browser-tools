import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserWaitForInvisible(pi: any) {
  registerLegacyTool(pi, "browser_wait_for_invisible");
}
