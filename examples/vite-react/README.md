# Vite + React Sample

This is a sample Vite + React project with the oobee-genome integrated.

## Setup

```bash
cd samples/vite-react
npm install
```

## Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build

```bash
npm run build
npm run preview
```

## Configuration

The DNA injector is configured in `vite.config.js`:

```javascript
import oobeeVite from "@oobee/oobee-genome/adapters/vite";

export default defineConfig({
  plugins: [oobeeVite({ verbose: true }), react()],
});
```

The injector runs in the `serve` mode, so it only transforms code during development HMR. For production builds, you can disable it or configure it differently.

## Features

- ⚡ Vite's Lightning-fast HMR
- 📍 Automatic source location tracking
- 🔍 Easy debugging with DNA attributes
- ♻️ Hot Module Replacement support

## Inspecting DNA Attributes

1. Start the dev server: `npm run dev`
2. Open DevTools (F12 or Cmd+Opt+I)
3. Inspect any element and look for `data-oobee-*` attributes
4. Each element shows:
   - `data-oobee-path` - Source file path (relative to project)
   - `data-oobee-line` - Line number in the source
   - `data-oobee-column` - Column number in the source

Example:

```html
<div
  class="app-header"
  data-oobee-path="/path/to/samples/vite-react/src/App.jsx"
  data-oobee-line="12"
  data-oobee-column="5"
></div>
```

## Project Structure

```
vite-react/
├── index.html          - Entry HTML
├── src/
│   ├── main.jsx        - React entry point
│   ├── App.jsx         - Main app component
│   ├── App.css         - Component styles
│   └── index.css       - Global styles
├── vite.config.js      - Vite configuration with DNA injector
└── package.json        - Dependencies
```
