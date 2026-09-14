import { useState } from 'react'
import { useAppData } from '../data/AppDataContext.jsx'
import Modal from '../components/Modal.jsx'

const METHODS = [
  { value: 'none', label: 'Not Depreciated' },
  { value: 'straight-line', label: 'Straight-Line' },
  { value: 'declining-balance', label: 'Declining Balance' },
]

const emptyModel = { method: 'none', usefulLifeYears: '', salvageValue: '', decliningRate: '' }

function methodLabel(method) {
  return METHODS.find((option) => option.value === method)?.label ?? 'Not Depreciated'
}

function annualDepreciation(product) {
  const model = product.depreciationModel
  if (!model || model.method === 'none') return null

  const cost = Number(product.purchasePrice) || 0
  const life = Number(model.usefulLifeYears) || 0
  const salvage = Number(model.salvageValue) || 0

  if (model.method === 'straight-line') {
    if (life <= 0) return null
    return (cost - salvage) / life
  }

  if (model.method === 'declining-balance') {
    const rate = Number(model.decliningRate) || 0
    if (rate <= 0) return null
    return cost * (rate / 100)
  }

  return null
}

export default function Finance() {
  const { products, setDepreciationModel } = useAppData()
  const [editingProduct, setEditingProduct] = useState(null)

  return (
    <div className="finance-page">
      <h1>Finance</h1>
      <p className="page-subtitle">Set a depreciation model for each product type to estimate annual expense.</p>

      {products.length === 0 ? (
        <p className="empty-state">No products yet. Add products under Master Data or Admin first.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Purchase Price</th>
              <th>Depreciation Method</th>
              <th>Useful Life</th>
              <th>Salvage Value</th>
              <th>Est. Annual Depreciation</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const model = product.depreciationModel ?? emptyModel
              const annual = annualDepreciation(product)
              return (
                <tr key={product.id}>
                  <td>
                    {product.manufacturer} {product.modelNumber}
                  </td>
                  <td>${Number(product.purchasePrice).toLocaleString()}</td>
                  <td>{methodLabel(model.method)}</td>
                  <td>{model.method !== 'none' && model.usefulLifeYears ? `${model.usefulLifeYears} yrs` : '—'}</td>
                  <td>{model.method !== 'none' && model.salvageValue !== '' ? `$${Number(model.salvageValue).toLocaleString()}` : '—'}</td>
                  <td>{annual !== null ? `$${annual.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}</td>
                  <td>
                    <button className="btn-secondary" onClick={() => setEditingProduct(product)}>
                      Edit Model
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {editingProduct && (
        <DepreciationModelModal
          product={editingProduct}
          onSave={(model) => {
            setDepreciationModel(editingProduct.id, model)
            setEditingProduct(null)
          }}
          onClose={() => setEditingProduct(null)}
        />
      )}
    </div>
  )
}

function DepreciationModelModal({ product, onSave, onClose }) {
  const [model, setModel] = useState(() => ({ ...emptyModel, ...(product.depreciationModel ?? {}) }))

  function updateField(key, value) {
    setModel((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSave(model)
  }

  return (
    <Modal title={`Depreciation Model — ${product.manufacturer} ${product.modelNumber}`} onClose={onClose}>
      <form className="record-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>Method</span>
          <select value={model.method} onChange={(event) => updateField('method', event.target.value)}>
            {METHODS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {model.method !== 'none' && (
          <>
            <label className="form-field">
              <span>Useful Life (years)</span>
              <input
                type="number"
                min="1"
                value={model.usefulLifeYears}
                onChange={(event) => updateField('usefulLifeYears', event.target.value)}
                required
              />
            </label>
            <label className="form-field">
              <span>Salvage Value</span>
              <input
                type="number"
                min="0"
                value={model.salvageValue}
                onChange={(event) => updateField('salvageValue', event.target.value)}
                required
              />
            </label>
          </>
        )}

        {model.method === 'declining-balance' && (
          <label className="form-field">
            <span>Declining Balance Rate (%)</span>
            <input
              type="number"
              min="1"
              max="100"
              value={model.decliningRate}
              onChange={(event) => updateField('decliningRate', event.target.value)}
              required
            />
          </label>
        )}

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Save
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}
