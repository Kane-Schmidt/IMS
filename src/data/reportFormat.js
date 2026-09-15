const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

export function currency(value) {
  return currencyFormatter.format(Number(value) || 0)
}

export function compactCurrency(value) {
  const v = Number(value) || 0
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return `$${Math.round(v).toLocaleString()}`
}

// Chart colors pulled from the app's own brand tokens (index.css :root), so
// the report charts read as part of this app rather than an embedded widget.
export const CHART_COLORS = {
  primary: '#1B4FCC', // --color-steel-blue
  accent: '#F4C542', // --color-signal-yellow
  danger: '#E63946', // --color-alert-red
  secondary: '#7C8DB5',
  grid: '#2A2A3A', // --color-border
  text: '#F5F5F7', // --color-text
  textMuted: '#9A9AAE', // --color-text-muted
  tooltipBg: '#0A0A14', // --color-carbon-black
  panel: '#14141F', // --color-panel
}

export const chartTickStyle = { fill: CHART_COLORS.textMuted, fontSize: 11 }
export const chartAxisLine = { stroke: CHART_COLORS.grid }
export const chartTooltipStyle = {
  background: CHART_COLORS.tooltipBg,
  border: `1px solid ${CHART_COLORS.grid}`,
  borderRadius: 4,
  fontSize: 12,
}
export const chartLabelStyle = { color: CHART_COLORS.textMuted }
export const chartItemStyle = { color: CHART_COLORS.text }
export const chartLegendStyle = { fontSize: 11, color: CHART_COLORS.textMuted }
