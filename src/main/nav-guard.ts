// Kiosk 导航守卫纯函数 —— 判断目标 URL 是否允许内容窗口导航。
export function isAllowedNavigation(
  targetUrl: string,
  defaultUrl: string,
  allowlist: string[]
): boolean {
  let target: URL
  let def: URL
  try {
    target = new URL(targetUrl)
    def = new URL(defaultUrl)
  } catch {
    return false
  }
  // allowlist 为空时允许同 host
  if (allowlist.length === 0) {
    return target.host === def.host
  }
  // allowlist 非空时仅允许命中的 host
  return allowlist.some((entry) => {
    try {
      return new URL(entry).host === target.host
    } catch {
      return false
    }
  })
}
