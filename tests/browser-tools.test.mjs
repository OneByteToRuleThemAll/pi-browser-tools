import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, '..', 'extensions', 'browser-tools-core.ts'), 'utf8');

function has(pattern) {
  return new RegExp(pattern, 's').test(source);
}

function readmeHas(pattern) {
  const readme = readFileSync(join(__dirname, '..', 'README.md'), 'utf8');
  return new RegExp(pattern, 'i').test(readme);
}

test('core phase-2 and phase-3 tools are registered', () => {
  ['browser_open_url', 'browser_snapshot', 'browser_tabs', 'browser_click', 'browser_new_tab', 'browser_switch_tab', 'browser_list_tabs', 'browser_close_tab', 'browser_type', 'browser_press_key', 'browser_upload_file', 'browser_wait', 'browser_wait_for_selector', 'browser_wait_for_text', 'browser_wait_for_load_state', 'browser_wait_for_network_idle', 'browser_wait_for_invisible', 'browser_console', 'browser_network', 'browser_get_network_log', 'browser_network_start', 'browser_network_stop', 'browser_network_clear', 'browser_scroll', 'browser_scroll_to_selector', 'browser_clear_console_logs', 'browser_cookie_jar', 'browser_get_cookies', 'browser_set_cookie', 'browser_clear_cookies', 'browser_set_viewport', 'browser_get_html', 'browser_get_element', 'browser_get_element_text', 'browser_get_select_options', 'browser_get_forms', 'browser_submit', 'browser_element_screenshot', 'browser_take_element_screenshot', 'browser_screenshot'].forEach((name) => {
    assert.match(source, new RegExp(`name: \"${name}\"`), `${name} tool should be registered`);
    assert.match(source, new RegExp(`name: \"${name}\"[\\s\\S]*?description`, 'i'), `${name} should include description`);
  });
});

test('helper functions exist for new tools', () => {
  ['browserTabs', 'browserTabsToDeprecated', 'browserNewTab', 'browserSwitchTab', 'browserCloseTab', 'browserListTabs', 'browserClick', 'browserType', 'browserPressKey', 'browserWait', 'browserWaitForLoadState', 'browserWaitForSelector', 'browserWaitForText', 'browserWaitForNetworkIdle', 'browserWaitForSelectorDisappearance', 'browserGetHtml', 'browserGetElement', 'browserGetElementText', 'browserGetSelectOptions', 'browserSubmit', 'browserGetForms', 'browserConsole', 'browserNetwork', 'browserNetworkStart', 'browserNetworkStop', 'browserNetworkClear', 'browserGetNetworkLog', 'browserScroll', 'browserScrollToSelector', 'browserClearConsoleLogs', 'browserCookieJar', 'browserGetCookies', 'browserSetCookie', 'browserClearCookies', 'browserSetViewport', 'browserElementScreenshot'].forEach((fn) => {
    assert.match(source, new RegExp(`async function ${fn}`), `Expected helper ${fn} to exist`);
  });
});

test('README documents CDP-first scope and new tools', () => {
  assert.match(readFileSync(join(__dirname, '..', 'README.md'), 'utf8'), /CDP-first|deterministic/i, 'README should mention CDP-first scope');
  const tools = ['browser_open_url', 'browser_snapshot', 'browser_tabs', 'browser_new_tab', 'browser_list_tabs', 'browser_switch_tab', 'browser_close_tab', 'browser_click', 'browser_type', 'browser_press_key', 'browser_wait', 'browser_wait_for_selector', 'browser_wait_for_text', 'browser_wait_for_load_state', 'browser_wait_for_network_idle', 'browser_wait_for_invisible', 'browser_console', 'browser_clear_console_logs', 'browser_network', 'browser_get_network_log', 'browser_network_start', 'browser_network_stop', 'browser_network_clear', 'browser_scroll', 'browser_scroll_to_selector', 'browser_cookie_jar', 'browser_get_cookies', 'browser_set_cookie', 'browser_clear_cookies', 'browser_set_viewport', 'browser_get_html', 'browser_get_element', 'browser_get_element_text', 'browser_get_select_options', 'browser_get_forms', 'browser_submit', 'browser_element_screenshot', 'browser_take_element_screenshot', 'browser_eval', 'browser_google_search', 'browser_screenshot'];
  for (const tool of tools) {
    assert(readmeHas('### ' + '`' + tool + '`'), `README should include heading for ${tool}`);
  }
});

test('new behavior messages are documented in code', () => {
  assert.equal(has('No clickable element found for selector'), true);
  assert.equal(has('No editable element found for selector'), true);
  assert.equal(has('Wait complete'), true);
  assert.equal(has('action: "list"'), true);
  assert.equal(has('Captured .* console entries'), true);
  assert.equal(has('Captured .* network events'), true);
  assert.equal(has('Scrolled:'), true);
  assert.equal(has('Cookie action'), true);
  assert.equal(has('Viewport'), true);
  assert.equal(has('Load state'), true);
  assert.equal(has('selector is required for kind=selector'), true);
});
