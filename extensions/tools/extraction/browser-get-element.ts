import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserGetElement(pi: any) {
  registerLegacyTool(pi, "browser_get_element");
}
