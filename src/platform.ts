const MOBILE_UA_PATTERN = /Android|iPhone|iPad/i

export function isNativeShell() {
  return typeof window !== 'undefined' && Boolean((window as unknown as Record<string, unknown>).__TAURI_INTERNALS__)
}

export function isMobileShell() {
  return typeof navigator !== 'undefined' && MOBILE_UA_PATTERN.test(navigator.userAgent)
}

export function isDesktopShell() {
  return !isMobileShell()
}

export function getPlatformDataset() {
  if (isMobileShell()) return 'mobile'
  if (isNativeShell()) return 'tauri'
  return 'desktop-dev'
}
