import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAppData } from '../../data/AppDataContext.jsx'
import { useWarehouses } from '../../data/useSites.js'
import { depreciateAsset } from '../../data/depreciation.js'
import { currency, compactCurrency, CHART_COLORS, chartTickStyle, chartAxisLine, chartTooltipStyle, chartLabelStyle, chartItemStyle } from '../../data/reportFormat.js'

export default function InventoryByLocation() {
  const { products, inventoryItems } = useAppData()
  const { warehouses } = useWarehouses()

  const locationRows = useMemo(
    () =>
      warehouses.map((site) => {
        const items = inventoryItems.filter((item) => item.locationId === site.id)
        let grossValue = 0
        let netBookValue = 0
        items.forEach((item) => {
          const product = products.find((entry) => entry.id === item.productId)
          if (!product) return
          const cost = Number(product.purchasePrice) || 0
          grossValue += cost
          netBookValue += depreciateAsset({ cost, placedInServiceDate: item.receivedAt, model: product.depreciationModel }).netBookValue
        })
        return { site, units: items.length, grossValue, netBookValue }
      }),
    [inventoryItems, products, warehouses],
  )

  const totalStockUnits = locationRows.reduce((sum, row) => sum + row.units, 0)
  const totalStockGross = locationRows.reduce((sum, row) => sum + row.grossValue, 0)
  const totalStockNBV = locationRows.reduce((sum, row) => sum + row.netBookValue, 0)

  const unitsChartData = locationRows.map((row) => ({ name: row.site.name, Units: row.units }))
  const valueChartData = locationRows.map((row) => ({ name: row.site.name, Gross: row.grossValue, NBV: row.netBookValue }))

  return (
    <div>
      <p className="page-subtitle">Product units and value currently on hand at each warehouse.</p>

      <div className="kpi-strip">
        <div className="kpi-card">
          <span className="kpi-value">{warehouses.length}</span>
          <span className="kpi-label">Warehouses</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{totalStockUnits}</span>
          <span className="kpi-label">Units In Stock</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{compactCurrency(totalStockGross)}</span>
          <span className="kpi-label">Total Stock Value</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{compactCurrency(totalStockNBV)}</span>
          <span className="kpi-label">Stock Net Book Value</span>
        </div>
      </div>

      <div className="report-grid-2">
        <div className="chart-card">
          <h3>Units by Warehouse</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={unitsChartData} layout="vertical" margin={{ top: 0, right: 24, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_COLORS.grid} />
              <XAxis type="number" allowDecimals={false} tick={chartTickStyle} axisLine={chartAxisLine} tickLine={chartAxisLine} />
              <YAxis type="category" dataKey="name" width={110} tick={chartTickStyle} axisLine={chartAxisLine} tickLine={chartAxisLine} />
              <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartLabelStyle} itemStyle={chartItemStyle} />
              <Bar dataKey="Units" fill={CHART_COLORS.primary} radius={[0, 3, 3, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Gross Value vs. Net Book Value by Warehouse</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={valueChartData} layout="vertical" margin={{ top: 0, right: 24, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_COLORS.grid} />
              <XAxis type="number" tickFormatter={compactCurrency} tick={chartTickStyle} axisLine={chartAxisLine} tickLine={chartAxisLine} />
              <YAxis type="category" dataKey="name" width={110} tick={chartTickStyle} axisLine={chartAxisLine} tickLine={chartAxisLine} />
              <Tooltip formatter={(v) => compactCurrency(v)} contentStyle={chartTooltipStyle} labelStyle={chartLabelStyle} itemStyle={chartItemStyle} />
              <Bar dataKey="Gross" fill={CHART_COLORS.secondary} radius={[0, 3, 3, 0]} barSize={9} />
              <Bar dataKey="NBV" fill={CHART_COLORS.accent} radius={[0, 3, 3, 0]} barSize={9} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Warehouse</th>
              <th>Units</th>
              <th>Gross Value</th>
              <th>Net Book Value</th>
              <th>Depr. %</th>
            </tr>
          </thead>
          <tbody>
            {locationRows.map((row) => {
              const deprPct = row.grossValue > 0 ? (((row.grossValue - row.netBookValue) / row.grossValue) * 100).toFixed(1) : '0.0'
              return (
                <tr key={row.site.id}>
                  <td>{row.site.name}</td>
                  <td>{row.units}</td>
                  <td>{currency(row.grossValue)}</td>
                  <td>{currency(row.netBookValue)}</td>
                  <td>{deprPct}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
