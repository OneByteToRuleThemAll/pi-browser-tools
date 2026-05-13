import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserScrollToSelector(pi: any) {
  registerLegacyTool(pi, "browser_scroll_to_selector");
}
