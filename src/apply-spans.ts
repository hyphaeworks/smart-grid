export function applySpans(items: HTMLElement[], spans: number[]): void {
  items.forEach((item, i) => {
    const span = spans[i]
    if (span && span > 1) {
      item.style.gridColumn = `span ${span}`
    } else {
      item.style.removeProperty('grid-column')
    }
  })
}
