# oobee-genome

Automatic source location tracking for DOM elements across multiple build tools.

---

## Quick Start

**Are you:**

- **Internal team member?** → Follow "Install For Internal Teams" below
- **External user (when released)?** → Follow "Install For External Users" below
- **Ready to set up your framework?** → Jump to "Choose Your Framework / Build Tool"

---

## What This Guide Solves

1. Install `oobee-genome` from AWS CodeArtifact or npm.
2. Pick your framework/build tool and wire it up quickly.
3. Keep production deployments clean by using a separate dev-only build config.

---

## 1. Install For Internal Teams (AWS CodeArtifact)

> **For: Internal team members with AWS access**

Run this once per machine/session (replace placeholders):

Steps to login into AWS codeartifact are here

https://govtech.enterprise.slack.com/docs/TCH9UHD61/F0B21BP9W6N

Install package:

```bash
npm install oobee-genome
```

**Notes:**

1. `aws codeartifact login` writes auth + registry to your user `.npmrc`.
2. Login token expires (typically 12h). Run login again when installs fail with auth errors.

---

## 2. Install For External Users (npm Registry)

> **For: External users (when `oobee-genome` is released publicly)**

Install directly from npm:

```bash
npm install oobee-genome
```

This section remains below the CodeArtifact section for now. When public release is ready, simply remove the CodeArtifact section above and keep only this one.

## 3. Dev-Only Strategy (Do Not Ship To Prod)

> **Critical:** oobee-genome is for development/debugging only. Never ship it in production builds.

Use this pattern in every project:

1. Keep your current production config unchanged (e.g., `vite.config.js`, `next.config.js`).
2. Create a new dev-only config file (e.g., `vite.config.oobee.ts`, `webpack.config.oobee.js`).
3. Add oobee plugin/loader only in the new file.
4. Run `npm run dev:oobee` to start dev builds with oobee enabled.
5. Run `npm run build` normally for production—it always uses your original config.

Recommended naming:

- Vite: `vite.config.oobee.ts` or `vite.config.oobee.js`
- Webpack: `webpack.config.oobee.js`
- Next.js: uses an env-var guard inside the existing `next.config.js` (see Next.js section)

---

## 4. Choose Your Framework / Build Tool

Select your framework below. Click to expand and follow the step-by-step setup.

**Available frameworks:**

- Vite (React, Vue)
- Webpack (React, Vue)
- Angular CLI
- Next.js
- esbuild (HTML, JSX, Vue)
- Rollup

<details>
<summary><strong>Vite — React</strong></summary>

### Vite — React

**Setup in 3 steps:**

**Step 1: Install**

```bash
npm install oobee-genome
```

**Step 2: Create dev-only config**

Copy your existing `vite.config.ts` (or `.js`) to `vite.config.oobee.ts`, then add the oobee plugin alongside the React plugin:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { oobeeVitePlugin } from "oobee-genome/adapters/vite";

export default defineConfig({
  plugins: [react(), oobeeVitePlugin({ verbose: true })],
});
```

Both plugins are required. `@vitejs/plugin-react` handles JSX/TSX parsing; `oobeeVitePlugin` runs before it (via `enforce: 'pre'`) to inject source attributes into the raw source first.

`oobeeVitePlugin` uses `apply: 'serve'` internally — it is architecturally impossible for it to run during `vite build`, even if this config file were accidentally used for a production build.

**Step 3: Update package.json scripts**

```json
{
  "scripts": {
    "dev:oobee": "vite --config vite.config.oobee.ts"
  }
}
```

**Run dev with oobee enabled:**

```bash
npm run dev:oobee
```

</details>

<details>
<summary><strong>Vite — Vue</strong></summary>

### Vite — Vue

**Setup in 3 steps:**

**Step 1: Install**

```bash
npm install oobee-genome
```

**Step 2: Create dev-only config**

Copy your existing `vite.config.ts` (or `.js`) to `vite.config.oobee.ts`, then add the oobee plugin alongside the Vue plugin:

```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { oobeeVitePlugin } from "oobee-genome/adapters/vite";

