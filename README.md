# oobee-dev-suite-DNA-injector

Source-location tracking for DOM elements, used by the Oobee Dev Suite VS Code extension to map accessibility issues found in a running app back to the exact file, line and column in your source code.

During local development, every rendered element gets attributes such as:

```html
<button data-oobee-path="src/App.tsx" data-oobee-line="25" data-oobee-column="17">
```

## Repository layout

| Path | What it is |
|---|---|
| [`oobee-genome/`](oobee-genome/) | The **`@govtechsg/oobee-genome`** package published to npm: the AST transformer and the build-tool adapters (Vite, Webpack, Next.js, Rollup, esbuild, Angular). |
| [`examples/`](examples/) | Small sample apps showing how to wire the package into each framework. |

## Getting started

Install the package in your app:

```bash
npm install @govtechsg/oobee-genome
```

Then follow the setup for your build tool in the **[oobee-genome README](oobee-genome/README.md)**. It covers the dev-only config, the `dev:oobee` script, verifying the attributes in DevTools, and troubleshooting.

> [!CAUTION]
> oobee-genome is for local development only. Keep it in a separate dev-only config and never ship it in production builds. The adapters also refuse to inject outside development as a backstop; see *Built-in safeguards* in the package README.

## Permissions and access

oobee-genome is an ordinary npm package used as a build plugin. It needs no elevated permissions to install or run.

**At install time**

- No `preinstall`, `install`, `postinstall` or `prepare` scripts. `npm install` only downloads files.
- No `sudo`, global install or admin rights needed. Install it as a dev dependency of your app.
- Runtime dependencies: `@babel/parser`, `@vue/compiler-dom`, `@vue/compiler-sfc`, `magic-string`, `parse5`.

**At build time (dev server only)**

| Access | What and why |
|---|---|
| Read source files | Reads the files your bundler is already transforming so it can add `data-oobee-*` attributes. The esbuild adapter reads them from disk itself. |
| Read your `package.json` | Detects which bundler you use when `OOBEE_BUNDLER` is not set. |
| Read environment variables | `NODE_ENV`, `CI`, `CONTINUOUS_INTEGRATION`, `NEXT_PHASE`, `VERCEL_ENV`, `OOBEE_BUNDLER`, `OOBEE_DNA_FORCE`, `OOBEE_DNA_FORCE_ACK`. Used only to decide whether to inject. |
| Write files | None. Changes go to the bundler's in-memory output, never back to your source. |
| Network | None. No telemetry, no outbound requests. |
| Child processes | None. |

**In the browser**

The output adds `data-oobee-path`, `data-oobee-line` and `data-oobee-column` attributes to elements. Paths are relative to the project root, so your OS username and machine layout are not exposed, but your project's file structure is visible to anyone who can view the page. That is why injection is limited to local development. The standalone `oobee-injector.js` for plain HTML (see [`examples/vanilla-html-js`](examples/vanilla-html-js/)) only adds attributes to the DOM. It makes no network requests and does not use storage or cookies.

## Examples

Each folder in [`examples/`](examples/) is a standalone app with oobee-genome already configured:

| Example | Stack |
|---|---|
| [`vite-react`](examples/vite-react/) | React + Vite |
| [`vue-vite`](examples/vue-vite/) | Vue 3 + Vite |
| [`react-webpack`](examples/react-webpack/) | React + Webpack |
| [`vue-webpack`](examples/vue-webpack/) | Vue 3 + Webpack |
| [`next-js`](examples/next-js/) | Next.js (App Router) |
| [`vanilla-html-js`](examples/vanilla-html-js/) | Plain HTML/JS, no build tool |

To try one:

```bash
cd examples/vite-react
npm install
npm run dev
```

Open the local URL, inspect an element in DevTools to confirm the `data-oobee-*` attributes are present, then scan that URL from the Oobee Dev Suite extension.

## Developing oobee-genome

```bash
cd oobee-genome
npm install
npm test
```

## Contributing

Issues and pull requests are welcome. Open PRs against `master`. The `test` workflow runs on every PR. Please make sure it passes. Report security issues privately as described in [SECURITY.md](SECURITY.md), not in public issues.

## License

[MIT](LICENSE) © Government Technology Agency
