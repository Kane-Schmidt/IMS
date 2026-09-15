import { lazy, Suspense, useState } from 'react'
import { useAppData } from '../data/AppDataContext.jsx'
import { useCollection } from '../data/useCollection.js'
import { useWarehouses } from '../data/useSites.js'
import { computeProductFleetTotals, computeVehicleFleetTotals } from '../data/depreciation.js'
import { currency } from '../components/FleetDepreciationSummary.jsx'

// recharts pulls in a lot of weight — only load it once someone actually
// opens one of these tabs, instead of bloating every page's initial bundle.
const ExecutiveSummary = lazy(() => import('./reports/ExecutiveSummary.jsx'))
const InventoryByLocation = lazy(() => import('./reports/InventoryByLocation.jsx'))
const FinancialValuation = lazy(() => import('./reports/FinancialValuation.jsx'))

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.4375
const RECENT_ACTIVITY_LIMIT = 100
const TABS = ['Summary', 'Executive Summary', 'Inventory by Location', 'Financial Valuation']

export default function Reports() {
  const [activeTab, setActiveTab] = useState('Summary')

  return (
    <div className="reports-page">
      <h1>Reports</h1>

      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`tab-button${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Summary' && <ReportsSummary />}
      {activeTab !== 'Summary' && (
        <Suspense fallback={<p className="empty-state">Loading report…</p>}>
          {activeTab === 'Executive Summary' && <ExecutiveSummary />}
          {activeTab === 'Inventory by Location' && <InventoryByLocation />}
          {activeTab === 'Financial Valuation' && <FinancialValuation />}
        </Suspense>
      )}
    </div>
  )
}

function ReportsSummary() {
  const { products, inventoryItems, orders, activityLog } = useAppData()
  const { items: vehicles } = useCollection('ims_vehicles')
  const { warehouses, loaded: warehousesLoaded } = useWarehouses()

  const productTotals = computeProductFleetTotals(products, inventoryItems)
  const vehicleTotals = computeVehicleFleetTotals(vehicles)
  const combinedGrossCost = productTotals.grossCost + vehicleTotals.grossCost
  const combinedAccumulatedDepreciation = productTotals.accumulatedDepreciation + vehicleTotals.accumulatedDepreciation
  const combinedNetBookValue = productTotals.netBookValue + vehicleTotals.netBookValue

  function orderValue(order) {
    return order.lineItems.reduce((sum, item) => {
      const product = products.find((entry) => entry.id === item.productId)
      const price = product ? Number(product.purchasePrice) || 0 : 0
      return sum + price * (Number(item.quantity) || 0)
    }, 0)
  }

  const openCommitmentOrders = orders.filter((order) => order.status === 'pending-approval' || order.status === 'approved')
  const outstandingCommitment = openCommitmentOrders.reduce((sum, order) => sum + orderValue(order), 0)

  const receivedOrders = orders.filter((order) => order.status === 'received' && order.receivedAt)
  const allTimeSpend = receivedOrders.reduce((sum, order) => sum + orderValue(order), 0)
  const currentYear = new Date().getFullYear()
  const ytdSpend = receivedOrders
    .filter((order) => new Date(order.receivedAt).getFullYear() === currentYear)
    .reduce((sum, order) => sum + orderValue(order), 0)

  let avgMonthlySpend = 0
  let avgYearlySpend = 0
  if (receivedOrders.length > 0) {
    const earliest = Math.min(...receivedOrders.map((order) => new Date(order.receivedAt).getTime()))
    const monthsElapsed = Math.max(1, Math.round((Date.now() - earliest) / MS_PER_MONTH) + 1)
    const yearsElapsed = Math.max(1, Math.ceil(monthsElapsed / 12))
    avgMonthlySpend = allTimeSpend / monthsElapsed
    avgYearlySpend = allTimeSpend / yearsElapsed
  }

  const warehouseTraffic = warehouses.map((site) => ({
    site,
    count: activityLog.filter((entry) => entry.siteIds?.includes(site.id)).length,
  })).sort((a, b) => b.count - a.count)
  const highestTraffic = warehouseTraffic[0] ?? null
  const lowestTraffic = warehouseTraffic.length > 0 ? warehouseTraffic[warehouseTraffic.length - 1] : null

  const recentActivity = [...activityLog].reverse().slice(0, RECENT_ACTIVITY_LIMIT)

  return (
    <div className="reports-summary">
      <section className="finance-section">
        <h2>Fixed Asset Summary</h2>
        <p className="page-subtitle">Combined product inventory and vehicle fleet, at today's book value.</p>
        <div className="kpi-strip">
          <div className="kpi-card">
            <span className="kpi-value">{currency(combinedGrossCost)}</span>
            <span className="kpi-label">Gross Fixed Asset Cost</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-value">{currency(combinedAccumulatedDepreciation)}</span>
            <span className="kpi-label">Accumulated Depreciation</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-value">{currency(combinedNetBookValue)}</span>
            <span className="kpi-label">Net Book Value</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-value">{currency(outstandingCommitment)}</span>
            <span className="kpi-label">Outstanding PO Commitments</span>
          </div>
        </div>
        <p className="page-subtitle">
          Products: {currency(productTotals.netBookValue)} NBV across {productTotals.unitsOwned} unit(s) · Vehicles:{' '}
          {currency(vehicleTotals.netBookValue)} NBV across {vehicleTotals.unitsOwned} vehicle(s). See Finance for
          detail and trend charts.
        </p>
      </section>

      <section className="finance-section">
        <h2>Inventory Spend</h2>
        <p className="page-subtitle">Based on received purchase orders, valued at current product pricing.</p>
        <div className="kpi-strip">
          <div className="kpi-card">
            <span className="kpi-value">{currency(avgMonthlySpend)}</span>
            <span className="kpi-label">Avg. Spend / Month</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-value">{currency(avgYearlySpend)}</span>
            <span className="kpi-label">Avg. Spend / Year</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-value">{currency(ytdSpend)}</span>
            <span className="kpi-label">Year-to-Date Spend</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-value">{currency(allTimeSpend)}</span>
            <span className="kpi-label">All-Time Spend</span>
          </div>
        </div>
      </section>

      <section className="finance-section">
        <h2>Fleet &amp; Facilities</h2>
        <div className="kpi-strip">
          <div className="kpi-card">
            <span className="kpi-value">{vehicles.length}</span>
            <span className="kpi-label">Total Vehicles</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-value">{highestTraffic ? highestTraffic.site.name : '—'}</span>
            <span className="kpi-label">Highest Traffic Warehouse ({highestTraffic ? highestTraffic.count : 0})</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-value">{lowestTraffic ? lowestTraffic.site.name : '—'}</span>
            <span className="kpi-label">Lowest Traffic Warehouse ({lowestTraffic ? lowestTraffic.count : 0})</span>
          </div>
        </div>
        <p className="page-subtitle">Traffic = receiving and relocation events recorded against each warehouse.</p>
        {!warehousesLoaded ? (
          <p className="empty-state">Loading warehouses…</p>
        ) : warehouseTraffic.length === 0 ? (
          <p className="empty-state">
            No warehouses yet. Add one under Master Data → Location Master Data to see traffic here.
          </p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Warehouse</th>
                  <th>Traffic Events</th>
                </tr>
              </thead>
              <tbody>
                {warehouseTraffic.map(({ site, count }) => (
                  <tr key={site.id}>
                    <td>{site.name}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="finance-section">
        <h2>Activity Log</h2>
        <p className="page-subtitle">
          A system-wide event log — order approvals, receiving, relocations, bundles, product/user changes, and
          support tickets. The app has no login system, so entries record what happened, not which person did it.
        </p>
        {recentActivity.length === 0 ? (
          <p className="empty-state">No activity recorded yet.</p>
        ) : (
          <>
            <div className="table-scroll activity-log-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Type</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((entry) => (
                    <tr key={entry.id}>
                      <td>{new Date(entry.timestamp).toLocaleString()}</td>
                      <td>
                        <span className="status-pill status-active">{entry.type}</span>
                      </td>
                      <td>{entry.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {activityLog.length > recentActivity.length && (
              <p className="page-subtitle">
                Showing the latest {recentActivity.length} of {activityLog.length} events.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  )
}