export default defineConfig({
  plugins: [vue(), oobeeVitePlugin({ verbose: true })],
});
```

Both plugins are required. `@vitejs/plugin-vue` handles `.vue` SFC parsing; `oobeeVitePlugin` runs before it (via `enforce: 'pre'`) to inject source attributes into the raw source first.

`oobeeVitePlugin` uses `apply: 'serve'` internally — it cannot run during `vite build`.

**Step 3: Update package.json scripts**

```json
{
  "scripts": {
    "dev:oobee": "vite --config vite.config.oobee.ts"
  }
}
```

**Run dev with oobee enabled:**

```bash
npm run dev:oobee
```

</details>

<details>
<summary><strong>Webpack (React, Vue)</strong></summary>

### Webpack (React, Vue)

**Setup in 3 steps:**

**Step 1: Install**

```bash
npm install oobee-genome
```

**Step 2: Create dev-only config**

Copy your existing `webpack.config.js` to `webpack.config.oobee.js`, then add the oobee loader:

```js
const { oobeeWebpackLoader } = require("oobee-genome/adapters/webpack");

module.exports = {
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        enforce: "pre",
        use: [oobeeWebpackLoader({ verbose: true })],
      },
    ],
  },
};
```

`oobeeWebpackLoader` is a factory function — call it with your options and it returns the actual webpack loader function. Pass that returned function directly in the `use` array. Do not use `require.resolve(...)` with an `options:` key — that invokes the factory incorrectly.

**Step 3: Update package.json scripts**

```json
{
  "scripts": {
    "dev:oobee": "webpack serve --mode development --config webpack.config.oobee.js"
  }
}
```

**Run dev with oobee enabled:**

```bash
npm run dev:oobee
```

**Important:** Always use `npm run build` for production. It uses the original `webpack.config.js`, never the oobee config.

</details>

<details>
<summary><strong>Angular CLI (with @angular-builders/custom-webpack)</strong></summary>

### Angular CLI

Angular CLI manages its own internal webpack config and does not expose it directly. To inject oobee you need `@angular-builders/custom-webpack`, which passes Angular's generated webpack config to your function before building. `oobeeAngularPlugin` is written exactly for this pattern — it receives the config object, adds the oobee loader rule, and returns the modified config.

**Step 1: Install**

```bash
npm install oobee-genome
npm install --save-dev @angular-builders/custom-webpack
```

**Step 2: Create dev-only webpack config**

Create `webpack.config.oobee.js` at the project root:

```js
const { oobeeAngularPlugin } = require("oobee-genome/adapters/angular");

module.exports = oobeeAngularPlugin({ verbose: true });
```

`oobeeAngularPlugin` returns a function. Angular CLI (via the custom builder) calls that function with the generated webpack config and expects the modified config back — which is exactly what the adapter does.

**Step 3: Add a dev:oobee target in angular.json**

```json
{
  "architect": {
    "build-oobee": {
      "builder": "@angular-builders/custom-webpack:browser",
      "options": {
        "customWebpackConfig": {
          "path": "./webpack.config.oobee.js"
        }
      }
    },
    "serve-oobee": {
      "builder": "@angular-builders/custom-webpack:dev-server",
      "options": {
        "buildTarget": "YOUR-APP-NAME:build-oobee"
      }
    }
  }
}
```

Replace `YOUR-APP-NAME` with the project name key at the top of your `angular.json`.

**Step 4: Add script to package.json**

```json
{
  "scripts": {
    "dev:oobee": "ng serve --configuration=oobee"
  }
}
```

**Run dev with oobee enabled:**

```bash
npm run dev:oobee
```

**Important:** Your default `ng build` and `ng serve` use the original build targets and are never affected.

</details>

<details>
<summary><strong>Next.js</strong></summary>

### Next.js

**Setup in 3 steps:**

**Step 1: Install**

```bash
npm install oobee-genome
```

**Step 2: Edit next.config.js in place (env-var guard)**

Instead of a separate file, add an environment variable guard directly to your existing `next.config.js`:

```js
const { withOobeeDNA } =
  process.env.OOBEE === "1"
    ? require("oobee-genome/adapters/next")
    : { withOobeeDNA: (c) => c };

