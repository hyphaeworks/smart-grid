import type { Row, RowItem } from './types'

export function buildRows(sizes: number[], maxColumns: number): Row[] {
  if (sizes.length === 0) {
    return []
  }

  const isUniform = sizes.every((size) => size === sizes[0])
  if (isUniform) {
    return buildBalancedRows(sizes, Math.floor(maxColumns / sizes[0]))
  }

  return buildGreedyRows(sizes, maxColumns)
}

function buildGreedyRows(sizes: number[], maxColumns: number): Row[] {
  const rows: Row[] = []
  let currentRow: RowItem[] = []
  let currentRowSize = 0

  sizes.forEach((size, index) => {
    if (currentRowSize + size > maxColumns) {
      if (currentRow.length > 0) {
        rows.push(currentRow)
      }
      currentRow = []
      currentRowSize = 0
    }
    currentRow.push({ index, size })
    currentRowSize += size
  })

  if (currentRow.length > 0) {
    rows.push(currentRow)
  }

  return rows
}

function buildBalancedRows(sizes: number[], itemsPerRow: number): Row[] {
  const itemCount = sizes.length

  if (itemCount <= itemsPerRow) {
    return [sizes.map((size, index) => ({ index, size }))]
  }

  const minRows = Math.ceil(itemCount / itemsPerRow)
  const distribution = calculateBalancedDistribution(itemCount, itemsPerRow, minRows)

  const rows: Row[] = []
  let itemIndex = 0

  for (const rowSize of distribution) {
    const row: RowItem[] = []
    for (let i = 0; i < rowSize; i++) {
      row.push({ index: itemIndex, size: sizes[itemIndex] })
      itemIndex++
    }
    rows.push(row)
  }

  return rows
}

function calculateBalancedDistribution(items: number, itemsPerRow: number, minRows: number): number[] {
  for (let fullRows = minRows - 1; fullRows > 0; fullRows--) {
    const result = tryDistribution(items, itemsPerRow, minRows, fullRows)
    if (result.length && isBalanced(result, itemsPerRow)) {
      return result
    }
  }
  return distributeRemaining(items, minRows)
}

function tryDistribution(items: number, itemsPerRow: number, minRows: number, fullRows: number): number[] {
  const remainingItems = items - fullRows * itemsPerRow
  const remainingRows = minRows - fullRows

  if (remainingItems < 0 || Math.ceil(remainingItems / remainingRows) > itemsPerRow) {
    return []
  }

  const rows = Array(fullRows).fill(itemsPerRow) as number[]
  return rows.concat(distributeRemaining(remainingItems, remainingRows))
}

function distributeRemaining(items: number, rows: number): number[] {
  const distribution: number[] = []
  let remaining = items

  for (let row = 0; row < rows; row++) {
    const rowSize = Math.ceil(remaining / (rows - row))
    distribution.push(rowSize)
    remaining -= rowSize
  }

  return distribution
}

function isBalanced(rows: number[], itemsPerRow: number): boolean {
  return rows[rows.length - 1] / itemsPerRow >= 0.34
}
