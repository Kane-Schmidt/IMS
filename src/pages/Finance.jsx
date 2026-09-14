import { useState } from 'react'
import { useAppData } from '../data/AppDataContext.jsx'
import Modal from '../components/Modal.jsx'
import TrendChart from '../components/TrendChart.jsx'
import { DEPRECIATION_METHODS, methodLabel, depreciateAsset, projectCompanyDepreciation } from '../data/depreciation.js'

const emptyModel = { method: 'none', usefulLifeYears: '', salvageValue: '', decliningRate: '' }
const PROJECTION_YEARS = 10

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

function currency(value) {
  return currencyFormatter.format(Number(value) || 0)
}

export default function Finance() {
  const { products, inventoryItems, setDepreciationModel } = useAppData()
  const [editingProduct, setEditingProduct] = useState(null)

  const rows = products.map((product) => {
    const model = product.depreciationModel ?? emptyModel
    const cost = Number(product.purchasePrice) || 0
    const units = inventoryItems.filter((item) => item.productId === product.id)

    let grossCost = 0
    let accumulatedDepreciation = 0

    units.forEach((item) => {
      grossCost += cost
      accumulatedDepreciation += depreciateAsset({
        cost,
        placedInServiceDate: item.receivedAt,
        model,
      }).accumulatedDepreciation
    })

    return {
      product,
      model,
      unitsOwned: units.length,
      grossCost,
      accumulatedDepreciation,
      netBookValue: grossCost - accumulatedDepreciation,
    }
  })

  const totals = rows.reduce(
    (acc, row) => ({
      unitsOwned: acc.unitsOwned + row.unitsOwned,
      grossCost: acc.grossCost + row.grossCost,
      accumulatedDepreciation: acc.accumulatedDepreciation + row.accumulatedDepreciation,
      netBookValue: acc.netBookValue + row.netBookValue,
    }),
    { unitsOwned: 0, grossCost: 0, accumulatedDepreciation: 0, netBookValue: 0 },
  )

  const projection = projectCompanyDepreciation({ products, inventoryItems, years: PROJECTION_YEARS })
  const chartData = projection.map((point) => ({ year: point.year, value: point.netBookValue }))

  return (
    <div className="finance-page">
      <h1>Finance</h1>
      <p className="page-subtitle">
        Fixed-asset depreciation by product, computed from each owned unit's actual cost and received date — rolls up
        to company-wide net book value.
      </p>

      <div className="kpi-strip">
        <div className="kpi-card">
          <span className="kpi-value">{totals.unitsOwned}</span>
          <span className="kpi-label">Units Owned</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{currency(totals.grossCost)}</span>
          <span className="kpi-label">Gross Fixed Asset Cost</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{currency(totals.accumulatedDepreciation)}</span>
          <span className="kpi-label">Accumulated Depreciation</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{currency(totals.netBookValue)}</span>
          <span className="kpi-label">Net Book Value</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="empty-state">No products yet. Add products under Master Data or Admin first.</p>
      ) : (
        <>
          <div className="chart-card">
            <h2>Net Book Value Trend</h2>
            <TrendChart data={chartData} label="Projected company-wide net book value over the next 10 years" />
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Manufacturer</th>
                  <th>Model Number</th>
                  <th>Units Owned</th>
                  <th>Unit Cost</th>
                  <th>Depreciation Method</th>
                  <th>Useful Life</th>
                  <th>Salvage Value (Resell)</th>
                  <th>Gross Cost</th>
                  <th>Accum. Depreciation</th>
                  <th>Net Book Value</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ product, model, unitsOwned, grossCost, accumulatedDepreciation, netBookValue }) => (
                  <tr key={product.id}>
                    <td>{product.manufacturer}</td>
                    <td>{product.modelNumber}</td>
                    <td>{unitsOwned}</td>
                    <td>{currency(product.purchasePrice)}</td>
                    <td>{methodLabel(model.method)}</td>
                    <td>{model.method !== 'none' && model.usefulLifeYears ? `${model.usefulLifeYears} yrs` : '—'}</td>
                    <td>{model.method !== 'none' && model.salvageValue !== '' ? currency(model.salvageValue) : '—'}</td>
                    <td>{currency(grossCost)}</td>
                    <td>{currency(accumulatedDepreciation)}</td>
                    <td>{currency(netBookValue)}</td>
                    <td>
                      <button className="btn-secondary" onClick={() => setEditingProduct(product)}>
                        Edit Model
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>Company-Wide Depreciation Schedule</h2>
          <p className="page-subtitle">
            Projected from currently owned assets only — does not assume future purchases or disposals.
          </p>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Gross Cost</th>
                  <th>Accum. Depreciation</th>
                  <th>Net Book Value</th>
                </tr>
              </thead>
              <tbody>
                {projection.map((point, index) => (
                  <tr key={point.year}>
                    <td>
                      {point.year}
                      {index === 0 ? ' (today)' : ''}
                    </td>
                    <td>{currency(point.grossCost)}</td>
                    <td>{currency(point.accumulatedDepreciation)}</td>
                    <td>{currency(point.netBookValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
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
            {DEPRECIATION_METHODS.map((option) => (
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
              <span>Salvage / Resell Value ($)</span>
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
