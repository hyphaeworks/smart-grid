import { describe, it, expect } from 'vitest'
import { applyPlacements } from './apply-placements'

describe('applyPlacements', () => {
  it('sets the row and the start column with its span on each item', () => {
    const items = [document.createElement('div'), document.createElement('div')]

    applyPlacements(items, [
      { row: 1, column: 1, span: 2 },
      { row: 2, column: 3, span: 1 },
    ])

    expect(items[0].style.gridRow).toBe('1')
    expect(items[0].style.gridColumn).toBe('1 / span 2')
    expect(items[1].style.gridRow).toBe('2')
    expect(items[1].style.gridColumn).toBe('3 / span 1')
  })

  it('handles empty arrays', () => {
    expect(() => applyPlacements([], [])).not.toThrow()
  })
})
