import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { APP_VERSION, INSTALLED_AT, LAST_UPDATED_AT, SUPPORT_EMAIL } from '../data/appInfo.js'
import Modal from '../components/Modal.jsx'

const ROLES = ['admin', 'standard', 'read-only']
const URGENCY_OPTIONS = ['Immediately', 'Within 1 week', 'Within 1 month', 'Flexible']
const emptySeatRequest = { additionalSeats: '', reason: '', urgency: 'Within 1 week' }

export default function Admin() {
  const { organization, profile: myProfile } = useAuth()
  const [members, setMembers] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [showSeatRequest, setShowSeatRequest] = useState(false)
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
    if (error) console.error('Failed to update member:', error.message)
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
              {canManageMembers && <th></th>}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>{member.name || '—'}</td>
                <td>{member.email}</td>
                <td>
                  {canManageMembers ? (
                    <select value={member.role} onChange={(event) => updateMember(member.id, { role: event.target.value })}>
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  ) : (
                    member.role
                  )}
                </td>
                <td>
                  <span className={`status-pill ${member.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                    {member.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {canManageMembers && (
                  <td>
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
