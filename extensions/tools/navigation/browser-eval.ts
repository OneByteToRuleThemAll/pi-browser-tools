import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserEval(pi: any) {
  registerLegacyTool(pi, "browser_eval");
}
