import { useState } from 'react'
import { useAppData } from '../data/AppDataContext.jsx'
import { APP_VERSION, INSTALLED_AT, LAST_UPDATED_AT } from '../data/appInfo.js'

const emptyDraft = { name: '', email: '', role: 'Standard' }
const ROLES = ['Admin', 'Standard', 'Read-only']

export default function Admin() {
  const { users, addUser, toggleUserActive, totalSeats, setTotalSeats } = useAppData()
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState(emptyDraft)

  const seatsUsed = users.filter((user) => user.status === 'active').length
  const seatsAvailable = Math.max(totalSeats - seatsUsed, 0)

  function updateField(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    addUser(draft)
    setDraft(emptyDraft)
    setShowForm(false)
  }

  return (
    <div className="admin-page">
      <h1>Admin</h1>

      <div className="kpi-strip">
        <div className="kpi-card">
          <span className="kpi-value">{APP_VERSION}</span>
          <span className="kpi-label">Version</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{INSTALLED_AT}</span>
          <span className="kpi-label">Installed</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{LAST_UPDATED_AT}</span>
          <span className="kpi-label">Last Updated</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">
            {seatsUsed} / {totalSeats}
          </span>
          <span className="kpi-label">Seats Used · {seatsAvailable} Available</span>
        </div>
      </div>

      <label className="form-field form-field-narrow">
        <span>Total Licensed Seats</span>
        <input
          type="number"
          min="0"
          value={totalSeats}
          onChange={(event) => setTotalSeats(Number(event.target.value) || 0)}
        />
      </label>

      <div className="page-header">
        <h2>User Management</h2>
        {!showForm && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            + Add User
          </button>
        )}
      </div>

      {showForm && (
        <form className="record-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Name</span>
            <input type="text" value={draft.name} onChange={(event) => updateField('name', event.target.value)} required />
          </label>
          <label className="form-field">
            <span>Email</span>
            <input
              type="email"
              value={draft.email}
              onChange={(event) => updateField('email', event.target.value)}
              required
            />
          </label>
          <label className="form-field">
            <span>Role</span>
            <select value={draft.role} onChange={(event) => updateField('role', event.target.value)}>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              Save
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setDraft(emptyDraft)
                setShowForm(false)
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {users.length === 0 ? (
        <p className="empty-state">No users yet. Click "+ Add User" to create the first one.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <span className={`status-pill ${user.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                    {user.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button className="btn-secondary" onClick={() => toggleUserActive(user.id)}>
                    {user.status === 'active' ? 'Deactivate' : 'Activate'}
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
