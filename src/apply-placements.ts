import type { Placement } from './layout-rows'

export function applyPlacements(items: HTMLElement[], placements: Placement[]): void {
  items.forEach((item, index) => {
    const { row, column, span } = placements[index]
    item.style.gridRow = String(row)
    item.style.gridColumn = `${column} / span ${span}`
  })
}
