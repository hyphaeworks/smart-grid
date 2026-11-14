import { parseSize } from './parse-size'
import { buildRows } from './build-rows'
import { layoutRows } from './layout-rows'
import { applyPlacements } from './apply-placements'
import { createUnitResolver, type UnitResolver } from './utils/resolve-to-pixels'
import type { Align, FillMode } from './types'

const MAX_COLUMNS = 12
const DEFAULT_COLUMNS = 3
const MIN_TRACK_WIDTH = 1

class SmartGrid extends HTMLElement {
  static observedAttributes = ['columns', 'fill', 'fill-last', 'align']

  private mutationObserver: MutationObserver | null = null
  private resizeObserver: ResizeObserver | null = null
  private unitResolver: UnitResolver | null = null
  private effectiveColumnsValue = 0
  private lastCssProps = ''
  private lastWidth = -1

  connectedCallback(): void {
    this.unitResolver = createUnitResolver(this)
    this.syncColumnsProperty()
    this.setupObservers()
    this.applyLayout()
  }

  disconnectedCallback(): void {
    this.mutationObserver?.disconnect()
    this.mutationObserver = null
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.unitResolver = null
    window.visualViewport?.removeEventListener('resize', this.handleViewportResize)
  }

  attributeChangedCallback(): void {
    if (!this.isConnected) {
      return
    }
    this.syncColumnsProperty()
    this.applyLayout()
  }

  get columns(): number {
    const attr = this.getAttribute('columns')
    const parsed = attr ? parseInt(attr, 10) : DEFAULT_COLUMNS
    const value = isNaN(parsed) ? DEFAULT_COLUMNS : parsed
    return Math.max(1, Math.min(MAX_COLUMNS, value))
  }

  set columns(value: number) {
    this.setAttribute('columns', String(value))
  }

  get fill(): FillMode {
    return this.getAttribute('fill') === 'none' ? 'none' : 'equal-extra'
  }

  set fill(value: FillMode) {
    this.setAttribute('fill', value)
  }

  get fillLast(): FillMode {
    const attr = this.getAttribute('fill-last')
    if (attr === 'none') {
      return 'none'
    }
    if (attr === 'equal-extra') {
      return 'equal-extra'
    }
    return this.fill
  }

  set fillLast(value: FillMode) {
    this.setAttribute('fill-last', value)
  }

  get align(): Align {
    const attribute = this.getAttribute('align')
    return attribute === 'center' || attribute === 'end' ? attribute : 'start'
  }

  set align(value: Align) {
    this.setAttribute('align', value)
  }

  get effectiveColumns(): number {
    return this.effectiveColumnsValue
  }

  private applyLayout(): void {
    const items = this.getItems()

    if (items.length === 0) {
      this.style.removeProperty('--grid-columns')
      this.effectiveColumnsValue = 0
      return
    }

    const containerWidth = this.contentWidth()
    this.lastWidth = containerWidth
    const maxColumns = this.calculateEffectiveColumns(containerWidth, items)
    this.effectiveColumnsValue = maxColumns

    const sizes = items.map((item) => parseSize(item, maxColumns))
    const rows = buildRows(sizes, maxColumns)
    const layout = layoutRows(rows, {
      fill: this.fill,
      fillLast: this.fillLast,
      align: this.align,
      maxTracks: this.maxTracks(containerWidth),
    })

    this.style.setProperty('--grid-columns', layout.columns.toString())
    applyPlacements(items, layout.placements)
    this.mutationObserver?.takeRecords()
  }

  private contentWidth(): number {
    const styles = getComputedStyle(this)
    return this.clientWidth - (parseFloat(styles.paddingLeft) || 0) - (parseFloat(styles.paddingRight) || 0)
  }

  private maxTracks(width: number): number {
    if (width <= 0) {
      return Infinity
    }
    const gap = parseFloat(getComputedStyle(this).columnGap) || 0
    return Math.floor((width + gap) / (MIN_TRACK_WIDTH + gap))
  }

