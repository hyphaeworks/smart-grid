import { describe, it, expect } from 'vitest'
import { layoutRows } from './layout-rows'
import type { FillMode, Row } from './types'

function rowsOf(...sizes: number[][]): Row[] {
  let index = 0
  return sizes.map((row) => row.map((size) => ({ index: index++, size })))
}

function layout(rows: Row[], fill: FillMode = 'equal-extra', fillLast: FillMode = fill) {
  return layoutRows(rows, { fill, fillLast })
}

describe('layoutRows', () => {
  it('returns no tracks for no rows', () => {
    expect(layout([])).toEqual({ columns: 0, spans: [] })
  })

  it('keeps a medium item twice as wide as a small one in a stretched row', () => {
    expect(layout(rowsOf([1, 2], [1]))).toEqual({ columns: 3, spans: [1, 2, 3] })
  })

  it('uses the row unit totals, not the item counts, for the track count', () => {
    expect(layout(rowsOf([3, 1, 1, 1], [3, 3]))).toEqual({ columns: 6, spans: [3, 1, 1, 1, 3, 3] })
  })

  it('stretches rows of different lengths onto shared tracks', () => {
    expect(layout(rowsOf([1, 1, 1], [1, 1]))).toEqual({ columns: 6, spans: [2, 2, 2, 3, 3] })
  })

  it('keeps unit widths with fill none', () => {
    expect(layout(rowsOf([1, 2, 1]), 'none')).toEqual({ columns: 4, spans: [1, 2, 1] })
  })

  it('keeps the last row at the widest row unit width with fill-last none', () => {
    expect(layout(rowsOf([1, 1, 1], [1, 1], [1, 1]), 'equal-extra', 'none')).toEqual({
      columns: 6,
      spans: [2, 2, 2, 3, 3, 2, 2],
    })
  })

  it('every stretched row spans all tracks', () => {
    const rows = rowsOf([2, 1, 3], [1, 1, 1, 1], [2, 2])
    const { columns, spans } = layout(rows)
    let offset = 0
    for (const row of rows) {
      expect(spans.slice(offset, offset + row.length).reduce((total, span) => total + span, 0)).toBe(columns)
      offset += row.length
    }
  })
})
