import { useMemo, useState } from 'react'
import { useAppData } from '../data/AppDataContext.jsx'
import { WAREHOUSES, siteName } from '../data/sites.js'
import PrintableLabels from '../components/PrintableLabels.jsx'

const TABS = ['Create', 'Active Bundles']

export default function BundleManagement() {
  const { inventoryItems, products, bundles, createBundle, breakBundle } = useAppData()
  const [activeTab, setActiveTab] = useState('Create')
  const [warehouseId, setWarehouseId] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [bundleName, setBundleName] = useState('')
  const [newLabel, setNewLabel] = useState(null)
  const [reprintLabel, setReprintLabel] = useState(null)

  function productFor(id) {
    return products.find((p) => p.id === id)
  }

  const unbundledItems = useMemo(
    () => inventoryItems.filter((item) => item.locationId === warehouseId && !item.bundleId),
    [inventoryItems, warehouseId],
  )

  function toggleSelected(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function selectWarehouse(id) {
    setWarehouseId(id)
    setSelectedIds([])
    setBundleName('')
  }

  function handleCreate() {
    if (selectedIds.length < 2 || !bundleName.trim()) return
    const id = createBundle({ name: bundleName.trim(), warehouseLocationId: warehouseId, itemIds: selectedIds })
    setNewLabel({
      id: crypto.randomUUID(),
      heading: bundleName.trim(),
      code: `BND-${id.slice(0, 8).toUpperCase()}`,
      lines: [siteName(warehouseId), `${selectedIds.length} items`],
    })
    setSelectedIds([])
    setBundleName('')
  }

  if (newLabel) {
    return <PrintableLabels title="Bundle Label" labels={[newLabel]} onDone={() => setNewLabel(null)} />
  }

  if (reprintLabel) {
    return <PrintableLabels title="Bundle Label" labels={[reprintLabel]} onDone={() => setReprintLabel(null)} />
  }

  return (
    <div className="bundle-page">
      <h1>Bundle Management</h1>

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

      {activeTab === 'Create' && (
        <div className="bundle-create">
          <label className="form-field">
            <span>Warehouse</span>
            <select value={warehouseId} onChange={(e) => selectWarehouse(e.target.value)}>
              <option value="" disabled>
                Select warehouse
              </option>
              {WAREHOUSES.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </label>

          {warehouseId &&
            (unbundledItems.length === 0 ? (
              <p className="empty-state">No unbundled items at this warehouse.</p>
            ) : (
              <>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Serial</th>
                      <th>Product</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unbundledItems.map((item) => {
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
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                <div className="relocate-actions">
                  <label className="form-field">
                    <span>Bundle Name</span>
                    <input type="text" value={bundleName} onChange={(e) => setBundleName(e.target.value)} />
                  </label>
                  <button
                    className="btn-primary"
                    disabled={selectedIds.length < 2 || !bundleName.trim()}
                    onClick={handleCreate}
                  >
                    Create Bundle ({selectedIds.length})
                  </button>
                </div>
              </>
            ))}
        </div>
      )}

      {activeTab === 'Active Bundles' && (
        <ActiveBundlesList
          bundles={bundles.filter((b) => b.status === 'active')}
          onReprint={(bundle) =>
            setReprintLabel({
              id: crypto.randomUUID(),
              heading: bundle.name,
              code: `BND-${bundle.id.slice(0, 8).toUpperCase()}`,
              lines: [siteName(bundle.warehouseLocationId), `${bundle.itemIds.length} items`],
            })
          }
          onBreak={breakBundle}
        />
      )}
    </div>
  )
}

function ActiveBundlesList({ bundles, onReprint, onBreak }) {
  if (bundles.length === 0) {
    return <p className="empty-state">No active bundles.</p>
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Bundle</th>
          <th>Warehouse</th>
          <th>Items</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {bundles.map((bundle) => (
          <tr key={bundle.id}>
            <td>{bundle.name}</td>
            <td>{siteName(bundle.warehouseLocationId)}</td>
            <td>{bundle.itemIds.length}</td>
            <td className="row-actions">
              <button className="btn-secondary" onClick={() => onReprint(bundle)}>
                Reprint
              </button>
              <button className="btn-remove" onClick={() => onBreak(bundle.id)}>
                Break
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
