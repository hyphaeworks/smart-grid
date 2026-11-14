import type { Align, FillMode, Row } from './types'

export interface LayoutOptions {
  fill: FillMode
  fillLast: FillMode
  align?: Align
  maxTracks?: number
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

const FREE_SPACE_BEFORE: Record<Align, number> = { start: 0, center: 0.5, end: 1 }

export function layoutRows(rows: Row[], { fill, fillLast, align = 'start', maxTracks = Infinity }: LayoutOptions): Layout {
  if (rows.length === 0) {
    return { columns: 0, placements: [] }
  }

  const totals = rows.map((row) => row.reduce((total, item) => total + item.size, 0))
  const unitColumns = Math.max(...totals)
  let stretched = rows.map((_, index) => (index === rows.length - 1 ? fillLast : fill) === 'equal-extra')
  let columns = countTracks(totals, stretched, unitColumns, align)
  if (columns > maxTracks) {
    stretched = stretched.map((isStretched, index) => isStretched && totals[index] === unitColumns)
    columns = countTracks(totals, stretched, unitColumns, align)
  }

  const placements = rows.flatMap((row, index) => {
    const tracksPerUnit = columns / (stretched[index] ? totals[index] : unitColumns)
    const freeTracks = columns - totals[index] * tracksPerUnit
    let column = 1 + freeTracks * FREE_SPACE_BEFORE[align]
    return row.map((item) => {
      const placement = { row: index + 1, column, span: item.size * tracksPerUnit }
      column += placement.span
      return placement
    })
  })

  return { columns, placements }
}

function countTracks(totals: number[], stretched: boolean[], unitColumns: number, align: Align): number {
  return totals.reduce((count, total, index) => {
    if (stretched[index]) {
      return leastCommonMultiple(count, total)
    }
    const halfUnitOffset = align === 'center' && (unitColumns - total) % 2 === 1
    return leastCommonMultiple(count, halfUnitOffset ? unitColumns * 2 : unitColumns)
  }, 1)
}

function leastCommonMultiple(first: number, second: number): number {
  return (first * second) / greatestCommonDivisor(first, second)
}

function greatestCommonDivisor(first: number, second: number): number {
  return second === 0 ? first : greatestCommonDivisor(second, first % second)
}
