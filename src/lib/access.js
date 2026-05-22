import { packages } from '../registry/packages'

export function canUsePanel(user, panelId) {
  const pkg = packages.find(p => p.id === user?.package_id)
  if (!pkg) return false
  if (pkg.panels === "all") return true
  return pkg.panels.includes(panelId)
}

export function canUseAction(user, actionId) {
  const pkg = packages.find(p => p.id === user?.package_id)
  if (!pkg) return false
  if (pkg.actions === "all") return true
  return pkg.actions.includes(actionId)
}

export function getBatchLimit(user) {
  const pkg = packages.find(p => p.id === user?.package_id)
  return pkg?.limits.maxBatchSize ?? 0
}

export function getFileSizeLimit(user) {
  const pkg = packages.find(p => p.id === user?.package_id)
  return pkg?.limits.maxFileSizeMB ?? 0
}

export function getRequiredPackage(panelId) {
  return packages.find(p => p.panels === "all" || (Array.isArray(p.panels) && p.panels.includes(panelId)))
}

export function getRequiredPackageForAction(actionId) {
  return packages.find(p => p.actions === "all" || (Array.isArray(p.actions) && p.actions.includes(actionId)))
}
