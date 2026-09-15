import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAppData } from '../data/AppDataContext.jsx'
import { useWarehouses } from '../data/useSites.js'
import { useAuth } from '../lib/AuthContext.jsx'
import PrintableLabels from '../components/PrintableLabels.jsx'

function generateSerial() {
  return `AUTO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

export default function ReceiveOrder() {
  const { orders, products, receiveOrder } = useAppData()
  const { warehouses, siteName, loaded: warehousesLoaded } = useWarehouses()
  const { profile } = useAuth()
  const location = useLocation()

  // Only receivers can receive, and only into warehouses they're assigned to.
  const isReceiver = profile?.is_receiver === true
  const assignedWarehouses = profile?.assigned_warehouses ?? []
  const canReceiveInto = (locationId) => isReceiver && assignedWarehouses.includes(locationId)
  const myWarehouses = warehouses.filter((wh) => assignedWarehouses.includes(wh.id))

  const [selectedWarehouseId, setSelectedWarehouseId] = useState(() => {
    const requested = location.state?.warehouseId
    return requested && assignedWarehouses.includes(requested) ? requested : ''
  })

  const approvedOrders = orders.filter(
    (order) => order.status === 'approved' && order.destinationLocationId === selectedWarehouseId,
  )

  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [step, setStep] = useState(1)
  const [palletBoxCount, setPalletBoxCount] = useState('')
  const [scansByLineItem, setScansByLineItem] = useState({})
  const [manualSerial, setManualSerial] = useState({})
  const [labels, setLabels] = useState(null)

  const selectedOrder = approvedOrders.find((order) => order.id === selectedOrderId) || null

  function productLabel(id) {
    const product = products.find((p) => p.id === id)
    return product ? `${product.manufacturer} ${product.modelNumber}` : 'Unknown product'
  }

  function startReceiving(order) {
    setSelectedOrderId(order.id)
    setStep(1)
    setPalletBoxCount('')
    setScansByLineItem({})
    setManualSerial({})
    setLabels(null)
  }

  function scansFor(lineItemId) {
    return scansByLineItem[lineItemId] || []
  }

  function addScan(lineItemId, serial) {
    if (!serial.trim()) return
    setScansByLineItem((prev) => ({
      ...prev,
      [lineItemId]: [...(prev[lineItemId] || []), { id: crypto.randomUUID(), serial: serial.trim() }],
    }))
  }

  function removeScan(lineItemId, scanId) {
    setScansByLineItem((prev) => ({
      ...prev,
      [lineItemId]: (prev[lineItemId] || []).filter((scan) => scan.id !== scanId),
    }))
  }

  function handleConfirm() {
    if (!canReceiveInto(selectedOrder.destinationLocationId)) return

    const scannedItems = selectedOrder.lineItems.flatMap((item) =>
      scansFor(item.id).map((scan) => ({ productId: item.productId, serial: scan.serial })),
    )
    receiveOrder({
      orderId: selectedOrder.id,
      destinationLocationId: selectedOrder.destinationLocationId,
      destinationName: siteName(selectedOrder.destinationLocationId),
      scannedItems,
      palletBoxCount,
    })
    setLabels(
      scannedItems.map((scan) => ({
        id: crypto.randomUUID(),
        heading: productLabel(scan.productId),
        code: scan.serial,
        lines: [siteName(selectedOrder.destinationLocationId), `PO ${selectedOrder.poNumber}`],
      })),
    )
  }

  function finishAndReset() {
    setSelectedOrderId(null)
    setLabels(null)
  }

  if (labels) {
    return <PrintableLabels title="Asset Labels" labels={labels} onDone={finishAndReset} />
  }

  if (!isReceiver) {
    return (
      <div className="receive-order-page">
        <Link to="/inventory" className="breadcrumb-link">
          ← Back to Inventory
        </Link>
        <h1>Receive an Order</h1>
        <p className="warning-banner">
          Your account is not set up as a receiver, so you can't receive equipment. An admin can enable this under
          Admin → User Management.
        </p>
      </div>
    )
  }

  if (!selectedWarehouseId) {
    return (
      <div className="receive-order-page">
        <Link to="/inventory" className="breadcrumb-link">
          ← Back to Inventory
        </Link>
        <h1>Receive an Order</h1>
        <p className="page-subtitle">Select the warehouse you're receiving this order for.</p>

        {!warehousesLoaded ? (
          <p className="empty-state">Loading warehouses…</p>
        ) : myWarehouses.length === 0 ? (
          <p className="empty-state">
            You aren't assigned to any warehouses yet. An admin can assign you under Admin → User Management.
          </p>
        ) : (
          <div className="site-grid">
            {myWarehouses.map((wh) => (
              <button key={wh.id} className="site-card" onClick={() => setSelectedWarehouseId(wh.id)}>
                <span className="site-name">{wh.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!selectedOrder) {
    return (
      <div className="receive-order-page">
        <Link to="/inventory" className="breadcrumb-link">
          ← Back to Inventory
        </Link>
        <h1>Receive an Order</h1>
        <p className="page-subtitle">
          Receiving for <strong>{siteName(selectedWarehouseId)}</strong>.{' '}
          <button type="button" className="btn-secondary" onClick={() => setSelectedWarehouseId('')}>
            Change Warehouse
          </button>
        </p>

        {approvedOrders.length === 0 ? (
          <p className="empty-state">No approved orders are waiting to be received at this warehouse.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Vendor</th>
                <th>Expected Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {approvedOrders.map((order) => (
                <tr key={order.id}>
                  <td>{order.poNumber}</td>
                  <td>{order.vendor}</td>
                  <td>{order.expectedDate}</td>
                  <td>
                    <button className="btn-primary" onClick={() => startReceiving(order)}>
                      Receive
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  }

  return (
    <div className="receive-order-page">
      <Link to="/inventory" className="breadcrumb-link">
        ← Back to Inventory
      </Link>
      <h1>Receive Order {selectedOrder.poNumber}</h1>
      <div className="wizard-steps">
        <span className={step === 1 ? 'wizard-step active' : 'wizard-step'}>1. Confirm Count</span>
        <span className={step === 2 ? 'wizard-step active' : 'wizard-step'}>2. Scan Items</span>
        <span className={step === 3 ? 'wizard-step active' : 'wizard-step'}>3. Review &amp; Confirm</span>
      </div>

      {step === 1 && (
        <div className="wizard-panel">
          <label className="form-field">
            <span>Pallet / Box Count</span>
            <input type="number" min="0" value={palletBoxCount} onChange={(e) => setPalletBoxCount(e.target.value)} />
          </label>
          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setSelectedOrderId(null)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={() => setStep(2)} disabled={palletBoxCount === ''}>
              Next
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="wizard-panel">
          {selectedOrder.lineItems.map((item) => (
            <div className="scan-line-item" key={item.id}>
              <div className="scan-line-item-header">
                <strong>{productLabel(item.productId)}</strong>
                <span>
                  {scansFor(item.id).length} / {item.quantity} scanned
                </span>
              </div>
              <div className="scan-controls">
                <button className="btn-secondary" onClick={() => addScan(item.id, generateSerial())}>
                  + Scan
                </button>
                <input
                  type="text"
                  placeholder="Manual serial"
                  value={manualSerial[item.id] || ''}
                  onChange={(e) => setManualSerial((prev) => ({ ...prev, [item.id]: e.target.value }))}
                />
                <button
                  className="btn-secondary"
                  onClick={() => {
                    addScan(item.id, manualSerial[item.id] || '')
                    setManualSerial((prev) => ({ ...prev, [item.id]: '' }))
                  }}
                >
                  Add
                </button>
              </div>
              {scansFor(item.id).length > 0 && (
                <ul className="scan-list">
                  {scansFor(item.id).map((scan) => (
                    <li key={scan.id}>
                      {scan.serial}
                      <button className="chip-remove" onClick={() => removeScan(item.id, scan.id)}>
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setStep(1)}>
              Back
            </button>
            <button className="btn-primary" onClick={() => setStep(3)}>
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="wizard-panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Expected</th>
                <th>Received</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {selectedOrder.lineItems.map((item) => {
                const received = scansFor(item.id).length
                const expected = Number(item.quantity)
                const flag = received === expected ? 'Match' : received > expected ? 'Over' : 'Short'
                return (
                  <tr key={item.id}>
                    <td>{productLabel(item.productId)}</td>
                    <td>{expected}</td>
                    <td>{received}</td>
                    <td>
                      <span className={flag === 'Match' ? 'status-pill status-active' : 'status-pill status-flag'}>
                        {flag}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setStep(2)}>
              Back
            </button>
            <button className="btn-primary" onClick={handleConfirm}>
              Confirm &amp; Push to Inventory
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
