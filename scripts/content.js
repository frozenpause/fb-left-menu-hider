let DEFAULTS = {}
let KNOWN_LABELS = new Set()

async function loadDefaultsModule() {
  try {
    // defaults.js is in web_accessible_resources
    const mod = await import(chrome.runtime.getURL("scripts/defaults.js"))
    DEFAULTS = mod.DEFAULTS || {}
    KNOWN_LABELS = mod.KNOWN_LABELS || new Set()
  } catch (e) {
    // fallback: keep empty so we don't crash the page
    DEFAULTS = {}
    KNOWN_LABELS = new Set()
  }
}
// --- Local fix for: Uncaught (in promise) Error: Extension context invalidated.
// This happens when the extension reloads/updates while a FB tab is still open.
// Guard every chrome.* usage and NEVER leave a rejected promise hanging.
function hasExtensionContext() {
  try {
    return Boolean(chrome?.runtime?.id)
  } catch (e) {
    return false
  }
}

function safeStorageGet(defaults) {
  return new Promise((resolve) => {
    try {
      if (!hasExtensionContext()) {
        resolve(defaults)
        return
      }

      if (!chrome?.storage?.sync) {
        resolve(defaults)
        return
      }

      chrome.storage.sync.get(defaults, (res) => {
        // If the context got invalidated between call and callback, keep it safe.
        try {
          if (!hasExtensionContext()) {
            resolve(defaults)
            return
          }

          if (chrome.runtime?.lastError) {
            resolve(defaults)
          } else {
            resolve(res)
          }
        } catch (e) {
          // Extension context invalidated inside callback
          resolve(defaults)
        }
      })
    } catch (e) {
      // Extension context invalidated → fallback
      resolve(defaults)
    }
  })
}

async function getSettings() {
  const res = await safeStorageGet({ visibility: DEFAULTS })
  return res.visibility || DEFAULTS
}

function normalizeText(s) {
  return (s || "").replace(/\s+/g, " ").trim()
}

function isLikelyLeftNavItem(el) {
  // Heuristic:
  // Left nav items are typically links or role=link inside a navigation area.
  // We keep it broad but not global.
  if (!el) return false

  const clickable =
    el.tagName === "A" ||
    el.getAttribute("role") === "link" ||
    el.getAttribute("role") === "button"

  if (!clickable) return false

  // Try to avoid matching random feed text by requiring it lives inside a nav-ish container.
  const inNav = el.closest(
    '[role="navigation"], nav, [aria-label*="Navigation"], [aria-label*="navigation"]'
  )
  return Boolean(inNav)
}

function findCandidateNodes(root = document) {
  // We scan clickable elements and then derive their "label" from innerText.
  // This is expensive on Facebook, so we keep it reasonably bounded.
  const candidates = root.querySelectorAll('a, [role="link"], [role="button"]')
  return Array.from(candidates).filter(isLikelyLeftNavItem)
}

function applyVisibilityToNode(node, visibility) {
  const text = normalizeText(node.innerText)

  // Treat "See less" as the same toggle as "See more"
  const effectiveLabel = text === "See less" ? "See more" : text

  if (!KNOWN_LABELS.has(text)) return

  const shouldShow = Boolean(visibility[effectiveLabel])

  if (shouldShow) node.classList.remove("fbnav-hidden")
  else node.classList.add("fbnav-hidden")
}

// --- See more handling
// Problem: some items (e.g. Messenger) are not in the DOM until "See more" is expanded.
// Requirement: if "See more" is disabled (false), auto-expand it so ALL items are visible,
// then hide/remove the "See more" row itself via the same visibility toggle logic.
let __fbNavExpandedOnce = false

function findNodeByExactLabel(label) {
  const nodes = findCandidateNodes(document)
  for (const n of nodes) {
    if (normalizeText(n.innerText) === label) return n
  }
  return null
}

function ensureExpandedIfNeeded(visibility) {
  // If user wants "See more" hidden -> we still need to click it once to reveal hidden items.
  // Then we can hide the "See more" row via CSS class like everything else.
  if (visibility["See more"] !== false) return
  if (__fbNavExpandedOnce) return

  const seeMoreNode = findNodeByExactLabel("See more")
  if (!seeMoreNode) return

  try {
    // Click to expand hidden items.
    seeMoreNode.click()
    __fbNavExpandedOnce = true
  } catch (e) {
    // If it fails (FB rerender), we'll try again on next mutation.
  }
}

async function applyAll() {
  try {
    const visibility = await getSettings()

    // Expand first (so Messenger and friends exist in the DOM)
    ensureExpandedIfNeeded(visibility)

    for (const node of findCandidateNodes(document)) {
      applyVisibilityToNode(node, visibility)
    }

    // After expanding, FB may render items async; do one extra pass shortly after.
    if (visibility["See more"] === false && __fbNavExpandedOnce) {
      window.setTimeout(() => {
        try {
          for (const node of findCandidateNodes(document)) {
            applyVisibilityToNode(node, visibility)
          }
        } catch (e) { }
      }, 250)
    }
  } catch (e) {
    // extension reload / tab stale → ignore
  }
}

// Observe DOM changes (Facebook re-renders constantly)
let observer = null
let __fbNavDestroyed = false

function markDestroyed() {
  __fbNavDestroyed = true
  try {
    if (observer) observer.disconnect()
  } catch (e) { }
}

function startObserver() {
  if (observer) observer.disconnect()

  observer = new MutationObserver(() => {
    if (__fbNavDestroyed) return
    // Apply only when nodes are added (cheap-ish)
    // Still, we debounce a bit with rAF.
    window.requestAnimationFrame(() => {
      applyAll()
    })
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  })

  // If page is unloading / BFCache / etc.
  window.addEventListener("beforeunload", markDestroyed, { once: true })
}

function listenForOptionsChanges() {
  // If extension context is gone, don't attach listeners.
  if (!hasExtensionContext()) return

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") return
      if (!changes.visibility) return

      // Reset expansion attempt if user changes "See more" setting
      // (so toggling it off will expand again if needed)
      __fbNavExpandedOnce = false

      applyAll()
    })
  } catch (e) {
    // Extension context invalidated → ignore
  }
}

; (async function init() {
 await loadDefaultsModule()
  await applyAll()
  startObserver()
  listenForOptionsChanges()
})()
