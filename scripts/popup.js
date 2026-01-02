import { DEFAULTS, QUICK_ITEMS } from "./defaults.js"

function getSettings(defaults) {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ visibility: defaults }, (res) =>
      resolve(res.visibility)
    )
  })
}

function setSettings(visibility) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ visibility }, () => resolve())
  })
}

function flash(msg) {
  const el = document.getElementById("status")
  el.textContent = msg
  setTimeout(() => (el.textContent = ""), 1000)
}

function render(visibility) {
  const root = document.getElementById("quick")
  root.innerHTML = ""

  for (const label of QUICK_ITEMS) {
    const row = document.createElement("label")
    row.className = "item"

    const cb = document.createElement("input")
    cb.type = "checkbox"
    cb.checked = Boolean(visibility[label])

    const span = document.createElement("span")
    span.textContent = label

    cb.addEventListener("change", async () => {
      visibility[label] = cb.checked

      // keep See less in sync
      if (label === "See more") {
        visibility["See less"] = cb.checked
      }

      await setSettings(visibility)
      flash("Saved")
    })

    row.append(cb, span)
    root.appendChild(row)
  }
}

;(async function init() {
  const visibility = await getSettings(DEFAULTS)

  // backfill for older installs
  for (const k in DEFAULTS) {
    if (!(k in visibility)) visibility[k] = DEFAULTS[k]
  }

  render(visibility)

  // keep popup UI in sync if options page changes visibility
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return
    if (!changes.visibility) return

    const next = changes.visibility.newValue || DEFAULTS

    // backfill for safety
    for (const k in DEFAULTS) {
      if (!(k in next)) next[k] = DEFAULTS[k]
    }

    render(next)
  })

  document
    .getElementById("openOptions")
    .addEventListener("click", () => chrome.runtime.openOptionsPage())
})()
