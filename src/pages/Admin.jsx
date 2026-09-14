import { useState } from 'react'
import { useAppData } from '../data/AppDataContext.jsx'
import { APP_VERSION, INSTALLED_AT, LAST_UPDATED_AT, SUPPORT_EMAIL } from '../data/appInfo.js'
import Modal from '../components/Modal.jsx'

const emptyDraft = { name: '', email: '', role: 'Standard' }
const ROLES = ['Admin', 'Standard', 'Read-only']
const URGENCY_OPTIONS = ['Immediately', 'Within 1 week', 'Within 1 month', 'Flexible']
const emptySeatRequest = { additionalSeats: '', reason: '', urgency: 'Within 1 week' }

export default function Admin() {
  const { users, addUser, toggleUserActive, totalSeats } = useAppData()
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState(emptyDraft)
  const [showSeatRequest, setShowSeatRequest] = useState(false)
  const [message, setMessage] = useState('')

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

  function handleSeatRequestSubmit(request) {
    const body = [
      `Additional seats requested: ${request.additionalSeats}`,
      `Urgency: ${request.urgency}`,
      request.reason.trim() ? `Reason: ${request.reason.trim()}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      '[Schmidt Systems IMS] Request Additional Seats',
    )}&body=${encodeURIComponent(body)}`
    window.location.href = mailtoUrl

    setShowSeatRequest(false)
    setMessage('Request logged. Your email app should have opened with the details ready — press send there to reach us.')
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

      {message && <p className="form-message">{message}</p>}

      <div className="form-actions form-field-narrow">
        <button className="btn-secondary" onClick={() => setShowSeatRequest(true)}>
          Request Additional Seats
        </button>
      </div>

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

      {showSeatRequest && (
        <RequestSeatsModal onSubmit={handleSeatRequestSubmit} onClose={() => setShowSeatRequest(false)} />
      )}
    </div>
  )
}

function RequestSeatsModal({ onSubmit, onClose }) {
  const [form, setForm] = useState(emptySeatRequest)

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!form.additionalSeats || Number(form.additionalSeats) <= 0) return
    onSubmit(form)
  }

  return (
    <Modal title="Request Additional Seats" onClose={onClose}>
      <form className="record-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>How many additional seats would you like to add?</span>
          <input
            type="number"
            min="1"
            value={form.additionalSeats}
            onChange={(event) => updateField('additionalSeats', event.target.value)}
            required
          />
        </label>
        <label className="form-field">
          <span>How quickly do you need these seats?</span>
          <select value={form.urgency} onChange={(event) => updateField('urgency', event.target.value)}>
            {URGENCY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field form-field-wide">
          <span>Reason (optional)</span>
          <textarea rows={3} value={form.reason} onChange={(event) => updateField('reason', event.target.value)} />
        </label>
        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Submit
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}
