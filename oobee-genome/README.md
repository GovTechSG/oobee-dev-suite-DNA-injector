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
- Next.js: `next.config.oobee.js`

---

## 4. Choose Your Framework / Build Tool

Select your framework below. Click to expand and follow the step-by-step setup.

**Available frameworks:**

- Vite (React, Vue, Angular)
- Webpack (React, Vue, Angular)
- Next.js

<details>
<summary><strong>Vite (React, Vue, Angular)</strong></summary>

### Vite (React, Vue, Angular)

**Setup in 3 steps:**

**Step 1: Install**

```bash
npm install oobee-genome
```

**Step 2: Create dev-only config**

Copy your existing `vite.config.ts` (or `.js`) to `vite.config.oobee.ts`, then add the oobee plugin:

```ts
import { defineConfig } from "vite";
import { oobeeVitePlugin } from "oobee-genome/adapters/vite";

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
<summary><strong>Webpack (React, Vue, Angular)</strong></summary>

### Webpack (React, Vue, Angular)

**Setup in 3 steps:**

**Step 1: Install**

```bash
npm install oobee-genome
```

**Step 2: Create dev-only config**

Copy your existing `webpack.config.js` to `webpack.config.oobee.js`, then add the oobee loader rule:

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
            loader: require.resolve("oobee-genome/adapters/webpack"),
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
npm install oobee-genome
```

**Step 2: Create dev-only config**

Copy your existing `next.config.js` to `next.config.oobee.js` and wrap your config with the oobee plugin:

```js
const { withOobeeDNA } = require("oobee-genome/adapters/next");

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

---

## 5. After Setup: Checklist

Once you've set up oobee-genome, verify your workflow:

- [ ] You have a dev-only config file (`vite.config.oobee.ts`, `webpack.config.oobee.js`, etc.)
- [ ] Your `package.json` has both `dev` and `dev:oobee` scripts
- [ ] `npm run dev:oobee` starts dev server with oobee enabled
- [ ] `npm run build` uses your original production config (without oobee)
- [ ] You never commit dev config files or changes to production configs

**Rule:** If you see oobee in your built/deployed code, you used the wrong config. Always use `npm run build` for production.

---

## 6. Troubleshooting

**Problem:** `npm install oobee-genome` fails with auth error

- **Solution (Internal):** Re-run `aws codeartifact login` (token may have expired)
- **Solution (External):** Ensure you're using the public npm registry

**Problem:** oobee not activating when I run `npm run dev:oobee`

- **Solution:** Check that your dev config file exists and imports oobee adapter correctly

**Problem:** I accidentally built with the oobee config

- **Solution:** Delete `next.config.js` (if Next.js) or any symlinked configs, restore originals from git, then rebuild
