# Next.js + DNA Injector Sample

This is a sample Next.js 14 application with the oobee-genome integrated.

## Setup

```bash
cd samples/next-js
npm install
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build

```bash
npm run build
npm start
```

## Configuration

The DNA injector is configured in `next.config.js`:

```javascript
const { withOobeeDNA } = require("@govtechsg/oobee-genome/adapters/next");

const nextConfig = {
  reactStrictMode: true,
};

module.exports = withOobeeDNA(nextConfig, {
  verbose: true,
  enabled: true,
});
```

## Inspecting DNA Attributes

1. Open DevTools (F12 or Cmd+Opt+I)
2. Inspect any element on the page
3. Look for `data-oobee-*` attributes:
   - `data-oobee-path` - Source file path
   - `data-oobee-line` - Line number in the file
   - `data-oobee-column` - Column number in the file

Example:

```html
<div
  class="container"
  data-oobee-path="/path/to/app/page.js"
  data-oobee-line="10"
  data-oobee-column="3"
></div>
```

## Pages

- `/` - Home page
- `/about` - About DNA Injector
- `/components` - Components demo with various examples

Each page has DNA tracking enabled, so you can inspect any element to see its source location.
