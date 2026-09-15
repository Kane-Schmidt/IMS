import { useState } from 'react'
import { useAuth } from '../../lib/AuthContext.jsx'

export default function OrganizationSetup() {
  const { createOrganization, joinOrganization, signOut, user } = useAuth()
  const [mode, setMode] = useState('create')
  const [orgName, setOrgName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'create') {
        await createOrganization(orgName.trim())
      } else {
        await joinOrganization(inviteCode.trim())
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Set Up Your Account</h1>
        <p className="page-subtitle">Signed in as {user?.email}.</p>

        <div className="tab-bar">
          <button className={`tab-button${mode === 'create' ? ' active' : ''}`} onClick={() => setMode('create')}>
            Create a Company
          </button>
          <button className={`tab-button${mode === 'join' ? ' active' : ''}`} onClick={() => setMode('join')}>
            Join a Company
          </button>
        </div>

        {error && <p className="form-message auth-error">{error}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'create' ? (
            <label className="form-field">
              <span>Company Name</span>
              <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
            </label>
          ) : (
            <label className="form-field">
              <span>Invite Code</span>
              <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="Ask your admin for this" required />
            </label>
          )}
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Please wait…' : mode === 'create' ? 'Create Company' : 'Join Company'}
          </button>
        </form>

        <button type="button" className="btn-secondary auth-signout" onClick={signOut}>
          Sign Out
        </button>
      </div>
    </div>
  )
}
