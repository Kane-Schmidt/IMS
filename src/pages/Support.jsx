import { useState } from 'react'
import { useAppData } from '../data/AppDataContext.jsx'
import { SUPPORT_EMAIL } from '../data/appInfo.js'

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']

const emptyForm = { subject: '', priority: 'Medium', description: '' }

export default function Support() {
  const { tickets, addTicket } = useAppData()
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState('')

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!form.subject.trim() || !form.description.trim()) {
      setMessage('Enter a subject and description before submitting.')
      return
    }

    addTicket(form)

    const body = `Priority: ${form.priority}\n\n${form.description}`
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      `[Schmidt Systems IMS] ${form.subject}`,
    )}&body=${encodeURIComponent(body)}`
    window.location.href = mailtoUrl

    setMessage('Ticket logged. Your email app should have opened with the details ready — press send there to reach support.')
    setForm(emptyForm)
  }

  return (
    <div className="support-page">
      <h1>Support</h1>
      <p className="page-subtitle">
        Submitting a ticket opens your email app with the details addressed to {SUPPORT_EMAIL} — just hit send there.
      </p>

      {message && <p className="form-message">{message}</p>}

      <form className="record-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>Subject</span>
          <input type="text" value={form.subject} onChange={(event) => updateForm('subject', event.target.value)} required />
        </label>
        <label className="form-field">
          <span>Priority</span>
          <select value={form.priority} onChange={(event) => updateForm('priority', event.target.value)}>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field form-field-wide">
          <span>Description</span>
          <textarea
            rows={5}
            value={form.description}
            onChange={(event) => updateForm('description', event.target.value)}
            required
          />
        </label>
        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Submit Ticket
          </button>
        </div>
      </form>

      <h2>My Tickets</h2>
      {tickets.length === 0 ? (
        <p className="empty-state">No tickets submitted yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Priority</th>
              <th>Submitted</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {[...tickets].reverse().map((ticket) => (
              <tr key={ticket.id}>
                <td>{ticket.subject}</td>
                <td>{ticket.priority}</td>
                <td>{new Date(ticket.submittedAt).toLocaleString()}</td>
                <td>
                  <span className="status-pill status-active">{ticket.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
