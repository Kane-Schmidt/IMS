import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAppData } from '../data/AppDataContext.jsx'
import { useWarehouses } from '../data/useSites.js'
import { SUPERVISORS } from '../data/supervisors.js'
import Modal from '../components/Modal.jsx'

const emptyLineItem = () => ({ id: crypto.randomUUID(), productId: '', quantity: 1 })

const emptyForm = (warehouseId = '') => ({
  poNumber: '',
  vendor: '',
  destinationLocationId: warehouseId,
  expectedDate: '',
  supervisor: '',
  lineItems: [emptyLineItem()],
  attachmentName: '',
})

const TABS = ['New Order', 'Drafts', 'Pending Approval']

export default function PlaceOrder() {
  const { products, orders, addOrder, submitDraft, reviewOrder } = useAppData()
  const { warehouses, siteName, loaded: warehousesLoaded } = useWarehouses()
  const location = useLocation()
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(location.state?.warehouseId || '')
  const [activeTab, setActiveTab] = useState(() => (TABS.includes(location.state?.tab) ? location.state.tab : 'New Order'))
  const [form, setForm] = useState(() => emptyForm(location.state?.warehouseId || ''))
  const [message, setMessage] = useState('')
  const [reviewingOrder, setReviewingOrder] = useState(null)

  const activeProducts = products.filter((product) => product.active)
  const drafts = orders.filter(
    (order) => order.status === 'draft' && order.destinationLocationId === selectedWarehouseId,
  )
  const pending = orders.filter(
    (order) => order.status === 'pending-approval' && order.destinationLocationId === selectedWarehouseId,
  )

  function selectWarehouse(id) {
    setSelectedWarehouseId(id)
    setForm(emptyForm(id))
    setMessage('')
  }

  function changeWarehouse() {
    setSelectedWarehouseId('')
    setActiveTab('New Order')
    setForm(emptyForm())
    setMessage('')
  }

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function updateLineItem(id, key, value) {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    }))
  }

  function addLineItem() {
    setForm((prev) => ({ ...prev, lineItems: [...prev.lineItems, emptyLineItem()] }))
  }

  function removeLineItem(id) {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.length > 1 ? prev.lineItems.filter((item) => item.id !== id) : prev.lineItems,
    }))
  }

  function attachFile() {
    const suffix = form.poNumber.trim() || 'order'
    updateForm('attachmentName', `${suffix}-supporting-docs.pdf`)
  }

  function isComplete() {
    return (
      form.poNumber.trim() &&
      form.vendor.trim() &&
      form.destinationLocationId &&
      form.expectedDate &&
      form.supervisor &&
      form.lineItems.every((item) => item.productId && Number(item.quantity) > 0)
    )
  }

  function handleSaveDraft() {
    if (!form.poNumber.trim()) {
      setMessage('Enter at least a PO number to save a draft.')
      return
    }
    addOrder({ ...form, status: 'draft' })
    setMessage(`Draft ${form.poNumber} saved.`)
    setForm(emptyForm(selectedWarehouseId))
  }

  function handleSubmit() {
    if (!isComplete()) {
      setMessage('Fill in every field and at least one complete line item before submitting.')
      return
    }
    addOrder({ ...form, status: 'pending-approval' })
    setMessage(`Order ${form.poNumber} submitted for approval.`)
    setForm(emptyForm(selectedWarehouseId))
  }

  function productLabel(id) {
    const product = products.find((p) => p.id === id)
    return product ? `${product.manufacturer} ${product.modelNumber}` : 'Unknown product'
  }

  if (!selectedWarehouseId) {
    return (
      <div className="place-order-page">
        <Link to="/inventory" className="breadcrumb-link">
          ← Back to Inventory
        </Link>
        <h1>Place an Order</h1>
        <p className="page-subtitle">Select the warehouse you're placing this order for.</p>

        {!warehousesLoaded ? (
          <p className="empty-state">Loading warehouses…</p>
        ) : warehouses.length === 0 ? (
          <p className="empty-state">
            No warehouses yet. Add a location with type Warehouse under Master Data → Location Master Data first.
          </p>
        ) : (
          <div className="site-grid">
            {warehouses.map((wh) => (
              <button key={wh.id} className="site-card" onClick={() => selectWarehouse(wh.id)}>
                <span className="site-name">{wh.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="place-order-page">
      <Link to="/inventory" className="breadcrumb-link">
        ← Back to Inventory
      </Link>
      <h1>Place an Order</h1>
      <p className="page-subtitle">
        Ordering for <strong>{siteName(selectedWarehouseId)}</strong>.{' '}
        <button type="button" className="btn-secondary" onClick={changeWarehouse}>
          Change Warehouse
        </button>
      </p>

      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`tab-button${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === 'Pending Approval' && pending.length > 0 && <span className="tab-count">{pending.length}</span>}
            {tab === 'Drafts' && drafts.length > 0 && <span className="tab-count">{drafts.length}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'New Order' && (
        <div className="order-form">
          {message && <p className="form-message">{message}</p>}
          <div className="record-form">
            <label className="form-field">
              <span>PO Number</span>
              <input type="text" value={form.poNumber} onChange={(e) => updateForm('poNumber', e.target.value)} />
            </label>
            <label className="form-field">
              <span>Vendor</span>
              <input type="text" value={form.vendor} onChange={(e) => updateForm('vendor', e.target.value)} />
            </label>
            <label className="form-field">
              <span>Expected Date</span>
              <input
                type="date"
                value={form.expectedDate}
                onChange={(e) => updateForm('expectedDate', e.target.value)}
              />
            </label>
            <label className="form-field">
              <span>Supervisor</span>
              <select value={form.supervisor} onChange={(e) => updateForm('supervisor', e.target.value)}>
                <option value="" disabled>
                  Select supervisor
                </option>
                {SUPERVISORS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Attachment</span>
              {form.attachmentName ? (
                <span className="attachment-chip">
                  📎 {form.attachmentName}
                  <button type="button" className="chip-remove" onClick={() => updateForm('attachmentName', '')}>
                    ×
                  </button>
                </span>
              ) : (
                <button type="button" className="btn-secondary" onClick={attachFile}>
                  Attach PDF
                </button>
              )}
            </label>
          </div>

          <h2>Line Items</h2>
          <table className="data-table line-items-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {form.lineItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <select
                      value={item.productId}
                      onChange={(e) => updateLineItem(item.id, 'productId', e.target.value)}
                    >
                      <option value="" disabled>
                        Select product
                      </option>
                      {activeProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.manufacturer} {product.modelNumber}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', e.target.value)}
                    />
                  </td>
                  <td>
                    <button className="btn-remove" onClick={() => removeLineItem(item.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="btn-secondary" onClick={addLineItem}>
            + Add Line Item
          </button>

          <div className="form-actions order-form-actions">
            <button type="button" className="btn-secondary" onClick={handleSaveDraft}>
              Save Draft
            </button>
            <button type="button" className="btn-primary" onClick={handleSubmit}>
              Submit for Approval
            </button>
          </div>
        </div>
      )}

      {activeTab === 'Drafts' &&
        (drafts.length === 0 ? (
          <p className="empty-state">No drafts saved.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Vendor</th>
                <th>Destination</th>
                <th>Expected Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((order) => (
                <tr key={order.id}>
                  <td>{order.poNumber}</td>
                  <td>{order.vendor}</td>
                  <td>{siteName(order.destinationLocationId)}</td>
                  <td>{order.expectedDate}</td>
                  <td>
                    <button className="btn-primary" onClick={() => submitDraft(order.id)}>
                      Submit for Approval
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}

      {activeTab === 'Pending Approval' &&
        (pending.length === 0 ? (
          <p className="empty-state">No orders awaiting approval.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Vendor</th>
                <th>Destination</th>
                <th>Expected Date</th>
                <th>Supervisor</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((order) => (
                <tr key={order.id} className="clickable-row" onClick={() => setReviewingOrder(order)}>
                  <td>{order.poNumber}</td>
                  <td>{order.vendor}</td>
                  <td>{siteName(order.destinationLocationId)}</td>
                  <td>{order.expectedDate}</td>
                  <td>{order.supervisor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}

      {reviewingOrder && (
        <OrderReviewModal
          order={reviewingOrder}
          productLabel={productLabel}
          siteName={siteName}
          onApprove={() => {
            reviewOrder(reviewingOrder.id, 'approve')
            setReviewingOrder(null)
          }}
          onReject={(comment) => {
            reviewOrder(reviewingOrder.id, 'reject', comment)
            setReviewingOrder(null)
          }}
          onClose={() => setReviewingOrder(null)}
        />
      )}
    </div>
  )
}

function OrderReviewModal({ order, productLabel, siteName, onApprove, onReject, onClose }) {
  const [comment, setComment] = useState('')

  return (
    <Modal title={`Review Order ${order.poNumber}`} onClose={onClose}>
      <dl className="review-details">
        <dt>Vendor</dt>
        <dd>{order.vendor}</dd>
        <dt>Destination</dt>
        <dd>{siteName(order.destinationLocationId)}</dd>
        <dt>Expected Date</dt>
        <dd>{order.expectedDate}</dd>
        <dt>Supervisor</dt>
        <dd>{order.supervisor}</dd>
        <dt>Attachment</dt>
        <dd>{order.attachmentName || 'None'}</dd>
      </dl>

      <table className="data-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Quantity</th>
          </tr>
        </thead>
        <tbody>
          {order.lineItems.map((item) => (
            <tr key={item.id}>
              <td>{productLabel(item.productId)}</td>
              <td>{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <label className="form-field form-field-wide">
        <span>Rejection Comment (required to reject)</span>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
      </label>

      <div className="form-actions">
        <button className="btn-primary" onClick={onApprove}>
          Approve
        </button>
        <button className="btn-remove" disabled={!comment.trim()} onClick={() => onReject(comment.trim())}>
          Reject
        </button>
      </div>
    </Modal>
  )
}
