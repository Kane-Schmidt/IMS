import { useRef, useState } from 'react'

const WIDTH = 640
const HEIGHT = 240
const PADDING = { top: 16, right: 16, bottom: 32, left: 64 }
const INNER_WIDTH = WIDTH - PADDING.left - PADDING.right
const INNER_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom

const compactFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

function niceStep(rough) {
  if (rough <= 0) return 1
  const exponent = Math.floor(Math.log10(rough))
  const fraction = rough / 10 ** exponent
  let niceFraction
  if (fraction <= 1) niceFraction = 1
  else if (fraction <= 2) niceFraction = 2
  else if (fraction <= 5) niceFraction = 5
  else niceFraction = 10
  return niceFraction * 10 ** exponent
}

function buildYTicks(maxValue, tickCount = 4) {
  if (maxValue <= 0) return { ticks: [0], niceMax: 1 }
  const step = niceStep(maxValue / tickCount)
  const niceMax = step * Math.ceil(maxValue / step)
  const ticks = []
  for (let value = 0; value <= niceMax; value += step) ticks.push(value)
  return { ticks, niceMax }
}

// Single-series line chart (net book value over time): 2px line, ~10%
// opacity area wash, an end marker + direct end-label, recessive hairline
// gridlines, and a crosshair+tooltip on hover. No legend — one series, and
// the chart title already names it.
export default function TrendChart({ data, label }) {
  const svgRef = useRef(null)
  const [hoverIndex, setHoverIndex] = useState(null)

  const maxValue = Math.max(...data.map((point) => point.value), 0)
  const { ticks, niceMax } = buildYTicks(maxValue)

  function xScale(index) {
    if (data.length <= 1) return PADDING.left
    return PADDING.left + (index / (data.length - 1)) * INNER_WIDTH
  }

  function yScale(value) {
    return PADDING.top + INNER_HEIGHT - (value / niceMax) * INNER_HEIGHT
  }

  const linePath = data
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xScale(index).toFixed(1)} ${yScale(point.value).toFixed(1)}`)
    .join(' ')

  const areaPath = `${linePath} L ${xScale(data.length - 1).toFixed(1)} ${PADDING.top + INNER_HEIGHT} L ${xScale(0).toFixed(1)} ${PADDING.top + INNER_HEIGHT} Z`

  function handlePointerMove(event) {
    const svg = svgRef.current
    if (!svg || data.length === 0) return
    const rect = svg.getBoundingClientRect()
    const scaleX = WIDTH / rect.width
    const xInSvg = (event.clientX - rect.left) * scaleX
    const ratio = (xInSvg - PADDING.left) / INNER_WIDTH
    const index = Math.round(ratio * (data.length - 1))
    setHoverIndex(Math.max(0, Math.min(index, data.length - 1)))
  }

  const hovered = hoverIndex !== null ? data[hoverIndex] : null
  const lastPoint = data[data.length - 1]
  const tooltipOnLeft = hoverIndex !== null && hoverIndex > data.length - 3

  return (
    <svg
      ref={svgRef}
      className="trend-chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={label}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setHoverIndex(null)}
    >
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={yScale(tick)}
            y2={yScale(tick)}
            className="trend-chart-gridline"
          />
          <text x={PADDING.left - 10} y={yScale(tick)} className="trend-chart-axis-label" textAnchor="end" dy="0.32em">
            {compactFormatter.format(tick)}
          </text>
        </g>
      ))}

      {data.map((point, index) => {
        if (index !== 0 && index !== data.length - 1 && index % 2 !== 0) return null
        return (
          <text
            key={point.year}
            x={xScale(index)}
            y={HEIGHT - 8}
            className="trend-chart-axis-label"
            textAnchor="middle"
          >
            {point.year}
          </text>
        )
      })}

      <path d={areaPath} className="trend-chart-area" />
      <path d={linePath} className="trend-chart-line" />

      <circle cx={xScale(data.length - 1)} cy={yScale(lastPoint.value)} r="5" className="trend-chart-end-dot" />
      <text
        x={xScale(data.length - 1) - 8}
        y={yScale(lastPoint.value) - 12}
        className="trend-chart-end-label"
        textAnchor="end"
      >
        {compactFormatter.format(lastPoint.value)}
      </text>

      {hovered && (
        <g>
          <line
            x1={xScale(hoverIndex)}
            x2={xScale(hoverIndex)}
            y1={PADDING.top}
            y2={PADDING.top + INNER_HEIGHT}
            className="trend-chart-crosshair"
          />
          <circle cx={xScale(hoverIndex)} cy={yScale(hovered.value)} r="5" className="trend-chart-hover-dot" />
          <g transform={`translate(${xScale(hoverIndex) + (tooltipOnLeft ? -132 : 12)}, ${Math.max(PADDING.top, yScale(hovered.value) - 32)})`}>
            <rect width="120" height="44" rx="4" className="trend-chart-tooltip-bg" />
            <text x="10" y="18" className="trend-chart-tooltip-value">
              {compactFormatter.format(hovered.value)}
            </text>
            <text x="10" y="34" className="trend-chart-tooltip-label">
              {hovered.year}
            </text>
          </g>
        </g>
      )}
    </svg>
  )
}
