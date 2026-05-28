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

1. Install `@oobee/oobee-genome` from AWS CodeArtifact or npm.
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
npm install @oobee/oobee-genome
```

**Notes:**

1. `aws codeartifact login` writes auth + registry to your user `.npmrc`.
2. Login token expires (typically 12h). Run login again when installs fail with auth errors.

---

## 2. Install For External Users (npm Registry)

> **For: External users (when `@oobee/oobee-genome` is released publicly)**

Install directly from npm:

```bash
npm install @oobee/oobee-genome
```

This section remains below the CodeArtifact section for now. When public release is ready, simply remove the CodeArtifact section above and keep only this one.

## 3. Dev-Only Strategy (Do Not Ship To Prod)

> **Critical:** @oobee/oobee-genome is for development/debugging only. Never ship it in production builds.

Use this pattern in every project:

1. Keep your current production config unchanged (e.g., `vite.config.js`, `next.config.js`).
2. Create a new dev-only config file (e.g., `vite.config.oobee.ts`, `webpack.config.oobee.js`).
3. Add oobee plugin/loader only in the new file.
4. Run `npm run dev:oobee` to start dev builds with oobee enabled.
5. Run `npm run build` normally for production—it always uses your original config.

Recommended naming:

- Vite: `vite.config.oobee.ts` or `vite.config.oobee.js`
- Webpack: `webpack.config.oobee.js`
- Next.js: `next.config.oobee.js`

---

## 4. Choose Your Framework / Build Tool

Select your framework below. Click to expand and follow the step-by-step setup.

**Available frameworks:**

- Vite (React, Vue)
- Webpack (React, Vue)
- Next.js

<details>
<summary><strong>Vite (React, Vue)</strong></summary>

### Vite (React, Vue)

**Setup in 3 steps:**

**Step 1: Install**

```bash
npm install @oobee/oobee-genome
```

**Step 2: Create dev-only config**

Copy your existing `vite.config.ts` (or `.js`) to `vite.config.oobee.ts`, then add the oobee plugin:

```ts
import { defineConfig } from "vite";
import { oobeeVitePlugin } from "@oobee/oobee-genome/adapters/vite";

export default defineConfig({
  plugins: [oobeeVitePlugin({ verbose: true })],
});
```

**Step 3: Update package.json scripts**

Add these scripts to your `package.json`:

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

**Important:** Always use `npm run build` for production. It uses the original `vite.config.ts`, never the oobee config.

</details>

<details>
<summary><strong>Webpack (React, Vue)</strong></summary>

### Webpack (React, Vue)

**Setup in 3 steps:**

**Step 1: Install**

```bash
npm install @oobee/oobee-genome
```

**Step 2: Create dev-only config**

Copy existing `webpack.config.js` to `webpack.config.oobee.js`, then add the oobee loader rule:

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        enforce: "pre",
        use: [
          {
            loader: require.resolve("@oobee/oobee-genome/adapters/webpack"),
            options: { verbose: true },
          },
        ],
      },
    ],
  },
};
```

**Step 3: Update package.json scripts**

Add these scripts to your `package.json`:

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
<summary><strong>Next.js</strong></summary>

### Next.js

**Setup in 3 steps:**

**Step 1: Install**

```bash
npm install @oobee/oobee-genome
```

**Step 2: Create dev-only config**

Copy your existing `next.config.js` to `next.config.oobee.js` and wrap your config with the oobee plugin:

```js
const { withOobeeDNA } = require("@oobee/oobee-genome/adapters/next");

const nextConfig = {
  reactStrictMode: true,
};

module.exports = withOobeeDNA(nextConfig, {
  verbose: true,
  enabled: true,
});
```

**Step 3: Update package.json scripts**

Add this script to your `package.json`:

```json
{
  "scripts": {
    "dev:oobee": "cp next.config.oobee.js next.config.js && next dev"
  }
}
```

**Run dev with oobee enabled:**

```bash
npm run dev:oobee
```

**After debugging:**
After you're done with local analysis/debugging, restore your original `next.config.js`:

```bash
git checkout next.config.js
```

or copy it from your version control.

**Important:** Never commit `next.config.js` changes that include oobee. Your production builds must always use the original config.

</details>

<details>
<summary><strong>Vanilla HTML/CSS/JS (No Framework)</strong></summary>

### Vanilla HTML/CSS/JS (No Framework)

