# Tab Tools

Tools for managing browser tabs/targets.

## browser_tabs
Legacy multi-action helper.

- required: `action` = `list|open|switch|close`
- optional: `url` (for open), `targetId` or `index` (for switch/close)

Use this for compatibility while migrating to explicit tab tools.

## browser_new_tab
Open a new tab.

- optional: `url`
- returns created `targetId` and updated tab list

## browser_list_tabs
Return open tab metadata.

- returns index/id/url/title/type list

## browser_switch_tab
Set active tab.

- required: `targetId` or `index`

## browser_close_tab
Close target tab.

- required: `targetId` or `index`

Tip: active target state is tracked by the shared session module.
