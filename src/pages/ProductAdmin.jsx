import { useState } from 'react'
import { useAppData } from '../data/AppDataContext.jsx'

const emptyDraft = { manufacturer: '', modelNumber: '', purchasePrice: '' }

export default function ProductAdmin() {
  const { products, addProduct, updateProduct, toggleProductActive } = useAppData()
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState(emptyDraft)
  const [editingId, setEditingId] = useState(null)

  function updateField(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (editingId) {
      updateProduct(editingId, draft)
    } else {
      addProduct(draft)
    }
    setDraft(emptyDraft)
    setEditingId(null)
    setShowForm(false)
  }

  function handleCancel() {
    setDraft(emptyDraft)
    setEditingId(null)
    setShowForm(false)
  }

  function startEdit(product) {
    setDraft({
      manufacturer: product.manufacturer,
      modelNumber: product.modelNumber,
      purchasePrice: product.purchasePrice,
    })
    setEditingId(product.id)
    setShowForm(true)
  }

  function startAdd() {
    setDraft(emptyDraft)
    setEditingId(null)
    setShowForm(true)
  }

  return (
    <div className="master-data-page">
      <div className="page-header">
        <h1>Product Master Data</h1>
        {!showForm && (
          <button className="btn-primary" onClick={startAdd}>
            + Add Product
          </button>
        )}
      </div>

      {showForm && (
        <form className="record-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Manufacturer</span>
            <input
              type="text"
              value={draft.manufacturer}
              onChange={(event) => updateField('manufacturer', event.target.value)}
              required
            />
          </label>
          <label className="form-field">
            <span>Model Number</span>
            <input
              type="text"
              value={draft.modelNumber}
              onChange={(event) => updateField('modelNumber', event.target.value)}
              required
            />
          </label>
          <label className="form-field">
            <span>Purchase Price</span>
            <input
              type="number"
              value={draft.purchasePrice}
              onChange={(event) => updateField('purchasePrice', event.target.value)}
              required
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingId ? 'Save Changes' : 'Save'}
            </button>
            <button type="button" className="btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {products.length === 0 ? (
        <p className="empty-state">No products yet. Click "+ Add Product" to create the first one.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Manufacturer</th>
              <th>Model Number</th>
              <th>Purchase Price</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.manufacturer}</td>
                <td>{product.modelNumber}</td>
                <td>${Number(product.purchasePrice).toLocaleString()}</td>
                <td>
                  <span className={`status-pill ${product.active ? 'status-active' : 'status-inactive'}`}>
                    {product.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="row-actions">
                  <button className="btn-secondary" onClick={() => startEdit(product)}>
                    Edit
                  </button>
                  <button className="btn-secondary" onClick={() => toggleProductActive(product.id, product.active)}>
                    {product.active ? 'Deactivate' : 'Activate'}
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
