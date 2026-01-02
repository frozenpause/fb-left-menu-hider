import { ITEMS, DEFAULTS } from "./defaults.js"

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ visibility: DEFAULTS }, (res) => resolve(res.visibility))
  })
}

function setSettings(visibility) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ visibility }, () => resolve())
  })
}

function render(visibility) {
  const grid = document.getElementById("grid")
  grid.innerHTML = ""

  for (const label of ITEMS) {
    const id = `cb_${label.replace(/\s+/g, "_")}`

    const wrap = document.createElement("label")
    wrap.htmlFor = id

    const cb = document.createElement("input")
    cb.type = "checkbox"
    cb.id = id
    cb.dataset.label = label
    cb.checked = Boolean(visibility[label])

    const span = document.createElement("span")
    span.textContent = label

    wrap.appendChild(cb)
    wrap.appendChild(span)
    grid.appendChild(wrap)
  }
}

function collect() {
  const visibility = {}
  document.querySelectorAll("input[type=checkbox][data-label]").forEach((cb) => {
    visibility[cb.dataset.label] = cb.checked
  })
  return visibility
}

function flash(msg) {
  const el = document.getElementById("status")
  el.textContent = msg
  setTimeout(() => (el.textContent = ""), 1200)
}

; (async function init() {
  const visibility = await getSettings()
  render(visibility)

  document.getElementById("save").addEventListener("click", async () => {
    await setSettings(collect())
    flash("Saved!")
  })

  document.getElementById("reset").addEventListener("click", async () => {
    await setSettings(DEFAULTS)
    render(DEFAULTS)
    flash("Reset")
  })
})()
