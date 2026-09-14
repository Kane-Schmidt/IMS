import { useState } from 'react'
import Modal from './Modal.jsx'
import { DEPRECIATION_METHODS } from '../data/depreciation.js'

const emptyModel = { method: 'none', usefulLifeYears: '', salvageValue: '', decliningRate: '' }

export default function DepreciationModelModal({ title, initialModel, onSave, onClose }) {
  const [model, setModel] = useState(() => ({ ...emptyModel, ...(initialModel ?? {}) }))

  function updateField(key, value) {
    setModel((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSave(model)
  }

  return (
    <Modal title={`Depreciation Model — ${title}`} onClose={onClose}>
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
