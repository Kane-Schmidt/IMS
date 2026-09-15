import { useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAppData } from '../../data/AppDataContext.jsx'
import { useCollection } from '../../data/useCollection.js'
import { computeProductFleetTotals, computeVehicleFleetTotals, projectAssetsDepreciation } from '../../data/depreciation.js'
import { currency, compactCurrency, CHART_COLORS, chartTickStyle, chartAxisLine, chartTooltipStyle, chartLabelStyle, chartItemStyle, chartLegendStyle } from '../../data/reportFormat.js'

const PROJECTION_YEARS = 10

export default function FinancialValuation() {
  const { products, inventoryItems, companyAssumptions, setCompanyAssumptions } = useAppData()
  const { items: vehicles } = useCollection('ims_vehicles')

  const productTotals = computeProductFleetTotals(products, inventoryItems)
  const vehicleTotals = computeVehicleFleetTotals(vehicles)
  const combined = {
    grossCost: productTotals.grossCost + vehicleTotals.grossCost,
    accumulatedDepreciation: productTotals.accumulatedDepreciation + vehicleTotals.accumulatedDepreciation,
    netBookValue: productTotals.netBookValue + vehicleTotals.netBookValue,
  }
  const deprPct = combined.grossCost > 0 ? (combined.accumulatedDepreciation / combined.grossCost) * 100 : 0

  const combinedAssets = useMemo(() => {
    const assets = []
    products.forEach((product) => {
      const cost = Number(product.purchasePrice) || 0
      const model = product.depreciationModel
      inventoryItems
        .filter((item) => item.productId === product.id)
        .forEach((item) => assets.push({ cost, placedInServiceDate: item.receivedAt, model }))
    })
    vehicles.forEach((vehicle) => {
      if (vehicle.purchasePrice && vehicle.inServiceDate) {
        assets.push({ cost: Number(vehicle.purchasePrice) || 0, placedInServiceDate: vehicle.inServiceDate, model: vehicle.depreciationModel })
      }
    })
    return assets
  }, [products, inventoryItems, vehicles])

  const tenYearProjection = useMemo(() => projectAssetsDepreciation(combinedAssets, PROJECTION_YEARS), [combinedAssets])
  const depreciationExpenseByYear = tenYearProjection.slice(1).map((point, i) => ({
    year: point.year,
    Expense: Math.round(point.accumulatedDepreciation - tenYearProjection[i].accumulatedDepreciation),
  }))
  const annualDepreciation = tenYearProjection.length > 1 ? tenYearProjection[0].netBookValue - tenYearProjection[1].netBookValue : 0
  const ebitda = companyAssumptions.monthlyRevenue * 12 * (companyAssumptions.ebitdaMarginPct / 100)
  const impliedEV = ebitda * companyAssumptions.ebitdaMultiple
  const equipPct = impliedEV > 0 ? (combined.netBookValue / impliedEV) * 100 : 0
  const replacementCost = combined.grossCost * 1.08

  const waterfallData = [
    { name: 'Gross Value', value: combined.grossCost, fill: CHART_COLORS.primary },
    { name: 'Accum. Depr.', value: -combined.accumulatedDepreciation, fill: CHART_COLORS.danger },
    { name: 'Net Book Value', value: combined.netBookValue, fill: CHART_COLORS.accent },
  ]
  const categoryBreakdown = [
    { label: 'Product Inventory', Gross: productTotals.grossCost, NBV: productTotals.netBookValue },
    { label: 'Vehicle Fleet', Gross: vehicleTotals.grossCost, NBV: vehicleTotals.netBookValue },
  ]

  function updateAssumption(key, value) {
    setCompanyAssumptions({ [key]: value })
  }

  return (
    <div>
      <p className="page-subtitle">Combined product inventory and vehicle fleet valuation, at today's book value.</p>

      <div className="kpi-strip">
        <div className="kpi-card">
          <span className="kpi-value">{compactCurrency(combined.grossCost)}</span>
          <span className="kpi-label">Total Gross Value</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{compactCurrency(combined.accumulatedDepreciation)}</span>
          <span className="kpi-label">Accum. Depreciation</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{compactCurrency(combined.netBookValue)}</span>
          <span className="kpi-label">Total Net Book Value</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{deprPct.toFixed(1)}%</span>
          <span className="kpi-label">Fleet Depreciation %</span>
        </div>
      </div>

      <div className="report-grid-2">
        <div className="chart-card">
          <h3>Value Bridge — Gross to Net Book Value</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={waterfallData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="name" tick={chartTickStyle} axisLine={chartAxisLine} tickLine={chartAxisLine} />
              <YAxis tickFormatter={compactCurrency} tick={chartTickStyle} axisLine={chartAxisLine} tickLine={chartAxisLine} />
              <Tooltip formatter={(v) => compactCurrency(Math.abs(v))} contentStyle={chartTooltipStyle} labelStyle={chartLabelStyle} itemStyle={chartItemStyle} />
              <Bar dataKey="value" name="Amount" radius={[3, 3, 0, 0]}>
                {waterfallData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Net Book Value by Asset Category</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={categoryBreakdown} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="label" tick={chartTickStyle} axisLine={chartAxisLine} tickLine={chartAxisLine} />
              <YAxis tickFormatter={compactCurrency} tick={chartTickStyle} axisLine={chartAxisLine} tickLine={chartAxisLine} />
              <Tooltip formatter={(v) => compactCurrency(v)} contentStyle={chartTooltipStyle} labelStyle={chartLabelStyle} itemStyle={chartItemStyle} />
              <Legend wrapperStyle={chartLegendStyle} />
              <Bar dataKey="Gross" fill={CHART_COLORS.secondary} radius={[3, 3, 0, 0]} />
              <Bar dataKey="NBV" fill={CHART_COLORS.accent} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="report-grid-2">
        <div className="chart-card">
          <h3>Funding &amp; Acquisition Metrics</h3>
          <div className="ebitda-slider-row">
            <span className="chart-card-note">EBITDA Multiple</span>
            <input
              type="range"
              min={4}
              max={16}
              step={0.5}
              value={companyAssumptions.ebitdaMultiple}
              onChange={(e) => updateAssumption('ebitdaMultiple', Number(e.target.value))}
            />
            <span className="ebitda-slider-value">{companyAssumptions.ebitdaMultiple}×</span>
          </div>
          <div className="report-row">
            <span className="report-row-label">EBITDA (annual)</span>
            <span className="report-row-value">{compactCurrency(ebitda)}</span>
          </div>
          <div className="report-row">
            <span className="report-row-label">Implied Enterprise Value</span>
            <span className="report-row-value accent">{compactCurrency(impliedEV)}</span>
          </div>
          <div className="report-row">
            <span className="report-row-label">Equipment NBV</span>
            <span className="report-row-value">{compactCurrency(combined.netBookValue)}</span>
          </div>
          <div className="report-row">
            <span className="report-row-label">Equipment % of EV</span>
            <span className="report-row-value">{equipPct.toFixed(1)}%</span>
          </div>
          <div className="report-row">
            <span className="report-row-label">Est. Collateral Value (70% LTV)</span>
            <span className="report-row-value positive">{compactCurrency(combined.netBookValue * 0.7)}</span>
          </div>
          <div className="report-row total">
            <span className="report-row-label">Fleet Replacement Cost</span>
            <span className="report-row-value">{compactCurrency(replacementCost)}</span>
          </div>
        </div>

        <div className="chart-card">
          <h3>Annual Depreciation Expense — 10-Year Projection</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={depreciationExpenseByYear} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="year" tick={chartTickStyle} axisLine={chartAxisLine} tickLine={chartAxisLine} />
              <YAxis tickFormatter={compactCurrency} tick={chartTickStyle} axisLine={chartAxisLine} tickLine={chartAxisLine} />
              <Tooltip formatter={(v) => compactCurrency(v)} contentStyle={chartTooltipStyle} labelStyle={chartLabelStyle} itemStyle={chartItemStyle} />
              <Line type="monotone" dataKey="Expense" stroke={CHART_COLORS.primary} strokeWidth={2} dot={{ r: 4, fill: CHART_COLORS.primary }} name="Depreciation Expense" />
            </LineChart>
          </ResponsiveContainer>
          <p className="chart-card-note">This year's expense: {currency(annualDepreciation)}</p>
        </div>
      </div>
    </div>
  )
}
