# Screenshot Tools

Capture raster outputs for assertions and artifacts.

## browser_screenshot
Full-page/page viewport screenshot.

- optional: `path`, `fullPage`, `quality`, `type`

## browser_element_screenshot
Capture a single DOM element.

- required: `selector`
- optional: `path`, `quality`, `type`

## browser_take_element_screenshot
Alias to `browser_element_screenshot`.

- supports same params