const nextConfig = {
  reactStrictMode: true,
};

module.exports = withOobeeDNA(nextConfig, { verbose: true, enabled: true });
```

When `OOBEE` is not set, `withOobeeDNA` is a no-op passthrough. Your production build is unaffected and you never need to swap or restore the file.

**Step 3: Update package.json scripts**

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:oobee": "OOBEE=1 next dev"
  }
}
```

On Windows (PowerShell):

```powershell
$env:OOBEE="1"; next dev
```

**Run dev with oobee enabled:**

```bash
npm run dev:oobee
```

**Important:** Never commit `next.config.js` with the env var hardcoded to `"1"`. The guard only activates when you run `dev:oobee` — your production `npm run build` never sets `OOBEE`.

</details>

<details>
<summary><strong>esbuild (HTML, JSX, Vue)</strong></summary>

### esbuild

Use this for plain HTML projects, or any project where esbuild is the bundler directly.

**Step 1: Install**

```bash
npm install oobee-genome
```

**Step 2: Create dev-only build script**

Create `build.oobee.mjs` at the project root:

```js
import esbuild from "esbuild";
import { oobeeEsbuildPlugin } from "oobee-genome/adapters/esbuild";

await esbuild.build({
  entryPoints: ["src/index.js"],
  bundle: true,
  outdir: "dist",
  plugins: [oobeeEsbuildPlugin({ verbose: true })],
});
```

The esbuild adapter processes `.tsx`, `.jsx`, `.vue`, and `.html` files. Plain `.ts` and `.js` files without JSX are not transformed — oobee targets markup/template files only. For `.html` files, esbuild treats the transformed output as raw text (`loader: 'text'`).

**Step 3: Add script to package.json**

```json
{
  "scripts": {
    "dev:oobee": "node build.oobee.mjs"
  }
}
```

**Run dev with oobee enabled:**

```bash
npm run dev:oobee
```

</details>

<details>
<summary><strong>Rollup</strong></summary>

### Rollup

**Setup in 3 steps:**

**Step 1: Install**

```bash
npm install oobee-genome
```

**Step 2: Create dev-only config**

Copy your existing `rollup.config.js` to `rollup.config.oobee.js`, then add the oobee plugin:

```js
import { oobeeRollupPlugin } from "oobee-genome/adapters/rollup";

export default {
  input: "src/index.js",
  plugins: [oobeeRollupPlugin({ verbose: true })],
};
```

**Step 3: Add script to package.json**

```json
{
  "scripts": {
    "dev:oobee": "rollup -c rollup.config.oobee.js --watch"
  }
}
```

**Run dev with oobee enabled:**

```bash
npm run dev:oobee
```

</details>

---

## 5. What Gets Injected (and How to Use It in Tests)

After setup, every JSX/HTML element in your source files gets three attributes injected at the point the tag opens:

```html
<!-- Source: src/components/LoginButton.tsx, line 12, column 5 -->
<button
  data-oobee-path="/abs/path/to/src/components/LoginButton.tsx"
  data-oobee-line="12"
  data-oobee-column="5"
>
  Log in
</button>
```

| Attribute | Value | Use for |
|---|---|---|
| `data-oobee-path` | Absolute path to the source file | Identifying which component rendered an element |
| `data-oobee-line` | Line number in that source file | Pinpointing the exact JSX/HTML tag |
| `data-oobee-column` | Column number | Disambiguating multiple tags on the same line |

**Playwright example:**

```ts
// All elements from a specific component file
const buttons = page.locator('[data-oobee-path*="LoginButton"]');

// Exact element by file + line
await page.locator('[data-oobee-line="12"]').click();
```

**Cypress example:**

```js
cy.get('[data-oobee-path*="LoginButton"]').should("be.visible");
```

