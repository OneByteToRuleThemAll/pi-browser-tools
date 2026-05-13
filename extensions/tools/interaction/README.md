# Interaction Tools

DOM interaction and input helpers.

## browser_click
Find element center by selector and dispatch click.

- required: `selector`
- returns click coordinates and selector

## browser_type
Type text into an editable control.

- required: `selector`, `text`
- options: `clear` (default true), `delay` between keys

## browser_press_key
Dispatch key event sequence to active/specified element.

- required: `key`
- optional: `selector`

## browser_submit
Submit nearest form for a selector.

- required: `selector`

## browser_scroll
Scroll via modes:

- `top`, `bottom`, `by` (x/y offsets), `selector`

## browser_scroll_to_selector
Scroll element into viewport.

- required: `selector`

## browser_upload_file
Attach one or more local files to file input.

- required: `selector`
- required: `files` (array of strings)

## browser_get_select_options
Read available options from a `<select>`.

- required: `selector`

## browser_get_forms
Collect all page forms and fields metadata.

- no required args
