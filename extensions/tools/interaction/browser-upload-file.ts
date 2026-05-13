import { registerLegacyTool } from "../legacy/legacy-loader.ts";

export default function registerBrowserUploadFile(pi: any) {
  registerLegacyTool(pi, "browser_upload_file");
}
