import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { useWarehouses } from '../data/useSites.js'
import { APP_VERSION, INSTALLED_AT, LAST_UPDATED_AT, SUPPORT_EMAIL } from '../data/appInfo.js'
import Modal from '../components/Modal.jsx'

const ROLES = ['admin', 'standard', 'read-only']
const URGENCY_OPTIONS = ['Immediately', 'Within 1 week', 'Within 1 month', 'Flexible']
const emptySeatRequest = { additionalSeats: '', reason: '', urgency: 'Within 1 week' }

export default function Admin() {
  const { organization, profile: myProfile, refreshProfile } = useAuth()
  const { warehouses } = useWarehouses()
  const [members, setMembers] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [showSeatRequest, setShowSeatRequest] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!organization) return
    let active = true
    setLoaded(false)

    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          console.error('Failed to load organization members:', error.message)
        } else {
          setMembers(data ?? [])
        }
        setLoaded(true)
      })

    return () => {
      active = false
    }
  }, [organization])

  const seatsUsed = members.filter((member) => member.status === 'active').length
  const totalSeats = organization?.seat_limit ?? 0
  const seatsAvailable = Math.max(totalSeats - seatsUsed, 0)
  const canManageMembers = myProfile?.role === 'admin'

  async function updateMember(id, updates) {
    setMembers((prev) => prev.map((member) => (member.id === id ? { ...member, ...updates } : member)))
    const { error } = await supabase.from('profiles').update(updates).eq('id', id)
    if (error) {
      console.error('Failed to update member:', error.message)
      return
    }
    // Keep the signed-in user's own permissions current if they edited themselves.
    if (id === myProfile?.id) await refreshProfile()
  }

  async function copyInviteCode() {
    try {
      await navigator.clipboard.writeText(organization.invite_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard access denied — the code is still visible to copy manually
    }
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
      </div>

      <p className="page-subtitle">
        Invite Code: <strong>{organization?.invite_code}</strong> — share it so a teammate can join under Sign Up →
        Join a Company.{' '}
        <button type="button" className="btn-secondary" onClick={copyInviteCode}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </p>

      {!loaded ? (
        <p className="empty-state">Loading…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Receiver</th>
              <th>Warehouses</th>
              {canManageMembers && <th></th>}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>{member.name || '—'}</td>
                <td>{member.email}</td>
                <td>{member.role}</td>
                <td>
                  <span className={`status-pill ${member.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                    {member.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{member.is_receiver ? 'Yes' : 'No'}</td>
                <td>{(member.assigned_warehouses ?? []).length}</td>
                {canManageMembers && (
                  <td className="row-actions">
                    <button className="btn-secondary" onClick={() => setEditingMember(member)}>
                      Edit
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => updateMember(member.id, { status: member.status === 'active' ? 'inactive' : 'active' })}
                    >
                      {member.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showSeatRequest && (
        <RequestSeatsModal onSubmit={handleSeatRequestSubmit} onClose={() => setShowSeatRequest(false)} />
      )}

      {editingMember && (
        <MemberModal
          member={editingMember}
          warehouses={warehouses}
          onSave={(updates) => {
            updateMember(editingMember.id, updates)
            setEditingMember(null)
          }}
          onClose={() => setEditingMember(null)}
        />
      )}
    </div>
  )
}

function MemberModal({ member, warehouses, onSave, onClose }) {
  const [role, setRole] = useState(member.role)
  const [isReceiver, setIsReceiver] = useState(member.is_receiver ?? false)
  const [assigned, setAssigned] = useState(member.assigned_warehouses ?? [])

  function toggleWarehouse(id) {
    setAssigned((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSave({ role, is_receiver: isReceiver, assigned_warehouses: assigned })
  }

  return (
    <Modal title={member.email} onClose={onClose}>
      <form className="record-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>Role</span>
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            {ROLES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Receiver</span>
          <input type="checkbox" checked={isReceiver} onChange={(event) => setIsReceiver(event.target.checked)} />
        </label>

        <div className="form-field form-field-wide">
          <span>Assigned Warehouses</span>
          {warehouses.length === 0 ? (
            <p className="empty-state">
              No warehouses yet. Add a location with type Warehouse under Location Master Data first.
            </p>
          ) : (
            <div className="warehouse-checklist">
              {warehouses.map((warehouse) => (
                <label key={warehouse.id} className="warehouse-checklist-option">
                  <input
                    type="checkbox"
                    checked={assigned.includes(warehouse.id)}
                    onChange={() => toggleWarehouse(warehouse.id)}
                  />
                  <span>{warehouse.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {isReceiver && assigned.length === 0 && (
          <p className="chart-card-note form-field-wide">
            A receiver with no assigned warehouses won't be able to receive anything.
          </p>
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
