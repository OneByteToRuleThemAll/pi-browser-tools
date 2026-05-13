import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserGetForms(pi: any) {
  registerLegacyTool(pi, "browser_get_forms");
}
