import { useState } from 'react'
import { useAuth } from '../../lib/AuthContext.jsx'

export default function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
    setMessage('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      if (mode === 'sign-in') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
        setMessage('Account created. If email confirmation is required, check your inbox, then sign in.')
        setMode('sign-in')
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
        <h1>Schmidt Systems IMS</h1>
        <div className="tab-bar">
          <button className={`tab-button${mode === 'sign-in' ? ' active' : ''}`} onClick={() => switchMode('sign-in')}>
            Sign In
          </button>
          <button className={`tab-button${mode === 'sign-up' ? ' active' : ''}`} onClick={() => switchMode('sign-up')}>
            Sign Up
          </button>
        </div>

        {error && <p className="form-message auth-error">{error}</p>}
        {message && <p className="form-message">{message}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="form-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </label>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Please wait…' : mode === 'sign-in' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
