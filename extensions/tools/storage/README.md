# Storage / Session Tools

Cookie and storage-oriented helpers.

## browser_cookie_jar
Action-oriented cookie helper.

- action: `list | set | delete`
- accepts per-domain/domain-less filters

## browser_get_cookies
Return all cookies for current context.

- no args

## browser_set_cookie
Set cookie by `name`/`value`.

- required: `name`
- optional: `value` and attribute options (`path`, `expires`, `httpOnly`, etc.)

## browser_clear_cookies
Clear all session cookies.

- no args

## browser_set_viewport
Set deterministic viewport.

- required: `width`, `height`
- optional: `deviceScaleFactor`
