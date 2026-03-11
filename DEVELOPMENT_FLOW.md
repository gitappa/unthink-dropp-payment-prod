# Dropp Wallet Plugin Development & Usage Flow

This guide describes the sequence of files and flow for:
1.  **Running Locally** (Development/Testing)
2.  **Developing the Plugin** (Preparing for 3rd party distribution)

## 1. Local Development Flow (Running `SampleUsage.jsx`)

When you run `npm run dev:vite` (or `npm run dev`), the following sequence occurs to render the sample page:

1.  **Entry Point**: `src/index.jsx`
    *   This is the React root. We modified it to render `<DroppWalletPluginDemo />` instead of the main `<App />`.
    *   Flow: `index.html` -> `src/index.jsx` -> `src/examples/SampleUsage.jsx`.

2.  **Sample Component**: `src/examples/SampleUsage.jsx`
    *   This is your "test harness". It mimics a 3rd party app using your plugin.
    *   It imports the hook from: `../hooks/useDroppWallet`.

3.  **The Hook (Core Logic)**: `src/hooks/useDroppWallet.js`
    *   This contains the actual business logic (Connect Wallet, Sign, Save user info).
    *   It imports API services from: `../services/api.js`.

4.  **API Services**: `src/services/api.js`
    *   Handles HTTP calls to your backend (e.g., `saveUserInfo`).

**Summary for Local Run:**
`index.jsx` -> `SampleUsage.jsx` -> `useDroppWallet.js` -> `api.js`

---

## 2. Plugin Build Flow (Creating `dist/` files)

When you run `npm run build:plugin`, the goal is to bundle **just the logic** (hook + api) into a single file for others to use.

1.  **Build Command**: `package.json` script `"build:plugin"` calls Vite with a specific config.
    *   Command: `vite build --config vite.config.lib.js`

2.  **Configuration**: `vite.config.lib.js`
    *   Tells Vite to start bundling from `src/plugin.js`.
    *   Sets the output to `dist/dropp-wallet-plugin.es.js`.
    *   **Crucial**: It marks `react` and `@hashgraph/*` as **external**. This means they are NOT included in the bundle (the 3rd party app must provide them).

3.  **Plugin Entry**: `src/plugin.js`
    *   This file simply exports what you want the public to see.
    *   Exports: `useDroppWallet` (from `hooks/`) and API functions (from `services/`).

4.  **Output**: `dist/dropp-wallet-plugin.es.js`
    *   This is the final file you give to 3rd parties.
    *   It contains the code from `src/plugin.js` + `src/hooks/useDroppWallet.js` + `src/services/api.js` compressed into one file.

**Summary for Plugin Build:**
`npm run build:plugin` -> `vite.config.lib.js` -> `src/plugin.js` -> (bundles hook + api) -> `dist/dropp-wallet-plugin.es.js`

---

## 3. Handover to 3rd Party

To hand over the work:

1.  **Develop & Test Locally**: Modify `useDroppWallet.js` or `api.js` and test using `npm run dev` (viewing `SampleUsage.jsx`).
2.  **Build**: Run `npm run build:plugin`.
3.  **Deliver**: Send the `dist/dropp-wallet-plugin.es.js` file to the 3rd party.
4.  **Instructions**: Tell them to install peer dependencies (`@hashgraph/sdk`, etc.) as documented in `PLUGIN_USAGE.md`.
