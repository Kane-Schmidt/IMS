import { Link } from 'react-router-dom'
import { useAppData } from '../data/AppDataContext.jsx'
import { useSites } from '../data/useSites.js'

export default function Home() {
  const { orders, inventoryItems, bundles, tickets } = useAppData()
  const { vehicleSites, siteName } = useSites()

  const totalInStock = inventoryItems.length
  const onTrucks = inventoryItems.filter((item) =>
    vehicleSites.some((vehicle) => vehicle.id === item.locationId),
  ).length
  const inWarehouses = totalInStock - onTrucks
  const bundledItems = inventoryItems.filter((item) => item.bundleId).length

  const pendingApprovalOrders = orders.filter((order) => order.status === 'pending-approval')
  const approvedOrders = orders.filter((order) => order.status === 'approved')
  const openTickets = tickets.filter((ticket) => ticket.status === 'open')

  const tasks = [
    ...pendingApprovalOrders.map((order) => ({
      id: `approve-${order.id}`,
      type: 'Approve PO',
      description: `${order.poNumber} — ${order.vendor}`,
      to: '/place-order',
      state: { tab: 'Pending Approval' },
    })),
    ...approvedOrders.map((order) => ({
      id: `receive-${order.id}`,
      type: 'Receive Order',
      description: `${order.poNumber} — ${order.vendor} → ${siteName(order.destinationLocationId)}`,
      to: '/receive-order',
    })),
    ...openTickets.map((ticket) => ({
      id: `ticket-${ticket.id}`,
      type: 'Support Ticket',
      description: ticket.subject,
      to: '/support',
    })),
  ]

  const kpis = [
    { label: 'Total Items in Stock', value: totalInStock },
    { label: 'In Warehouses', value: inWarehouses },
    { label: 'On Trucks', value: onTrucks },
    { label: 'Bundled Items', value: bundledItems },
  ]

  return (
    <div className="home-page">
      <h1>Home</h1>

      <h2>Inventory Levels</h2>
      <div className="kpi-strip">
        {kpis.map((kpi) => (
          <div className="kpi-card" key={kpi.label}>
            <span className="kpi-value">{kpi.value}</span>
            <span className="kpi-label">{kpi.label}</span>
          </div>
        ))}
      </div>

      <h2>Outstanding Tasks</h2>
      <div className="kpi-strip">
        <div className="kpi-card">
          <span className="kpi-value">{pendingApprovalOrders.length}</span>
          <span className="kpi-label">Purchase Orders Pending Approval</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{approvedOrders.length}</span>
          <span className="kpi-label">Inbound Shipments Ready to Receive</span>
        </div>
      </div>
      {tasks.length === 0 ? (
        <p className="empty-state">You're all caught up — no outstanding tasks.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Details</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>
                  <span className="status-pill status-flag">{task.type}</span>
                </td>
                <td>{task.description}</td>
                <td>
                  <Link to={task.to} state={task.state} className="module-tile-open">
                    Review →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="page-subtitle">
        Manage day-to-day operations under <Link to="/inventory">Inventory</Link> or company records under{' '}
        <Link to="/master-data/products">Master Data</Link>.
      </p>
    </div>
  )
}
