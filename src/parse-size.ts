import { SIZE_UNITS, type SemanticSize } from './types'

export function parseSize(element: HTMLElement, maxColumns: number): number {
  const size = element.dataset.size ?? ''
  const units = Object.hasOwn(SIZE_UNITS, size) ? SIZE_UNITS[size as SemanticSize] : 1
  return Math.min(units, maxColumns)
}
