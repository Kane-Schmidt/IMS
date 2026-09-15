import { useMemo, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useAppData } from '../data/AppDataContext.jsx'
import { useCollection } from '../data/useCollection.js'
import { WAREHOUSES, TRUCKS } from '../data/sites.js'
import { computeProductFleetTotals, computeVehicleFleetTotals, projectAssetsDepreciation, depreciateAsset } from '../data/depreciation.js'

// Power BI-style palette — deliberately a light canvas (Segoe UI, navy/gold),
// distinct from the rest of this app's dark theme, since this view is meant
// to read as an embedded BI report rather than another app screen.
const C = {
  pbiDark: '#252423',
  pbiMid: '#3B3A39',
  pbiCanvas: '#F0F2F5',
  pbiTile: '#FFFFFF',
  navy: '#0A3273',
  gold: '#D5BA7C',
  blue: '#1A649E',
  slate: '#32353A',
  ice: '#EEF2F6',
  caramel: '#AA8D79',
  msGreen: '#107C10',
  msAmber: '#F7630C',
  msRed: '#A4262C',
  border: '#E1DFDD',
  text: '#323130',
  textMid: '#605E5C',
  textLight: '#A19F9D',
}
const seg = { fontFamily: "'Segoe UI', system-ui, sans-serif" }
const tile = { background: C.pbiTile, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,.12)', padding: 16 }

const fmt = (n, dec = 0) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
const fmtUSD = (n, compact = false) => {
  const v = Number(n) || 0
  if (compact && Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (compact && Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return '$' + fmt(Math.round(v))
}

const KPI = ({ label, value, sub, color }) => (
  <div style={{ ...tile }}>
    <div style={{ fontSize: 11, color: C.textMid, ...seg, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 600, color: color || C.navy, ...seg, lineHeight: 1.1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: C.textMid, marginTop: 4, ...seg }}>{sub}</div>}
  </div>
)

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, ...seg, marginBottom: 8 }}>{children}</div>
)

const Row = ({ label, value, bold, color, border }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '5px 0',
      borderBottom: border ? 'none' : `1px solid ${C.border}`,
      borderTop: border ? `2px solid ${C.navy}` : 'none',
      marginTop: border ? 4 : 0,
    }}
  >
    <span style={{ fontSize: 11, color: bold ? C.text : C.textMid, fontWeight: bold ? 600 : 400, ...seg }}>{label}</span>
    <span style={{ fontSize: 12, fontWeight: bold ? 700 : 600, color: color || C.text, ...seg }}>{value}</span>
  </div>
)

const TT = ({ active, payload, label, compact }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 2, padding: '8px 12px', fontSize: 12, ...seg, boxShadow: '0 2px 8px rgba(0,0,0,.15)' }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: {typeof p.value === 'number' ? (compact ? fmtUSD(p.value, true) : fmt(p.value)) : p.value}
        </div>
      ))}
    </div>
  )
}

