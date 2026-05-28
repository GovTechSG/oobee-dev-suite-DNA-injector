# Oobee-Genome Sample: Vanilla HTML/CSS/JS

A complete example of how to use **oobee-genome** in a pure HTML/CSS/JavaScript project with a **client-side injector**.

This sample demonstrates:
- ✅ Vanilla HTML/CSS/JS (no framework needed)
- ✅ Client-side script that injects source tracking attributes
- ✅ No build-time transformation needed
- ✅ Simple and straightforward setup
- ✅ Works with dynamic elements

## How It Works

The `oobee-injector.js` script:
1. Runs when the page loads
2. Walks through all DOM elements
3. Injects `data-oobee-*` attributes into each element
4. Watches for dynamically added elements
5. Updates them automatically

## Project Structure

```
vanilla-html-js/
├── src/
│   ├── index.html       # Main HTML file
│   ├── index.js         # JavaScript application logic
│   └── styles.css       # Styling
├── dist/                # Build output (generated)
├── build.oobee.mjs      # Build script with oobee-genome
├── package.json         # Project dependencies and scripts
└── README.md            # This file
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run with Oobee-Genome Enabled

```bash
npm run dev:oobee
```

This will:
- Build the project with esbuild + oobee-genome
- Serve on `http://localhost:8080`
- Automatically open in your browser

### 2. Run Development Server

```bash
npm run serve
```

Opens http://localhost:8080 automatically.

### 3. Inspect Elements

1. Open DevTools: Press **F12** or right-click → **Inspect**
2. Go to the **Elements/Inspector** tab
3. Click the inspect tool (top-left corner)
4. Select any element on the page
5. Look for `data-oobee-*` attributes in the inspector

You'll see:
```html
<button 
  id="addBtn" 
  class="btn btn-success"
  data-oobee-file="/index.html"
  data-oobee-element="button.btn-success"
  data-oobee-index="15"
  data-oobee-timestamp="2026-05-28T12:34:56.789Z"
>
  Add Task
</button>
```

## Client-Side Injector Details

The `src/oobee-injector.js` file:
- ✅ Injects attributes on page load
- ✅ Watches for dynamically created elements
- ✅ Works with all HTML elements
- ✅ Provides JavaScript API for manual control
- ✅ Zero build-time overhead

### Available JavaScript API

Once the page loads, you can use the global `OobeeGenome` object:

```javascript
// Manually inject attributes
OobeeGenome.inject();

// Enable/disable tracking
OobeeGenome.enable();
OobeeGenome.disable();

// Get info about an element
OobeeGenome.getInfo(document.getElementById('myButton'));

// List all tracked elements
OobeeGenome.listAll();
```

### Attributes Injected

- `data-oobee-file` - Current page file path
- `data-oobee-element` - Element selector (tag, id, class)
- `data-oobee-index` - Element index in DOM
- `data-oobee-timestamp` - ISO timestamp of injection

## Available Scripts

### Development with Oobee Tracking

```bash
npm run dev:oobee
```

Builds the project and starts a local dev server on port 8080, then opens it in your browser.

### Build Only

```bash
npm run build
```

Builds the project without starting the server.

### Serve Without Rebuild

```bash
npm run serve
```

Starts the web server for already-built files in the `dist/` directory.

## How Oobee-Genome Works (Client-Side)

1. **HTML includes the injector script:**
   ```html
   <script src="oobee-injector.js"></script>
   ```

2. **On page load, the injector:**
   - Finds all elements in the DOM
   - Adds `data-oobee-*` attributes to each
   - Sets up a mutation observer to catch dynamic elements

3. **You inspect elements in DevTools:**
   - Right-click → Inspect
   - See the injected attributes
   - Understand where each element is in the code

4. **No build-time transformation needed!**
   - Just copy files
   - Include the injector script
   - Done!

## The Application is simple:

```javascript
// 1. Bundle JavaScript
await esbuild.build({ entryPoints: ['src/index.js'] });

// 2. Copy oobee injector
fs.copyFileSync('src/oobee-injector.js', 'dist/oobee-injector.js');

// 3. Copy HTML and CSS
fs.copyFileSync('src/index.html', 'dist/index.html');
fs.copyFileSync('src/styles.css', 'dist/styles.css');
```

That's it! No complex transformations needed.lugins: [
    oobeeEsbuildPlugin({
      enabled: true,
      verbose: false,
      includePatterns: [/\.(html|js)$/],
      excludePatterns: [/node_modules/]
    })
  ]
});

// Copies assets
fs.copyFileSync('src/index.html', 'dist/index.html');
fs.copyFileSync('src/styles.css', 'dist/styles.css');
```

## Production Build

For production (without oobee):

1. Update `build.oobee.mjs` to set `enabled: false` in oobeeEsbuildPlugin
2. Or create a separate build script without the oobee plugin

## Troubleshooting

### No `data-o, simply don't include the `oobee-injector.js` script:

1. Remove the line from `index.html`:
   ```html
   <!-- <script src="oobee-injector.js"></script> -->
   ```

2. Or create a production build configuration

3. Run `npm run build` normally

This way, oobee is **only in development**, never in production.
3. Open DevTools and check for build errors in the console

### Build fails?

1. Ensure all dependencies installed: `npm install`
2. Check that `src/index.html`, `src/index.js`, and `src/styles.css` exist
3. Look for error messages in the terminal

### Changes not showing?

1. Rebuild: `npm run build`
2. Hard refresh browser
3. Check console for errors

## Next Steps

- Modify `src/index.html` to add more UI elements
- Update `src/index.js` with more application logic
- Customize `src/styles.css` styling
- Run `npm run dev:oobee` to see source tracking in action!

## More Information

- See [VANILLA_HTML_SETUP.md](../../VANILLA_HTML_SETUP.md) for detailed setup guide
- Check [README.md](../../oobee-genome/README.md) for oobee-genome documentation
- Review [MULTI_BUNDLER_GUIDE.md](../../MULTI_BUNDLER_GUIDE.md) for other framework integrations

---

**Happy debugging! 🎉**
