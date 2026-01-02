# Facebook Left Nav Toggler

Chrome extension for hiding/showing Facebook left sidebar items
by their visible text labels.

Built to survive Facebook’s constantly changing DOM and Chrome
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

