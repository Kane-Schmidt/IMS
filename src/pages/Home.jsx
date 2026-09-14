import { Link } from 'react-router-dom'
import { useAppData } from '../data/AppDataContext.jsx'
import { TRUCKS } from '../data/sites.js'

function isOnTruck(locationId) {
  return TRUCKS.some((truck) => truck.id === locationId)
}

export default function Home() {
  const { orders, inventoryItems, bundles } = useAppData()

  const pendingApprovals = orders.filter((order) => order.status === 'pending-approval').length
  const approvedReady = orders.filter((order) => order.status === 'approved').length
  const itemsOnTrucks = inventoryItems.filter((item) => isOnTruck(item.locationId)).length
  const activeBundles = bundles.filter((bundle) => bundle.status === 'active').length

  const tiles = [
    { to: '/place-order', label: 'Place an Order', badge: pendingApprovals, sub: 'pending approval' },
    { to: '/receive-order', label: 'Receive an Order', badge: approvedReady, sub: 'ready to receive' },
    { to: '/relocate', label: 'Relocate', badge: itemsOnTrucks, sub: 'items on trucks' },
    { to: '/bundles', label: 'Bundle Management', badge: activeBundles, sub: 'active bundles' },
  ]

  const kpis = [
    { label: 'Pending Approvals', value: pendingApprovals },
    { label: 'Approved Orders Ready', value: approvedReady },
    { label: 'Items on Trucks', value: itemsOnTrucks },
    { label: 'Active Bundles', value: activeBundles },
  ]

  return (
    <div className="home-page">
      <h1>Home</h1>

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
            <span className="module-tile-sub">{tile.sub}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
