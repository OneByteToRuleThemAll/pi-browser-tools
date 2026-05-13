import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserGetSelectOptions(pi: any) {
  registerLegacyTool(pi, "browser_get_select_options");
}
