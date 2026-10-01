/** Shared scale and event-driven placement; transparent window padding is ignored. */
export const SECONDARY_SCALE = 0.62 * 0.85
export const PET_GAP = 10

export function artworkRect(bounds, geometry) {
  return { x: bounds.x + (geometry.dimensions.width - geometry.artwork.width) / 2,
    y: bounds.y + geometry.dimensions.height - 135 - geometry.artwork.height, ...geometry.artwork }
}

export function overlapArea(a, b, gap = PET_GAP) {
  return Math.max(0, Math.min(a.x + a.width + gap, b.x + b.width + gap) - Math.max(a.x, b.x))
    * Math.max(0, Math.min(a.y + a.height + gap, b.y + b.height + gap) - Math.max(a.y, b.y))
}

/** Keep a clear user position, even at a screen edge; otherwise use the nearest gap. */
export function findOpenPosition(rect, occupied, displays, gap = PET_GAP) {
  const score = candidate => occupied.reduce((sum, other) => sum + overlapArea(candidate, other, gap), 0)
  const originalScore = score(rect)
  if (originalScore === 0 || displays.length === 0) return { x: rect.x, y: rect.y }
  const candidates = [], seen = new Set()
  // Preserve the fractional sprite origin, so conversion back to integer
  // native-window coordinates does not eat the collision clearance.
  const pixelX = rect.x - Math.floor(rect.x), pixelY = rect.y - Math.floor(rect.y)
  for (const area of displays) {
    const minX = Math.ceil(area.x + Math.min(0, area.width - rect.width) - pixelX) + pixelX
    const maxX = Math.floor(area.x + Math.max(0, area.width - rect.width) - pixelX) + pixelX
    const minY = Math.ceil(area.y + Math.min(0, area.height - rect.height) - pixelY) + pixelY
    const maxY = Math.floor(area.y + Math.max(0, area.height - rect.height) - pixelY) + pixelY
    const xs = new Set([minX, maxX, Math.min(maxX, Math.max(minX, rect.x))])
    const ys = new Set([minY, maxY, Math.min(maxY, Math.max(minY, rect.y))])
    for (const other of occupied) {
      xs.add(Math.min(maxX, Math.max(minX, Math.floor(other.x - rect.width - gap - pixelX) + pixelX)))
      xs.add(Math.min(maxX, Math.max(minX, Math.ceil(other.x + other.width + gap - pixelX) + pixelX)))
      ys.add(Math.min(maxY, Math.max(minY, Math.floor(other.y - rect.height - gap - pixelY) + pixelY)))
      ys.add(Math.min(maxY, Math.max(minY, Math.ceil(other.y + other.height + gap - pixelY) + pixelY)))
    }
    for (const x of xs) for (const y of ys) {
      const key = x + ':' + y
      if (seen.has(key)) continue
      seen.add(key)
      candidates.push({ x, y, distance: (x - rect.x) ** 2 + (y - rect.y) ** 2 })
    }
  }
  candidates.sort((a, b) => a.distance - b.distance || a.y - b.y || a.x - b.x)
  let best = rect, bestScore = originalScore
  for (const candidate of candidates) {
    const overlap = score({ ...rect, x: candidate.x, y: candidate.y })
    if (overlap === 0) return { x: candidate.x, y: candidate.y }
    if (overlap < bestScore) { best = candidate; bestScore = overlap }
  }
  // A physically full display cannot fit infinitely many pets. Pick the least
  // overlap without running an unbounded search or moving a clear main pet.
  return { x: best.x, y: best.y }
}
