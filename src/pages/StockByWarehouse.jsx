import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../data/AppDataContext.jsx'
import { useWarehouses } from '../data/useSites.js'

// Counts are built entirely from inventory_items, which only gain rows
// through the Receive an Order flow — so this reflects what has actually
// been checked in, not what was ordered or is in transit.
export default function StockByWarehouse() {
  const { inventoryItems, products } = useAppData()
  const { warehouses, loaded } = useWarehouses()
  const [warehouseFilter, setWarehouseFilter] = useState('all')

  const rows = useMemo(() => {
    const counts = new Map()

    inventoryItems.forEach((item) => {
      const warehouse = warehouses.find((wh) => wh.id === item.locationId)
      if (!warehouse) return
      const key = `${warehouse.id}::${item.productId}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })

    return [...counts.entries()]
      .map(([key, quantity]) => {
        const [warehouseId, productId] = key.split('::')
        const warehouse = warehouses.find((wh) => wh.id === warehouseId)
        const product = products.find((p) => p.id === productId)
        return {
          warehouseId,
          warehouseName: warehouse?.name ?? 'Unknown warehouse',
          productId,
          manufacturer: product?.manufacturer ?? 'Unknown product',
          modelNumber: product?.modelNumber ?? '—',
          quantity,
        }
      })
      .filter((row) => warehouseFilter === 'all' || row.warehouseId === warehouseFilter)
      .sort((a, b) => a.warehouseName.localeCompare(b.warehouseName) || a.manufacturer.localeCompare(b.manufacturer))
  }, [inventoryItems, products, warehouses, warehouseFilter])

  const totalUnits = rows.reduce((sum, row) => sum + row.quantity, 0)
  const distinctProducts = new Set(rows.map((row) => row.productId)).size

  return (
    <div className="stock-by-warehouse-page">
      <Link to="/inventory" className="breadcrumb-link">
        ← Back to Inventory
      </Link>
      <h1>Stock by Warehouse</h1>
      <p className="page-subtitle">
        Counts reflect equipment checked in through Receive an Order — not what's on order or in transit.
      </p>

      <div className="kpi-strip">
        <div className="kpi-card">
          <span className="kpi-value">{warehouses.length}</span>
          <span className="kpi-label">Warehouses</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{totalUnits}</span>
          <span className="kpi-label">Units In Stock</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{distinctProducts}</span>
          <span className="kpi-label">Distinct Products</span>
        </div>
      </div>

      <label className="form-field form-field-narrow">
        <span>Filter by Warehouse</span>
        <select value={warehouseFilter} onChange={(event) => setWarehouseFilter(event.target.value)}>
          <option value="all">All Warehouses</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>
      </label>

      {!loaded ? (
        <p className="empty-state">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="empty-state">No stock recorded yet. Items appear here once received through Receive an Order.</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Warehouse</th>
                <th>Manufacturer</th>
                <th>Model Number</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.warehouseId}::${row.productId}`}>
                  <td>{row.warehouseName}</td>
                  <td>{row.manufacturer}</td>
                  <td>{row.modelNumber}</td>
                  <td>{row.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
