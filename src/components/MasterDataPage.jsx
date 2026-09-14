import { useState } from 'react'
import { useCollection } from '../data/useCollection.js'

function emptyValueFor(field) {
  if (field.type === 'checkbox') return false
  if (field.type === 'storageLocations') return []
  return ''
}

function emptyRecord(fields) {
  const record = {}
  fields.forEach((field) => {
    record[field.key] = emptyValueFor(field)
  })
  return record
}

function StorageLocationsEditor({ value, onChange }) {
  const [newName, setNewName] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editingValue, setEditingValue] = useState('')

  function addRow() {
    if (!newName.trim()) return
    onChange([...value, { id: crypto.randomUUID(), name: newName.trim() }])
    setNewName('')
  }

  function removeRow(id) {
    onChange(value.filter((row) => row.id !== id))
    if (editingId === id) setEditingId(null)
    if (selectedId === id) setSelectedId(null)
  }

  function startEdit(row) {
    setSelectedId(row.id)
    setEditingId(row.id)
    setEditingValue(row.name)
  }

  function saveEdit(id) {
    if (!editingValue.trim()) return
    onChange(value.map((row) => (row.id === id ? { ...row, name: editingValue.trim() } : row)))
    setEditingId(null)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  return (
    <div className="storage-locations-editor">
      {value.length > 0 && (
        <table className="sub-table">
          <thead>
            <tr>
              <th>Storage Location Name</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {value.map((row) => (
              <tr
                key={row.id}
                className={selectedId === row.id ? 'selected' : undefined}
                onClick={() => setSelectedId(row.id)}
              >
                <td>
                  {editingId === row.id ? (
                    <input
                      type="text"
                      value={editingValue}
                      autoFocus
                      onChange={(event) => setEditingValue(event.target.value)}
                    />
                  ) : (
                    row.name
                  )}
                </td>
                <td onClick={(event) => event.stopPropagation()}>
                  {editingId === row.id ? (
                    <>
                      <button type="button" className="btn-primary" onClick={() => saveEdit(row.id)}>
                        Save
                      </button>
                      <button type="button" className="btn-secondary" onClick={cancelEdit}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="btn-secondary" onClick={() => startEdit(row)}>
                        Edit
                      </button>
                      <button type="button" className="btn-remove" onClick={() => removeRow(row.id)}>
                        Remove
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="sub-table-add">
        <input
          type="text"
          placeholder="e.g. Aisle 3, Bay 2"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
        />
        <button type="button" className="btn-secondary" onClick={addRow}>
          Add Storage Location
        </button>
      </div>
    </div>
  )
}

function FieldInput({ field, value, onChange }) {
  if (field.type === 'checkbox') {
    return <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} />
  }

  if (field.type === 'select') {
    return (
      <select value={value} onChange={(event) => onChange(event.target.value)} required={field.required !== false}>
        <option value="" disabled>
          Select {field.label}
        </option>
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    )
  }

  if (field.type === 'storageLocations') {
    return <StorageLocationsEditor value={value} onChange={onChange} />
  }

  return (
    <input
      type={field.type === 'number' || field.type === 'date' ? field.type : 'text'}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={field.required !== false}
    />
  )
}

function displayValue(field, value) {
  if (field.type === 'checkbox') return value ? 'Yes' : 'No'
  if (field.type === 'storageLocations') {
    return `${value.length} location${value.length === 1 ? '' : 's'}`
  }
  if (field.type === 'number' && field.currency) {
    return value === '' ? '' : `$${Number(value).toLocaleString()}`
  }
  return value
}

export default function MasterDataPage({ title, storageKey, fields }) {
  const { items, addItem, removeItem, updateItem } = useCollection(storageKey)
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState(() => emptyRecord(fields))
  const [editingId, setEditingId] = useState(null)

  function updateField(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (editingId) {
      updateItem(editingId, draft)
    } else {
      addItem(draft)
    }
    setDraft(emptyRecord(fields))
    setEditingId(null)
    setShowForm(false)
  }

  function handleCancel() {
    setDraft(emptyRecord(fields))
    setEditingId(null)
    setShowForm(false)
  }

  function startEdit(item) {
    const record = {}
    fields.forEach((field) => {
      record[field.key] = item[field.key] ?? emptyValueFor(field)
    })
    setDraft(record)
    setEditingId(item.id)
    setShowForm(true)
  }

  function startAdd() {
    setDraft(emptyRecord(fields))
    setEditingId(null)
    setShowForm(true)
  }

  return (
    <div className="master-data-page">
      <div className="page-header">
        <h1>{title}</h1>
        {!showForm && (
          <button className="btn-primary" onClick={startAdd}>
            + Add New
          </button>
        )}
      </div>

      {showForm && (
        <form className="record-form" onSubmit={handleSubmit}>
          {fields.map((field) => (
            <label
              key={field.key}
              className={`form-field${field.type === 'storageLocations' ? ' form-field-wide' : ''}`}
            >
              <span>{field.label}</span>
              <FieldInput field={field} value={draft[field.key]} onChange={(value) => updateField(field.key, value)} />
            </label>
          ))}
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

      {items.length === 0 ? (
        <p className="empty-state">No records yet. Click "+ Add New" to create the first one.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              {fields.map((field) => (
                <th key={field.key}>{field.label}</th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                {fields.map((field) => (
                  <td key={field.key}>{displayValue(field, item[field.key])}</td>
                ))}
                <td className="row-actions">
                  <button className="btn-secondary" onClick={() => startEdit(item)}>
                    Edit
                  </button>
                  <button className="btn-remove" onClick={() => removeItem(item.id)}>
                    Delete
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