export default function ExecutiveDashboard() {
  const { products, inventoryItems, companyAssumptions, setCompanyAssumptions } = useAppData()
  const { items: vehicles } = useCollection('ims_vehicles')
  const [page, setPage] = useState(0)

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

  const tenYearProjection = useMemo(() => projectAssetsDepreciation(combinedAssets, 10), [combinedAssets])
  const annualDepreciation = tenYearProjection.length > 1 ? tenYearProjection[0].netBookValue - tenYearProjection[1].netBookValue : 0
  const depreciationExpenseByYear = tenYearProjection.slice(1).map((point, i) => ({
    year: point.year,
    Expense: Math.round(point.accumulatedDepreciation - tenYearProjection[i].accumulatedDepreciation),
  }))

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
    { name: 'In Warehouses', value: inventoryItems.length - onTrucksCount, fill: C.navy },
    { name: 'On Trucks', value: onTrucksCount, fill: C.gold },
  ]

  const locationRows = useMemo(
    () =>
      WAREHOUSES.map((site) => {
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
    [inventoryItems, products],
  )
  const totalStockUnits = locationRows.reduce((sum, row) => sum + row.units, 0)
  const totalStockGross = locationRows.reduce((sum, row) => sum + row.grossValue, 0)
  const totalStockNBV = locationRows.reduce((sum, row) => sum + row.netBookValue, 0)

  const waterfallData = [
    { name: 'Gross Value', value: combined.grossCost, fill: C.navy },
    { name: 'Accum. Depr.', value: -combined.accumulatedDepreciation, fill: C.msRed },
    { name: 'Net Book Value', value: combined.netBookValue, fill: C.msGreen },
  ]
  const categoryBreakdown = [
    { label: 'Product Inventory', gross: productTotals.grossCost, nbv: productTotals.netBookValue },
    { label: 'Vehicle Fleet', gross: vehicleTotals.grossCost, nbv: vehicleTotals.netBookValue },
  ]

  function updateAssumption(key, value) {
    setCompanyAssumptions({ [key]: value })
  }

  const pages = ['Executive Summary', 'Inventory by Location', 'Financial Valuation']
  const pageIcons = ['◉', '◫', '◈']

  const PageExecutive = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <KPI label="Product Units In Stock" value={fmt(productTotals.unitsOwned)} sub="across all warehouses" />
        <KPI label="Fixed Asset Gross Cost" value={fmtUSD(combined.grossCost, true)} sub="products + vehicles" color={C.blue} />
        <KPI label="Net Book Value" value={fmtUSD(combined.netBookValue, true)} sub="after depreciation" color={C.msGreen} />
        <KPI label="Annual Depr. Expense" value={fmtUSD(annualDepreciation, true)} sub="EBITDA add-back" color={C.caramel} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
        <div style={tile}>
          <SectionTitle>12-Month Receiving Activity</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyMovement} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gReceived" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.navy} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={C.navy} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: 'Segoe UI' }} />
              <YAxis tick={{ fontSize: 11, fontFamily: 'Segoe UI' }} allowDecimals={false} />
              <Tooltip content={<TT />} />
              <Area type="monotone" dataKey="Received" stroke={C.navy} fill="url(#gReceived)" strokeWidth={2} name="Units Received" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={tile}>
          <SectionTitle>Stock Location Mix</SectionTitle>
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie data={compositionData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                {compositionData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${fmt(v)} units`} contentStyle={{ fontSize: 11, fontFamily: 'Segoe UI' }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10, fontFamily: 'Segoe UI' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...tile, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <SectionTitle>Company Assumptions</SectionTitle>
          <div style={{ fontSize: 10, color: C.textMid, ...seg, marginBottom: 6 }}>
            Not tracked by inventory — set these for valuation context.
          </div>
          <label style={{ fontSize: 11, color: C.text, ...seg }}>
            Monthly Revenue
            <input
              type="number"
              min="0"
              value={companyAssumptions.monthlyRevenue}
              onChange={(e) => updateAssumption('monthlyRevenue', Number(e.target.value) || 0)}
              style={{ width: '100%', marginTop: 2, marginBottom: 8, padding: '4px 6px', fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 2 }}
            />
          </label>
          <label style={{ fontSize: 11, color: C.text, ...seg }}>
            EBITDA Margin %
            <input
              type="number"
              min="0"
              max="100"
              value={companyAssumptions.ebitdaMarginPct}
              onChange={(e) => updateAssumption('ebitdaMarginPct', Number(e.target.value) || 0)}
              style={{ width: '100%', marginTop: 2, marginBottom: 8, padding: '4px 6px', fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 2 }}
            />
          </label>
          <label style={{ fontSize: 11, color: C.text, ...seg }}>
            Subscribers
            <input
              type="number"
              min="0"
              value={companyAssumptions.subscribers}
              onChange={(e) => updateAssumption('subscribers', Number(e.target.value) || 0)}
              style={{ width: '100%', marginTop: 2, padding: '4px 6px', fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 2 }}
            />
          </label>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div style={tile}>
          <SectionTitle>Buyout Scenario — Equipment as Asset</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, ...seg, color: C.textMid }}>EBITDA Multiple</span>
            <input
              type="range"
              min={4}
              max={16}
              step={0.5}
              value={companyAssumptions.ebitdaMultiple}
              onChange={(e) => updateAssumption('ebitdaMultiple', Number(e.target.value))}
              style={{ flex: 1, accentColor: C.navy }}
            />
            <span style={{ fontSize: 12, fontWeight: 600, color: C.navy, ...seg, whiteSpace: 'nowrap' }}>
              {companyAssumptions.ebitdaMultiple}×
            </span>
          </div>
          <Row label="Implied Enterprise Value" value={fmtUSD(impliedEV, true)} bold color={C.navy} />
          <Row label="Equipment Net Book Value" value={fmtUSD(combined.netBookValue, true)} color={C.blue} />
          <Row label="Equipment as % of EV" value={`${equipPct.toFixed(1)}%`} color={C.caramel} />
          <Row label="Replacement Cost (est.)" value={fmtUSD(replacementCost, true)} color={C.slate} />
          <Row label="Asset-Backed Collateral (70%)" value={fmtUSD(combined.netBookValue * 0.7, true)} color={C.msGreen} border />
        </div>

        <div style={tile}>
          <SectionTitle>Balance Sheet Extract — PP&amp;E</SectionTitle>
          <div style={{ fontSize: 10, color: C.textMid, ...seg, marginBottom: 8, fontStyle: 'italic' }}>As presented in financial statements</div>
          <Row label="Property, Plant &amp; Equipment (gross)" value={fmtUSD(combined.grossCost)} />
          <Row label="Less: Accumulated Depreciation" value={`(${fmtUSD(combined.accumulatedDepreciation)})`} color={C.msRed} />
          <Row label="Net PP&amp;E" value={fmtUSD(combined.netBookValue)} bold color={C.msGreen} border />
        </div>

        <div style={tile}>
          <SectionTitle>Income Statement — Depreciation Impact</SectionTitle>
          <Row label="Annual Revenue" value={fmtUSD(annualRevenue)} />
          <Row label="EBITDA" value={fmtUSD(ebitda)} bold color={C.msGreen} />
          <Row label="Less: Depreciation &amp; Amort." value={`(${fmtUSD(annualDepreciation)})`} color={C.msRed} />
          <Row label="EBIT" value={fmtUSD(ebit)} bold color={C.navy} border />
          {companyAssumptions.subscribers > 0 && <Row label="Equipment NBV / Subscriber" value={fmtUSD(nbvPerSub)} color={C.blue} />}
        </div>
      </div>
    </div>
  )

  const PageInventoryByLocation = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <KPI label="Warehouses" value={WAREHOUSES.length} sub="+ 3 technician trucks" />
        <KPI label="Units In Stock" value={fmt(totalStockUnits)} sub="across all warehouses" color={C.navy} />
        <KPI label="Total Stock Value" value={fmtUSD(totalStockGross, true)} sub="at cost basis" color={C.caramel} />
        <KPI label="Stock Net Book Value" value={fmtUSD(totalStockNBV, true)} sub="after depreciation" color={C.msGreen} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={tile}>
          <SectionTitle>Units by Warehouse</SectionTitle>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={locationRows.map((row) => ({ name: row.site.name, Units: row.units }))} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={C.border} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fontFamily: 'Segoe UI' }} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fontFamily: 'Segoe UI' }} />
              <Tooltip content={<TT />} />
              <Bar dataKey="Units" fill={C.navy} radius={[0, 2, 2, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={tile}>
          <SectionTitle>Gross Value vs. Net Book Value by Warehouse</SectionTitle>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={locationRows.map((row) => ({ name: row.site.name, Gross: row.grossValue, NBV: row.netBookValue }))} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={C.border} />
              <XAxis type="number" tick={{ fontSize: 10, fontFamily: 'Segoe UI' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fontFamily: 'Segoe UI' }} />
              <Tooltip content={<TT compact />} />
              <Bar dataKey="Gross" fill={C.blue} radius={[0, 2, 2, 0]} barSize={9} />
              <Bar dataKey="NBV" fill={C.msGreen} radius={[0, 2, 2, 0]} barSize={9} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={tile}>
        <SectionTitle>Location Detail</SectionTitle>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, ...seg }}>
          <thead>
            <tr style={{ background: C.navy, color: '#fff' }}>
              {['Warehouse', 'Units', 'Gross Value', 'Net Book Value', 'Depr. %'].map((h) => (
                <th key={h} style={{ padding: '6px 10px', textAlign: h === 'Warehouse' ? 'left' : 'right', fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {locationRows.map((row, i) => {
              const deprPct = row.grossValue > 0 ? (((row.grossValue - row.netBookValue) / row.grossValue) * 100).toFixed(1) : '0.0'
              return (
                <tr key={row.site.id} style={{ background: i % 2 === 0 ? '#fff' : C.ice }}>
                  <td style={{ padding: '5px 10px', fontWeight: 500 }}>{row.site.name}</td>
                  <td style={{ padding: '5px 10px', textAlign: 'right' }}>{fmt(row.units)}</td>
                  <td style={{ padding: '5px 10px', textAlign: 'right' }}>{fmtUSD(row.grossValue)}</td>
                  <td style={{ padding: '5px 10px', textAlign: 'right', color: C.msGreen, fontWeight: 600 }}>{fmtUSD(row.netBookValue)}</td>
                  <td style={{ padding: '5px 10px', textAlign: 'right' }}>{deprPct}%</td>
                </tr>
              )
            })}
            <tr style={{ background: C.navy, color: '#fff', fontWeight: 700 }}>
              <td style={{ padding: '6px 10px' }}>TOTAL</td>
              <td style={{ padding: '6px 10px', textAlign: 'right' }}>{fmt(totalStockUnits)}</td>
              <td style={{ padding: '6px 10px', textAlign: 'right' }}>{fmtUSD(totalStockGross)}</td>
              <td style={{ padding: '6px 10px', textAlign: 'right' }}>{fmtUSD(totalStockNBV)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )

  const PageFinancialValuation = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <KPI label="Total Gross Value" value={fmtUSD(combined.grossCost, true)} color={C.navy} />
        <KPI label="Accum. Depreciation" value={fmtUSD(combined.accumulatedDepreciation, true)} color={C.msRed} />
        <KPI label="Total Net Book Value" value={fmtUSD(combined.netBookValue, true)} color={C.msGreen} />
        <KPI
          label="Fleet Depr. %"
          value={combined.grossCost > 0 ? `${((combined.accumulatedDepreciation / combined.grossCost) * 100).toFixed(1)}%` : '0.0%'}
          color={C.slate}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={tile}>
          <SectionTitle>Value Bridge — Gross to Net Book Value</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={waterfallData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Segoe UI' }} />
              <YAxis tickFormatter={(v) => `$${(Math.abs(v) / 1_000).toFixed(0)}K`} tick={{ fontSize: 11, fontFamily: 'Segoe UI' }} />
              <Tooltip formatter={(v) => fmtUSD(Math.abs(v))} contentStyle={{ fontSize: 11, fontFamily: 'Segoe UI' }} />
              <Bar dataKey="value" name="Amount" radius={[3, 3, 0, 0]}>
                {waterfallData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={tile}>
          <SectionTitle>Net Book Value by Asset Category</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryBreakdown} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: 'Segoe UI' }} />
              <YAxis tickFormatter={(v) => `$${(v / 1_000).toFixed(0)}K`} tick={{ fontSize: 10, fontFamily: 'Segoe UI' }} />
              <Tooltip content={<TT compact />} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Segoe UI' }} />
              <Bar dataKey="gross" name="Gross Cost" fill={C.navy} radius={[2, 2, 0, 0]} />
              <Bar dataKey="nbv" name="Net Book Value" fill={C.msGreen} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
        <div style={tile}>
          <SectionTitle>Funding &amp; Acquisition Metrics</SectionTitle>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: C.textMid, ...seg, marginBottom: 4 }}>EBITDA Multiple for Scenario</div>
            <input
              type="range"
              min={4}
              max={16}
              step={0.5}
              value={companyAssumptions.ebitdaMultiple}
              onChange={(e) => updateAssumption('ebitdaMultiple', Number(e.target.value))}
              style={{ width: '100%', accentColor: C.navy }}
            />
            <div style={{ textAlign: 'center', fontWeight: 700, color: C.navy, fontSize: 16, ...seg }}>{companyAssumptions.ebitdaMultiple}× EBITDA</div>
          </div>
          <Row label="EBITDA (annual)" value={fmtUSD(ebitda, true)} />
          <Row label="Implied Enterprise Value" value={fmtUSD(impliedEV, true)} bold />
          <Row label="Equipment NBV" value={fmtUSD(combined.netBookValue, true)} />
          <Row label="Equipment % of EV" value={`${equipPct.toFixed(1)}%`} />
          <Row label="Est. Collateral Value (70% LTV)" value={fmtUSD(combined.netBookValue * 0.7, true)} color={C.msGreen} />
          <Row label="Fleet Replacement Cost" value={fmtUSD(replacementCost, true)} color={C.navy} bold />
        </div>

        <div style={tile}>
          <SectionTitle>Annual Depreciation Expense — 10-Year Projection</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={depreciationExpenseByYear} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fontFamily: 'Segoe UI' }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11, fontFamily: 'Segoe UI' }} />
              <Tooltip content={<TT compact />} />
              <Line type="monotone" dataKey="Expense" stroke={C.navy} strokeWidth={2.5} dot={{ r: 4 }} name="Depreciation Expense" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )

  const pageContent = [<PageExecutive key="exec" />, <PageInventoryByLocation key="loc" />, <PageFinancialValuation key="fin" />]

  return (
    <div style={{ ...seg, background: C.pbiCanvas, borderRadius: 4, overflow: 'hidden', border: `1px solid ${C.border}` }}>
      <div style={{ background: C.pbiDark, height: 42, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, background: C.gold, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.pbiDark }}>SS</span>
          </div>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Schmidt Systems IMS — Executive Intelligence</span>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ color: '#C8C6C4', fontSize: 11 }}>Live data from this system</span>
      </div>

      <div style={{ background: C.pbiMid, height: 30, display: 'flex', alignItems: 'center', padding: '0 12px', borderBottom: '1px solid #1A1918' }}>
        <span style={{ color: '#ccc', fontSize: 11 }}>Data source: Schmidt Systems IMS (products, inventory, vehicles)</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: '#aaa', fontSize: 10 }}>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
      </div>

      <div style={{ display: 'flex' }}>
        <div style={{ width: 150, background: C.pbiMid, borderRight: '1px solid #1A1918', padding: '12px 0', flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: '#888', padding: '0 10px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Report Pages</div>
          {pages.map((p, i) => (
            <div
              key={p}
              onClick={() => setPage(i)}
              style={{
                padding: '10px 10px',
                cursor: 'pointer',
                borderLeft: page === i ? `3px solid ${C.gold}` : '3px solid transparent',
                background: page === i ? '#2E2D2C' : 'transparent',
                marginBottom: 2,
              }}
            >
              <div style={{ fontSize: 16, marginBottom: 3 }}>{pageIcons[i]}</div>
              <div style={{ fontSize: 10, color: page === i ? '#fff' : '#aaa', lineHeight: 1.3 }}>{p}</div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, padding: 14, minWidth: 0 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.navy }}>{pages[page]}</div>
            <div style={{ fontSize: 11, color: C.textMid }}>Schmidt Systems IMS · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
          </div>
          {pageContent[page]}
        </div>
      </div>
    </div>
  )
}
