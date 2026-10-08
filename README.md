# oobee-dev-suite-DNA-injector

Source-location tracking for DOM elements, used by the [Oobee Dev Suite](https://github.com/GovTechSG/oobee-dev-suite-vscode-oss) VS Code extension to map accessibility issues found in a running app back to the exact file, line and column in your source code.

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

## License

[MIT](LICENSE) © Government Technology Agency