For pure HTML/CSS/JavaScript projects. **Two approaches available:**

---

#### Approach 1: Copy-Paste Script (Simplest - No npm/Node Required)

Perfect for **static HTML, PHP, static site generators**, or any non-Node project.

**Step 1: Copy the injector script**

Download or copy `oobee-injector.js` from this repo into your project:

```bash
# Option A: Copy from @oobee/oobee-genome repo
cp node_modules/@oobee/oobee-genome/oobee-injector.js your-project/

# Option B: Or download directly
# Visit: https://raw.githubusercontent.com/oobee/oobee-genome/main/oobee-injector.js
```

**Step 2: Add to your HTML**

Add this line before closing `</body>`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Project</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <!-- Your content here -->
  
  <script src="oobee-injector.js"></script>
</body>
</html>
```

**Step 3: Done!**

- Open your HTML file in a browser (works with `file://` protocol)
- Open DevTools (F12) and inspect any element
- Look for `data-oobee-*` attributes ✅


**What gets injected:**

Each element receives:
- `data-oobee-file` - Current page URL
- `data-oobee-element` - Element selector (tag#id.class)
- `data-oobee-index` - Position in DOM
- `data-oobee-timestamp` - ISO timestamp

**Works with dynamic elements:** The script watches for new elements added via JavaScript and automatically injects attributes.

---

#### Approach 2: NPM + esbuild Build (For Node Projects)

For projects with `package.json` and a build process.

**Step 1: Install**

```bash
npm install --save-dev esbuild @oobee/oobee-genome
```

**Step 2: Create dev build script**

Create `build.oobee.mjs`:

```js
import esbuild from 'esbuild';
import fs from 'fs';

// Copy injector to dist
fs.copyFileSync(
  'node_modules/@oobee/oobee-genome/oobee-injector.js',
  'dist/oobee-injector.js'
);

// Bundle JavaScript
await esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outdir: 'dist',
  sourcemap: true
});

// Copy HTML and CSS
fs.copyFileSync('src/index.html', 'dist/index.html');
fs.copyFileSync('src/styles.css', 'dist/styles.css');

console.log('✅ Build complete with oobee-genome!');
```

**Step 3: Update package.json scripts**

```json
{
  "scripts": {
    "dev": "npx http-server src -p 8080 -o",
    "build": "npm run build:prod",
    "build:prod": "esbuild src/index.js --bundle --outdir=dist"
  }
}
```

**Step 4: Run dev with oobee**

```bash
npm run dev
```

Then:
1. Open http://localhost:8080
2. Open DevTools (F12)
3. Inspect elements → see `data-oobee-*` attributes

**For production:** Use `npm run build` which builds without oobee.

---

#### Which Approach to Use?

| Approach | Use When | Pros | Cons |
|----------|----------|------|------|
| **Copy-Paste Script** | Static HTML, PHP, no build process | Simple, no npm, works anywhere | Manual script management |
| **NPM + esbuild** | Node project with build process | Automated, integrated, sourcemaps | Requires Node.js |

**Both approaches support:**
- ✅ Adding injector via script tag
- ✅ Watching dynamic elements
- ✅ Full console API
- ✅ Works with `file://` protocol
- ✅ Easy to remove for production


</details>

---

## 5. After Setup: Checklist

Once you've set up oobee-genome, verify your workflow:

- [ ] You have a dev-only config file (`vite.config.oobee.ts`, `webpack.config.oobee.js`, etc.)
- [ ] Your `package.json` has both `dev` and `dev:oobee` scripts
- [ ] `npm run dev:oobee` starts dev server with @oobee/oobee-genome enabled
- [ ] `npm run build` uses your original production config (without @oobee/oobee-genome)
- [ ] You never commit dev config files or changes to production configs

**Rule:** If you see @oobee/oobee-genome in your built/deployed code, you used the wrong config. Always use `npm run build` for production.

---

## 6. Troubleshooting

**Problem:** `npm install @oobee/oobee-genome` fails with auth error

- **Solution (Internal):** Re-run `aws codeartifact login` (token may have expired)
- **Solution (External):** Ensure you're using the public npm registry

**Problem:** oobee not activating when I run `npm run dev:oobee`

- **Solution:** Check that your dev config file exists and imports oobee adapter correctly

**Problem:** I accidentally built with the oobee config

- **Solution:** Delete `next.config.js` (if Next.js) or any symlinked configs, restore originals from git, then rebuild
