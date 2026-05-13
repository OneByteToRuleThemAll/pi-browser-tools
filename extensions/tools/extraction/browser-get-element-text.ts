import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserGetElementText(pi: any) {
  registerLegacyTool(pi, "browser_get_element_text");
}
