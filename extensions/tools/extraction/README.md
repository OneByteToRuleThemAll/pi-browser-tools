# Extraction Tools

DOM content extraction and structured reading utilities.

## browser_get_html
Return page HTML.

- optional: `selector` for element HTML

## browser_get_element
Get selected element data by `mode`:

- `text`, `attributes`, `value`, `href`, `all`

## browser_get_element_text
Convenience to return `textContent`.

- required: `selector`

## browser_get_forms
Return all form metadata and fields.

- no required args
