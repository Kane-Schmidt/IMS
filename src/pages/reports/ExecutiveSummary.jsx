import { useMemo } from 'react'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useAppData } from '../../data/AppDataContext.jsx'
import { useCollection } from '../../data/useCollection.js'
import { TRUCKS } from '../../data/sites.js'
import { computeProductFleetTotals, computeVehicleFleetTotals, projectAssetsDepreciation } from '../../data/depreciation.js'
import { currency, compactCurrency, CHART_COLORS, chartTickStyle, chartAxisLine, chartTooltipStyle, chartLabelStyle, chartItemStyle, chartLegendStyle } from '../../data/reportFormat.js'

export default function ExecutiveSummary() {
  const { products, inventoryItems, companyAssumptions, setCompanyAssumptions } = useAppData()
  const { items: vehicles } = useCollection('ims_vehicles')

  const productTotals = computeProductFleetTotals(products, inventoryItems)
  const vehicleTotals = computeVehicleFleetTotals(vehicles)
  const combined = {
    grossCost: productTotals.grossCost + vehicleTotals.grossCost,
    accumulatedDepreciation: productTotals.accumulatedDepreciation + vehicleTotals.accumulatedDepreciation,
    netBookValue: productTotals.netBookValue + vehicleTotals.netBookValue,
  }

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

  const oneYearProjection = useMemo(() => projectAssetsDepreciation(combinedAssets, 1), [combinedAssets])
  const annualDepreciation = oneYearProjection.length > 1 ? oneYearProjection[0].netBookValue - oneYearProjection[1].netBookValue : 0

  const annualRevenue = companyAssumptions.monthlyRevenue * 12
  const ebitda = annualRevenue * (companyAssumptions.ebitdaMarginPct / 100)
  const ebit = ebitda - annualDepreciation
  const impliedEV = ebitda * companyAssumptions.ebitdaMultiple
  const equipPct = impliedEV > 0 ? (combined.netBookValue / impliedEV) * 100 : 0
  const nbvPerSub = companyAssumptions.subscribers > 0 ? combined.netBookValue / companyAssumptions.subscribers : 0
  const replacementCost = combined.grossCost * 1.08

  const monthlyMovement = useMemo(() => {
    const months = []
    const now = new Date()
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-US', { month: 'short' }), Received: 0 })
    }
    inventoryItems.forEach((item) => {
      const d = new Date(item.receivedAt)
      const bucket = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`)
      if (bucket) bucket.Received += 1
    })
    return months
  }, [inventoryItems])

  const onTrucksCount = inventoryItems.filter((item) => TRUCKS.some((truck) => truck.id === item.locationId)).length
  const compositionData = [
    { name: 'In Warehouses', value: inventoryItems.length - onTrucksCount, fill: CHART_COLORS.primary },
    { name: 'On Trucks', value: onTrucksCount, fill: CHART_COLORS.accent },
  ]

  function updateAssumption(key, value) {
    setCompanyAssumptions({ [key]: value })
  }

  return (
    <div>
      <p className="page-subtitle">Combined product inventory and vehicle fleet, with company-wide valuation context.</p>

      <div className="kpi-strip">
        <div className="kpi-card">
          <span className="kpi-value">{productTotals.unitsOwned}</span>
          <span className="kpi-label">Product Units In Stock</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{compactCurrency(combined.grossCost)}</span>
          <span className="kpi-label">Fixed Asset Gross Cost</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{compactCurrency(combined.netBookValue)}</span>
          <span className="kpi-label">Net Book Value</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{compactCurrency(annualDepreciation)}</span>
          <span className="kpi-label">Annual Depr. Expense</span>
        </div>
      </div>

      <div className="report-grid-2">
        <div className="chart-card">
          <h3>12-Month Receiving Activity</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyMovement} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gReceived" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="label" tick={chartTickStyle} axisLine={chartAxisLine} tickLine={chartAxisLine} />
              <YAxis allowDecimals={false} tick={chartTickStyle} axisLine={chartAxisLine} tickLine={chartAxisLine} />
              <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartLabelStyle} itemStyle={chartItemStyle} />
              <Area type="monotone" dataKey="Received" stroke={CHART_COLORS.primary} fill="url(#gReceived)" strokeWidth={2} name="Units Received" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Stock Location Mix</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={compositionData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                {compositionData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${v} units`} contentStyle={chartTooltipStyle} labelStyle={chartLabelStyle} itemStyle={chartItemStyle} />
              <Legend iconSize={8} wrapperStyle={chartLegendStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="report-grid-3">
        <div className="chart-card">
          <h3>Company Assumptions</h3>
          <p className="chart-card-note">Not tracked by inventory — set for valuation context.</p>
          <label className="assumption-field">
            <span>Monthly Revenue ($)</span>
            <input
              type="number"
              min="0"
              value={companyAssumptions.monthlyRevenue}
              onChange={(e) => updateAssumption('monthlyRevenue', Number(e.target.value) || 0)}
            />
          </label>
          <label className="assumption-field">
            <span>EBITDA Margin (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              value={companyAssumptions.ebitdaMarginPct}
              onChange={(e) => updateAssumption('ebitdaMarginPct', Number(e.target.value) || 0)}
            />
          </label>
          <label className="assumption-field">
            <span>Subscribers</span>
            <input
              type="number"
              min="0"
              value={companyAssumptions.subscribers}
              onChange={(e) => updateAssumption('subscribers', Number(e.target.value) || 0)}
            />
          </label>
        </div>

        <div className="chart-card">
          <h3>Buyout Scenario</h3>
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
            <span className="report-row-label">Implied Enterprise Value</span>
            <span className="report-row-value accent">{compactCurrency(impliedEV)}</span>
          </div>
          <div className="report-row">
            <span className="report-row-label">Equipment Net Book Value</span>
            <span className="report-row-value positive">{compactCurrency(combined.netBookValue)}</span>
          </div>
          <div className="report-row">
            <span className="report-row-label">Equipment as % of EV</span>
            <span className="report-row-value">{equipPct.toFixed(1)}%</span>
          </div>
          <div className="report-row">
            <span className="report-row-label">Replacement Cost (est.)</span>
            <span className="report-row-value">{compactCurrency(replacementCost)}</span>
          </div>
          <div className="report-row total">
            <span className="report-row-label">Asset-Backed Collateral (70%)</span>
            <span className="report-row-value positive">{compactCurrency(combined.netBookValue * 0.7)}</span>
          </div>
        </div>

        <div className="chart-card">
          <h3>Income Statement Impact</h3>
          <div className="report-row">
            <span className="report-row-label">Annual Revenue</span>
            <span className="report-row-value">{currency(annualRevenue)}</span>
          </div>
          <div className="report-row">
            <span className="report-row-label">EBITDA</span>
            <span className="report-row-value positive">{currency(ebitda)}</span>
          </div>
          <div className="report-row">
            <span className="report-row-label">Less: Depreciation &amp; Amort.</span>
            <span className="report-row-value danger">({currency(annualDepreciation)})</span>
          </div>
          <div className="report-row total">
            <span className="report-row-label">EBIT</span>
            <span className="report-row-value">{currency(ebit)}</span>
          </div>
          {companyAssumptions.subscribers > 0 && (
            <div className="report-row">
              <span className="report-row-label">Equipment NBV / Subscriber</span>
              <span className="report-row-value">{currency(nbvPerSub)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
