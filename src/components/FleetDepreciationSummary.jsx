import TrendChart from './TrendChart.jsx'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

export function currency(value) {
  return currencyFormatter.format(Number(value) || 0)
}

// KPI strip + trend chart + year-by-year schedule table shared by the
// product fleet and the vehicle fleet sections of Finance > Depreciation.
export default function FleetDepreciationSummary({ unitsLabel, totals, chartLabel, projection }) {
  const chartData = projection.map((point) => ({ year: point.year, value: point.netBookValue }))

  return (
    <>
      <div className="kpi-strip">
        <div className="kpi-card">
          <span className="kpi-value">{totals.unitsOwned}</span>
          <span className="kpi-label">{unitsLabel}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{currency(totals.grossCost)}</span>
          <span className="kpi-label">Gross Cost</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{currency(totals.accumulatedDepreciation)}</span>
          <span className="kpi-label">Accumulated Depreciation</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{currency(totals.netBookValue)}</span>
          <span className="kpi-label">Net Book Value</span>
        </div>
      </div>

      <div className="chart-card">
        <h3>Net Book Value Trend</h3>
        <TrendChart data={chartData} label={chartLabel} />
      </div>

      <details className="schedule-details">
        <summary>Year-by-year depreciation schedule</summary>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Gross Cost</th>
                <th>Accum. Depreciation</th>
                <th>Net Book Value</th>
              </tr>
            </thead>
            <tbody>
              {projection.map((point, index) => (
                <tr key={point.year}>
                  <td>
                    {point.year}
                    {index === 0 ? ' (today)' : ''}
                  </td>
                  <td>{currency(point.grossCost)}</td>
                  <td>{currency(point.accumulatedDepreciation)}</td>
                  <td>{currency(point.netBookValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  )
}
