import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../data/AppDataContext.jsx'
import { SITES, siteById } from '../data/sites.js'

export default function Relocate() {
  const { inventoryItems, products, relocateItems } = useAppData()
  const [sourceId, setSourceId] = useState('')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [destinationId, setDestinationId] = useState('')
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)
  const [message, setMessage] = useState('')

  function countAt(siteId) {
    return inventoryItems.filter((item) => item.locationId === siteId).length
  }

  function productFor(id) {
    return products.find((p) => p.id === id)
  }

  const itemsAtSource = useMemo(() => {
    if (!sourceId) return []
    const term = search.trim().toLowerCase()
    return inventoryItems
      .filter((item) => item.locationId === sourceId)
      .filter((item) => {
        if (!term) return true
        const product = productFor(item.productId)
        return (
          item.serial.toLowerCase().includes(term) ||
          product?.modelNumber?.toLowerCase().includes(term) ||
          product?.manufacturer?.toLowerCase().includes(term)
        )
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventoryItems, sourceId, search, products])

  function toggleSelected(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function selectSource(id) {
    setSourceId(id)
    setSelectedIds([])
    setDestinationId('')
    setMessage('')
  }

  function requestMove() {
    if (selectedIds.length === 0 || !destinationId) return
    const destination = siteById(destinationId)
    if (destination.type === 'truck') {
      setConfirmingSignOut(true)
    } else {
      performMove()
    }
  }

  function performMove() {
    relocateItems(selectedIds, destinationId)
    setMessage(`Moved ${selectedIds.length} item(s) to ${siteById(destinationId).name}.`)
    setSelectedIds([])
    setConfirmingSignOut(false)
  }

  return (
    <div className="relocate-page">
      <Link to="/inventory" className="breadcrumb-link">
        ← Back to Inventory
      </Link>
      <h1>Relocate</h1>

      <div className="site-grid">
        {SITES.map((site) => (
          <button
            key={site.id}
            className={`site-card${sourceId === site.id ? ' active' : ''}${site.type === 'truck' ? ' site-truck' : ''}`}
            onClick={() => selectSource(site.id)}
          >
            <span className="site-name">{site.name}</span>
            <span className="site-count">{countAt(site.id)} items</span>
          </button>
        ))}
      </div>

      {sourceId && (
        <div className="relocate-panel">
          {message && <p className="form-message">{message}</p>}
          <input
            type="text"
            className="relocate-search"
            placeholder="Search by serial or stock number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {itemsAtSource.length === 0 ? (
            <p className="empty-state">No items match here.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Serial</th>
                  <th>Product</th>
                  <th>Bundled</th>
                </tr>
              </thead>
              <tbody>
                {itemsAtSource.map((item) => {
                  const product = productFor(item.productId)
                  return (
                    <tr key={item.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelected(item.id)}
                        />
                      </td>
                      <td>{item.serial}</td>
                      <td>{product ? `${product.manufacturer} ${product.modelNumber}` : 'Unknown'}</td>
                      <td>{item.bundleId ? 'Yes' : 'No'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          <div className="relocate-actions">
            <label className="form-field">
              <span>Destination</span>
              <select value={destinationId} onChange={(e) => setDestinationId(e.target.value)}>
                <option value="" disabled>
                  Select destination
                </option>
                {SITES.filter((site) => site.id !== sourceId).map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn-primary" disabled={selectedIds.length === 0 || !destinationId} onClick={requestMove}>
              Move {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
            </button>
          </div>
        </div>
      )}

      {confirmingSignOut && (
        <div className="modal-overlay" onClick={() => setConfirmingSignOut(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Sign-Out Warning</h2>
            </div>
            <div className="modal-body">
              <p className="warning-banner">
                Moving {selectedIds.length} item(s) to {siteById(destinationId)?.name} signs them out to a vehicle.
                They will no longer be available in warehouse inventory.
              </p>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setConfirmingSignOut(false)}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={performMove}>
                  Confirm Sign-Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
