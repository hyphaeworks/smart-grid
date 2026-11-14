import type { FillMode, Row } from './types'

export interface LayoutOptions {
  fill: FillMode
  fillLast: FillMode
}

export interface Layout {
  columns: number
  spans: number[]
}

export function layoutRows(rows: Row[], { fill, fillLast }: LayoutOptions): Layout {
  if (rows.length === 0) {
    return { columns: 0, spans: [] }
  }

  const totals = rows.map((row) => row.reduce((total, item) => total + item.size, 0))
  const unitColumns = Math.max(...totals)
  const stretched = rows.map((_, index) => (index === rows.length - 1 ? fillLast : fill) === 'equal-extra')
  const columns = totals.reduce(
    (count, total, index) => leastCommonMultiple(count, stretched[index] ? total : unitColumns),
    1,
  )

  const spans = rows.flatMap((row, index) => {
    const tracksPerUnit = columns / (stretched[index] ? totals[index] : unitColumns)
    return row.map((item) => item.size * tracksPerUnit)
  })

  return { columns, spans }
}

function leastCommonMultiple(first: number, second: number): number {
  return (first * second) / greatestCommonDivisor(first, second)
}

function greatestCommonDivisor(first: number, second: number): number {
  return second === 0 ? first : greatestCommonDivisor(second, first % second)
}
