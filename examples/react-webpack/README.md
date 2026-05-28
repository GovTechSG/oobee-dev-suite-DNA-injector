# React + Webpack Sample

This is a sample React project configured with Webpack and the oobee-genome.

## Setup

```bash
cd samples/react-webpack
npm install
```

## Development

```bash
npm run dev
# or
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build

```bash
npm run build
```

Output will be in the `dist/` directory.

## DNA Injector Details

The Webpack loader is configured in `webpack.config.js`:

```javascript
use: ["babel-loader", oobeeWebpack({ verbose: true })];
```

Each element in the rendered HTML will have three data attributes:

- `data-oobee-path` - Source file path
- `data-oobee-line` - Line number in the source file
- `data-oobee-column` - Column number in the source file

Example rendered output:

```html
<div
  class="container"
  data-oobee-path="/path/to/App.jsx"
  data-oobee-line="1"
  data-oobee-column="5"
></div>
```

## Inspect DNA Attributes

Use browser DevTools to inspect the DNA attributes:

1. Right-click any element → Inspect
2. Look for `data-oobee-*` attributes in the HTML
3. Use these to trace elements back to their source code
