import { useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import Nav from '../components/Nav.jsx'

export default function ResetPassword() {
  const [params]    = useSearchParams()
  const navigate    = useNavigate()
  const token       = params.get('token')

  const [password,  setPassword]  = useState('')
  const [password2, setPassword2] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [msg,       setMsg]       = useState(null)
  const [done,      setDone]      = useState(false)

  if (!token) return (
    <>
      <Nav />
      <div style={{ maxWidth: 420, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Invalid reset link.</p>
        <Link to="/auth" style={{ color: 'var(--green-mid)' }}>Back to login →</Link>
      </div>
    </>
  )

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 8) return setMsg('Password must be at least 8 characters.')
    if (password !== password2) return setMsg('Passwords do not match.')
    setLoading(true)
    setMsg(null)
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setMsg(data.error || 'Something went wrong.'); return }
      setDone(true)
      setTimeout(() => navigate('/auth'), 3000)
    } catch {
      setMsg('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 420, margin: '60px auto', padding: '0 24px' }}>
        <div className="card">
          <div className="card-header"><h2>Reset Password</h2></div>
          <div className="card-body">
            {done ? (
              <div className="submit-msg success">
                Password updated! Redirecting to login…
              </div>
            ) : (
              <form onSubmit={handleSubmit} onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}>
                <div className="form-row">
                  <label>New Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters" autoFocus />
                </div>
                <div className="form-row">
                  <label>Confirm Password</label>
                  <input type="password" value={password2} onChange={e => setPassword2(e.target.value)}
                    placeholder="Repeat password" />
                </div>
                {msg && <div className="submit-msg error" style={{ marginBottom: 12 }}>{msg}</div>}
                <button type="submit" className="btn-green" disabled={loading}>
                  {loading ? 'Saving…' : 'Set New Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
