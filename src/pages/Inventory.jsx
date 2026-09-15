import { Link } from 'react-router-dom'
import { useAppData } from '../data/AppDataContext.jsx'
import { useSites } from '../data/useSites.js'

export default function Inventory() {
  const { orders, inventoryItems, bundles } = useAppData()
  const { vehicleSites } = useSites()

  const totalInStock = inventoryItems.length
  const pendingApprovals = orders.filter((order) => order.status === 'pending-approval').length
  const approvedReady = orders.filter((order) => order.status === 'approved').length
  const itemsOnTrucks = inventoryItems.filter((item) =>
    vehicleSites.some((vehicle) => vehicle.id === item.locationId),
  ).length
  const activeBundles = bundles.filter((bundle) => bundle.status === 'active').length

  const kpis = [
    { label: 'Total in Stock', value: totalInStock },
    { label: 'Approved Orders', value: approvedReady },
    { label: 'Pending Approval', value: pendingApprovals },
    { label: 'On Trucks', value: itemsOnTrucks },
  ]

  const tiles = [
    {
      to: '/place-order',
      label: 'Place an Order',
      description: 'Submit POs for vendor equipment',
      badge: pendingApprovals,
      sub: 'pending approval',
    },
    {
      to: '/receive-order',
      label: 'Receive an Order',
      description: 'Check in shipments against approved orders',
      badge: approvedReady,
      sub: 'ready to receive',
    },
    {
      to: '/relocate',
      label: 'Relocate',
      description: 'Move inventory between warehouses or vehicles',
      badge: itemsOnTrucks,
      sub: 'on trucks',
    },
    {
      to: '/bundles',
      label: 'Bundle Management',
      description: 'Create install kits, break bundles, print asset tags',
      badge: activeBundles,
      sub: 'active bundles',
    },
  ]

  return (
    <div className="inventory-page">
      <h1>Inventory Management</h1>

      <div className="kpi-strip">
        {kpis.map((kpi) => (
          <div className="kpi-card" key={kpi.label}>
            <span className="kpi-value">{kpi.value}</span>
            <span className="kpi-label">{kpi.label}</span>
          </div>
        ))}
      </div>

      <div className="module-tiles">
        {tiles.map((tile) => (
          <Link to={tile.to} className="module-tile" key={tile.to}>
            <span className="module-tile-badge">{tile.badge}</span>
            <span className="module-tile-label">{tile.label}</span>
            <span className="module-tile-description">{tile.description}</span>
            <span className="module-tile-sub">{tile.sub}</span>
            <span className="module-tile-open">Open →</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
