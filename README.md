# Facebook Left Nav Toggler

Chrome extension for hiding/showing Facebook left sidebar items
by their visible text labels.

Built to survive Facebook's constantly changing DOM and Chrome
extension reload edge-cases.

---

## ✨ Features

- Toggle visibility of Facebook left navigation items by label
  (e.g. Saved, Groups, Messenger, etc.)
- Shared state between **Popup** and **Options** page
- Survives Facebook re-renders (MutationObserver-based)
- Safe against `Extension context invalidated` errors
- No hardcoded selectors – text-based matching only

---

## 🧠 Core Idea

Facebook constantly changes its DOM structure, classes, and attributes.
Targeting elements by selectors is unreliable.

This extension:
- scans clickable elements inside navigation containers
- normalizes their visible text
- maps them against a known label set
- toggles visibility using a CSS class

---

## 📁 Project Structure

```
.
├── icons/
│   └── icon.png
├── scripts/
│   ├── content.js      # Runs on facebook.com, hides/shows nav items
│   ├── defaults.js     # Single source of truth for labels & defaults
│   ├── popup.js        # Quick toggles
│   └── options.js      # Full configuration
├── styles/
│   ├── styles.css      # Injected into Facebook page
│   └── popup.css       # Popup UI styles
├── manifest.json
├── popup.html
├── options.html
└── README.md
```

---

## ⚙️ Defaults & Shared State

All defaults live in **one place**:

```js
// scripts/defaults.js
export const DEFAULTS = {
  Saved: true,
  Groups: true,
  Messenger: true,
  Reels: false,
  Events: false,
  Pages: false,
  "See more": true
}

export const KNOWN_LABELS = new Set(Object.keys(DEFAULTS))
```

Both `popup.js` and `options.js`:
- read from `chrome.storage.sync`
- listen to `chrome.storage.onChanged`
- re-render when the other UI changes state

This guarantees **bi-directional sync**.

---

## 🧩 Why content.js uses dynamic import

Chrome content scripts are **not ES modules by default**.

Static imports like this ❌ **will crash**:

```js
import { DEFAULTS } from "./defaults.js"
```

Instead, the extension uses **dynamic import**:

```js
const mod = await import(
  chrome.runtime.getURL("scripts/defaults.js")
)
```

This is why `defaults.js` is listed in
`web_accessible_resources` in `manifest.json`.

---

## 🧷 CSS Hiding Strategy

Elements are hidden via a single class:

```css
.fbnav-hidden {
  display: none !important;
}
```

No inline styles.
No DOM removal.
Easy to revert.

---

## 🔁 DOM Re-renders (Facebook-proofing)

Facebook constantly re-renders the sidebar.

To survive that:
- a `MutationObserver` watches the document
- changes are debounced via `requestAnimationFrame`
- visibility is re-applied safely

---

## ⚠️ Edge Cases Handled

### Extension Reload While FB Tab Is Open
Chrome throws:
```
Uncaught (in promise) Error: Extension context invalidated
```

Solution:
- every `chrome.*` call is guarded
- rejected promises are never left hanging

### "See more" / "See less"
Some items (Messenger, Pages, etc.) are not in the DOM until expanded.

If `"See more"` is disabled:
- the script auto-expands once
- hides the row afterward
- continues normally

---

## 🚀 Installation (Dev Mode)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the project folder
5. Reload Facebook tabs

---

## 🛠 Debugging Tips

- If settings save but UI does not hide → check **content.js errors**
- If `import outside module` appears → content scripts cannot use static imports
- Always reload the extension after changing `manifest.json`

---

## 🧊 Philosophy

- Defensive code over clever code
- Text-based matching over selectors
- One source of truth for state
- Fail silently, never crash the page

---

## 📜 License

MIT