  private setupObservers(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      const relevant = mutations.filter((mutation) => this.affectsLayout(mutation))
      if (relevant.length === 0) {
        return
      }
      if (relevant.some((mutation) => mutation.type === 'attributes')) {
        this.unitResolver?.clearCache()
      }
      this.applyLayout()
    })
    this.mutationObserver.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-size'],
    })

    this.resizeObserver = new ResizeObserver(() => {
      if (this.contentWidth() !== this.lastWidth) {
        this.handleResize()
      }
    })
    this.resizeObserver.observe(this)

    window.visualViewport?.addEventListener('resize', this.handleViewportResize)
  }

  private affectsLayout(mutation: MutationRecord): boolean {
    if (mutation.target === this) {
      return true
    }
    return mutation.attributeName === 'data-size' && mutation.target.parentElement === this
  }

  private handleViewportResize = (): void => {
    this.unitResolver?.clearCache()
    this.applyLayout()
  }

  private handleResize(): void {
    this.unitResolver?.clearCache()
    this.applyLayout()
  }

  private syncColumnsProperty(): void {
    this.style.setProperty('--columns', this.columns.toString())
  }

  private getItems(): HTMLElement[] {
    return Array.from(this.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
  }

  private calculateEffectiveColumns(width: number, items: HTMLElement[]): number {
    if (width <= 0 || !this.unitResolver) {
      return this.columns
    }

    const minWidths = this.getMinWidthConfig()
    if (!minWidths) {
      return this.columns
    }

    this.invalidateCacheIfStylesChanged(minWidths)

    const gap = this.resolveGap(minWidths)
    const sizesPresent = this.collectItemSizes(items)
    const minWidthPerUnit = this.calculateMinWidthPerUnit(minWidths, sizesPresent)

    if (minWidthPerUnit === 0) {
      return this.columns
    }

    return this.fitColumnsToWidth(width, gap, minWidthPerUnit)
  }

  private getMinWidthConfig(): MinWidthConfig | null {
    const styles = getComputedStyle(this)
    const small = styles.getPropertyValue('--smart-grid-min-width').trim()
    const medium = styles.getPropertyValue('--smart-grid-min-width-medium').trim()
    const large = styles.getPropertyValue('--smart-grid-min-width-large').trim()

    if (!small && !medium && !large) {
      return null
    }

    return {
      small,
      medium,
      large,
      gap: styles.getPropertyValue('--smart-grid-gap').trim(),
      computedColumnGap: styles.columnGap,
      fontSize: styles.fontSize,
      rootFontSize: getComputedStyle(document.documentElement).fontSize,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    }
  }

  private invalidateCacheIfStylesChanged(config: MinWidthConfig): void {
    const cacheKey = `${config.small}|${config.medium}|${config.large}|${config.gap}|${config.computedColumnGap}|${config.fontSize}|${config.rootFontSize}|${config.viewportWidth}|${config.viewportHeight}`
    if (cacheKey !== this.lastCssProps) {
      this.unitResolver!.clearCache()
      this.lastCssProps = cacheKey
    }
  }

  private resolveGap(config: MinWidthConfig): number {
    if (config.gap) {
      return this.unitResolver!.resolve(config.gap)
    }
    return parseFloat(config.computedColumnGap) || 0
  }

  private collectItemSizes(items: HTMLElement[]): Set<string> {
    return new Set(items.map((item) => item.dataset.size || 'small'))
  }

  private calculateMinWidthPerUnit(config: MinWidthConfig, sizesPresent: Set<string>): number {
    let maxMinWidthPerUnit = 0

    if (config.small) {
      maxMinWidthPerUnit = this.unitResolver!.resolve(config.small)
    }

    if (sizesPresent.has('medium') && config.medium) {
      const perUnit = this.unitResolver!.resolve(config.medium) / 2
      maxMinWidthPerUnit = Math.max(maxMinWidthPerUnit, perUnit)
    }

    if (sizesPresent.has('large') && config.large) {
      const perUnit = this.unitResolver!.resolve(config.large) / 3
      maxMinWidthPerUnit = Math.max(maxMinWidthPerUnit, perUnit)
    }

    return maxMinWidthPerUnit
  }

  private fitColumnsToWidth(width: number, gap: number, minWidthPerUnit: number): number {
    const columnsThatFit = Math.floor((width + gap) / (minWidthPerUnit + gap))
    return Math.min(Math.max(1, columnsThatFit), this.columns)
  }
}

interface MinWidthConfig {
  small: string
  medium: string
  large: string
  gap: string
  computedColumnGap: string
  fontSize: string
  rootFontSize: string
  viewportWidth: number
  viewportHeight: number
}

if (!customElements.get('smart-grid')) {
  customElements.define('smart-grid', SmartGrid)
}

export { SmartGrid }