> **Note:** `data-oobee-path` is the absolute path on the machine that ran the build. In CI environments the path will differ from local. Use `*=` (contains) rather than `=` (exact) when matching on path, or normalise with a shared path prefix in your test setup.

---

## 6. Options Reference

All adapters accept the same options object:

| Option | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `true` | Set to `false` to disable all transformation without removing the plugin from your config |
| `verbose` | `boolean` | `false` | Log each transformed file path to the console (prefixed `[oobee-genome]`) |
| `attributePrefix` | `string` | `"data-oobee"` | Prefix for all injected attributes. Change if `data-oobee-*` conflicts with existing attributes in your project |
| `includePatterns` | `RegExp[]` | `[/\.(ts\|tsx\|js\|jsx\|vue\|html)$/]` | File patterns to transform. Override to narrow the scope |
| `excludePatterns` | `RegExp[]` | `[/node_modules/, /\.d\.ts$/, /\.spec\.(tsx\|jsx)$/, /\.test\.(tsx\|jsx)$/]` | File patterns to skip. Test files are excluded by default so your test component trees stay clean |
| `blacklist` | `string[]` | `['void','string','number','boolean','any','unknown','React']` | Tag/component names that will not receive injected attributes |

**Example — custom attribute prefix:**

```ts
oobeeVitePlugin({
  attributePrefix: "data-src",
  verbose: true,
})
// Produces: data-src-path, data-src-line, data-src-column
```

> **Note on test files:** `.spec.tsx` and `.test.tsx` are in `excludePatterns` by default. If you render components in test files directly and want oobee attributes on them, remove those patterns from `excludePatterns`.

---

## 7. After Setup: Verify It's Working

**Quick check (30 seconds):**

1. Start your dev server with `npm run dev:oobee`
2. Open the app in your browser
3. Right-click any element → Inspect
4. In DevTools, look for `data-oobee-path`, `data-oobee-line`, `data-oobee-column` on the element

If attributes are present, oobee is working.

**If attributes are missing:**

- Set `verbose: true` in your options and check the terminal for `[oobee-genome] Transforming:` lines
- If no transform lines appear, the adapter is not being called — verify the config file path in your start script
- If transform lines appear but the DOM has no attributes, check `excludePatterns` — your component files may be excluded

**Checklist:**

- [ ] You have a dev-only config file (`vite.config.oobee.ts`, `webpack.config.oobee.js`, etc.)
- [ ] Your `package.json` has both `dev` and `dev:oobee` scripts
- [ ] `npm run dev:oobee` starts the dev server with oobee enabled
- [ ] `data-oobee-path` is visible in DevTools on rendered elements
- [ ] `npm run build` uses your original production config (without oobee)
- [ ] No `data-oobee-*` attributes appear in your built/deployed output

**Rule:** If you see oobee attributes in your built/deployed code, you used the wrong config. Always use `npm run build` for production.

---

## 8. Troubleshooting

**Problem:** `npm install oobee-genome` fails with auth error

- **Solution (Internal):** Re-run `aws codeartifact login` (token may have expired)
- **Solution (External):** Ensure you're using the public npm registry

**Problem:** oobee not activating when I run `npm run dev:oobee`

- **Solution:** Set `verbose: true` and check the terminal. If no `[oobee-genome] Transforming:` lines appear, the adapter is not loading — check that your dev config file path in the script is correct and that the import path matches your module format (ESM vs CJS)

**Problem:** Angular build fails after adding `@angular-builders/custom-webpack`

- **Solution:** Ensure the `builder` value in `angular.json` matches the installed package exactly. Verify that `YOUR-APP-NAME` in the `serve-oobee` target matches the project name at the top of `angular.json`

**Problem:** I accidentally built with the oobee config (Next.js)

- **Solution:** With the env-var guard approach, this cannot happen — `OOBEE=1` is only set by `npm run dev:oobee` and is not inherited by `npm run build`

**Problem:** `data-oobee-path` contains an absolute machine path that breaks CI selectors

- **Solution:** Match with `*=` (contains) in your test selectors, or configure a shared `attributePrefix` that encodes a relative path instead
