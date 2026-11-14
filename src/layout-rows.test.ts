import { describe, it, expect } from 'vitest'
import { layoutRows, type LayoutOptions } from './layout-rows'
import type { FillMode, Row } from './types'

function rowsOf(...sizes: number[][]): Row[] {
  let index = 0
  return sizes.map((row) => row.map((size) => ({ index: index++, size })))
}

function layout(rows: Row[], fill: FillMode = 'equal-extra', fillLast: FillMode = fill) {
  const { columns, placements } = layoutRows(rows, { fill, fillLast })
  return { columns, spans: placements.map((placement) => placement.span) }
}

describe('layoutRows', () => {
  it('returns no tracks for no rows', () => {
    expect(layout([])).toEqual({ columns: 0, spans: [] })
  })

  it('places each item at an explicit row and start column', () => {
    expect(layoutRows(rowsOf([1, 2], [1, 1]), { fill: 'none', fillLast: 'none' }).placements).toEqual([
      { row: 1, column: 1, span: 1 },
      { row: 1, column: 2, span: 2 },
      { row: 2, column: 1, span: 1 },
      { row: 2, column: 2, span: 1 },
    ])
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

  describe('align', () => {
    function lastRow(rows: Row[], options: LayoutOptions) {
      const { columns, placements } = layoutRows(rows, options)
      return { columns, lastRow: placements.slice(-rows[rows.length - 1].length) }
    }

    it('centres a short row with doubled tracks when the free space is odd', () => {
      expect(lastRow(rowsOf([1, 1, 1], [1, 1]), { fill: 'equal-extra', fillLast: 'none', align: 'center' })).toEqual({
        columns: 6,
        lastRow: [
          { row: 2, column: 2, span: 2 },
          { row: 2, column: 4, span: 2 },
        ],
      })
    })

    it('centres a short row without extra tracks when the free space is even', () => {
      expect(lastRow(rowsOf([1, 1, 1, 1], [1, 1]), { fill: 'none', fillLast: 'none', align: 'center' })).toEqual({
        columns: 4,
        lastRow: [
          { row: 2, column: 2, span: 1 },
          { row: 2, column: 3, span: 1 },
        ],
      })
    })

    it('moves a short row to the end', () => {
      expect(lastRow(rowsOf([2, 1, 1], [2]), { fill: 'none', fillLast: 'none', align: 'end' })).toEqual({
        columns: 4,
        lastRow: [{ row: 2, column: 3, span: 2 }],
      })
    })

    it('does not move stretched rows', () => {
      expect(lastRow(rowsOf([1, 1, 1], [1, 1]), { fill: 'equal-extra', fillLast: 'equal-extra', align: 'end' })).toEqual({
        columns: 6,
        lastRow: [
          { row: 2, column: 1, span: 3 },
          { row: 2, column: 4, span: 3 },
        ],
      })
    })
  })

  describe('maxTracks', () => {
    const twelveAndSeven = () => rowsOf(Array(12).fill(1), Array(7).fill(1))

    it('stretches rows exactly while the tracks fit', () => {
      expect(layoutRows(twelveAndSeven(), { fill: 'equal-extra', fillLast: 'equal-extra', maxTracks: 84 }).columns).toBe(84)
    })

    it('keeps short rows at unit width when stretching them needs too many tracks', () => {
      const { columns, placements } = layoutRows(twelveAndSeven(), { fill: 'equal-extra', fillLast: 'equal-extra', maxTracks: 59 })

      expect(columns).toBe(12)
      expect(placements.slice(12).map((placement) => placement.column)).toEqual([1, 2, 3, 4, 5, 6, 7])
      expect(placements.every((placement) => placement.span === 1)).toBe(true)
    })

    it('aligns the rows it stops stretching', () => {
      const { columns, placements } = layoutRows(twelveAndSeven(), {
        fill: 'equal-extra',
        fillLast: 'equal-extra',
        align: 'center',
        maxTracks: 59,
      })

      expect(columns).toBe(24)
      expect(placements[12]).toEqual({ row: 2, column: 6, span: 2 })
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
