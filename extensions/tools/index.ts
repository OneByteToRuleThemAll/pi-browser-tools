import registerBrowserOpenUrl from "./navigation/browser-open-url.ts";
import registerBrowserSnapshot from "./navigation/browser-snapshot.ts";
import registerBrowserEval from "./navigation/browser-eval.ts";
import registerBrowserWait from "./navigation/browser-wait.ts";
import registerBrowserWaitForSelector from "./navigation/browser-wait-for-selector.ts";
import registerBrowserWaitForText from "./navigation/browser-wait-for-text.ts";
import registerBrowserWaitForLoadState from "./navigation/browser-wait-for-load-state.ts";
import registerBrowserWaitForNetworkIdle from "./navigation/browser-wait-for-network-idle.ts";
import registerBrowserWaitForInvisible from "./navigation/browser-wait-for-invisible.ts";
import registerBrowserGoogleSearch from "./navigation/browser-google-search.ts";

import registerBrowserTabs from "./tabs/browser-tabs.ts";
import registerBrowserNewTab from "./tabs/browser-new-tab.ts";
import registerBrowserListTabs from "./tabs/browser-list-tabs.ts";
import registerBrowserSwitchTab from "./tabs/browser-switch-tab.ts";
import registerBrowserCloseTab from "./tabs/browser-close-tab.ts";

import registerBrowserClick from "./interaction/browser-click.ts";
import registerBrowserType from "./interaction/browser-type.ts";
import registerBrowserPressKey from "./interaction/browser-press-key.ts";
import registerBrowserSubmit from "./interaction/browser-submit.ts";
import registerBrowserScroll from "./interaction/browser-scroll.ts";
import registerBrowserScrollToSelector from "./interaction/browser-scroll-to-selector.ts";
import registerBrowserUploadFile from "./interaction/browser-upload-file.ts";
import registerBrowserGetSelectOptions from "./interaction/browser-get-select-options.ts";

import registerBrowserGetHtml from "./extraction/browser-get-html.ts";
import registerBrowserGetElement from "./extraction/browser-get-element.ts";
import registerBrowserGetElementText from "./extraction/browser-get-element-text.ts";
import registerBrowserGetForms from "./extraction/browser-get-forms.ts";

import registerBrowserConsole from "./observability/browser-console.ts";
import registerBrowserClearConsoleLogs from "./observability/browser-clear-console-logs.ts";

import registerBrowserNetwork from "./network/browser-network.ts";
import registerBrowserGetNetworkLog from "./network/browser-get-network-log.ts";
import registerBrowserNetworkStart from "./network/browser-network-start.ts";
import registerBrowserNetworkStop from "./network/browser-network-stop.ts";
import registerBrowserNetworkClear from "./network/browser-network-clear.ts";

import registerBrowserCookieJar from "./storage/browser-cookie-jar.ts";
import registerBrowserGetCookies from "./storage/browser-get-cookies.ts";
import registerBrowserSetCookie from "./storage/browser-set-cookie.ts";
import registerBrowserClearCookies from "./storage/browser-clear-cookies.ts";
import registerBrowserSetViewport from "./storage/browser-set-viewport.ts";

import registerBrowserScreenshot from "./screenshot/browser-screenshot.ts";
import registerBrowserElementScreenshot from "./screenshot/browser-element-screenshot.ts";
import registerBrowserTakeElementScreenshot from "./screenshot/browser-take-element-screenshot.ts";

const CDP_PORT = Number(process.env.PI_BROWSER_CDP_PORT || 9224);
const CDP_HOST = `http://127.0.0.1:${CDP_PORT}`;

export default function registerAllBrowserTools(pi: any) {
  registerBrowserOpenUrl(pi);
  registerBrowserSnapshot(pi);
  registerBrowserEval(pi);
  registerBrowserWait(pi);
  registerBrowserWaitForSelector(pi);
  registerBrowserWaitForText(pi);
  registerBrowserWaitForLoadState(pi);
  registerBrowserWaitForNetworkIdle(pi);
  registerBrowserWaitForInvisible(pi);
  registerBrowserGoogleSearch(pi);

  registerBrowserTabs(pi);
  registerBrowserNewTab(pi);
  registerBrowserListTabs(pi);
  registerBrowserSwitchTab(pi);
  registerBrowserCloseTab(pi);

  registerBrowserClick(pi);
  registerBrowserType(pi);
  registerBrowserPressKey(pi);
  registerBrowserSubmit(pi);
  registerBrowserScroll(pi);
  registerBrowserScrollToSelector(pi);
  registerBrowserUploadFile(pi);
  registerBrowserGetSelectOptions(pi);

  registerBrowserGetHtml(pi);
  registerBrowserGetElement(pi);
  registerBrowserGetElementText(pi);
  registerBrowserGetForms(pi);

  registerBrowserConsole(pi);
  registerBrowserClearConsoleLogs(pi);

  registerBrowserNetwork(pi);
  registerBrowserGetNetworkLog(pi);
  registerBrowserNetworkStart(pi);
  registerBrowserNetworkStop(pi);
  registerBrowserNetworkClear(pi);

  registerBrowserCookieJar(pi);
  registerBrowserGetCookies(pi);
  registerBrowserSetCookie(pi);
  registerBrowserClearCookies(pi);
  registerBrowserSetViewport(pi);

  registerBrowserScreenshot(pi);
  registerBrowserElementScreenshot(pi);
  registerBrowserTakeElementScreenshot(pi);

  pi.registerCommand?.("browser-tools", {
    description: "Show browser tool integration status",
    handler: async (_args: unknown, ctx: any) => {
      ctx.ui.notify(`Browser tools registered. CDP: ${CDP_HOST}`, "info");
    },
  });
}
