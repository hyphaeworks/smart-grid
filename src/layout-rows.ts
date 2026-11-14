import type { FillMode, Row } from './types'

export interface LayoutOptions {
  fill: FillMode
  fillLast: FillMode
}

export interface Placement {
  row: number
  column: number
  span: number
}

export interface Layout {
  columns: number
  placements: Placement[]
}

export function layoutRows(rows: Row[], { fill, fillLast }: LayoutOptions): Layout {
  if (rows.length === 0) {
    return { columns: 0, placements: [] }
  }

  const totals = rows.map((row) => row.reduce((total, item) => total + item.size, 0))
  const unitColumns = Math.max(...totals)
  const stretched = rows.map((_, index) => (index === rows.length - 1 ? fillLast : fill) === 'equal-extra')
  const columns = totals.reduce(
    (count, total, index) => leastCommonMultiple(count, stretched[index] ? total : unitColumns),
    1,
  )

  const placements = rows.flatMap((row, index) => {
    const tracksPerUnit = columns / (stretched[index] ? totals[index] : unitColumns)
    let column = 1
    return row.map((item) => {
      const placement = { row: index + 1, column, span: item.size * tracksPerUnit }
      column += placement.span
      return placement
    })
  })

  return { columns, placements }
}

function leastCommonMultiple(first: number, second: number): number {
  return (first * second) / greatestCommonDivisor(first, second)
}

function greatestCommonDivisor(first: number, second: number): number {
  return second === 0 ? first : greatestCommonDivisor(second, first % second)
}
