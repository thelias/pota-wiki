import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Nav from '../components/Nav.jsx'
import Footer from '../components/Footer.jsx'

export default function Auth() {
  const [params]        = useSearchParams()
  const [tab, setTab]   = useState(params.get('tab') === 'signup' ? 'signup' : 'login')
  const [fields, setFields] = useState({ callsign: '', email: '', password: '' })
  const [msg, setMsg]   = useState(null) // { text, type }
  const [loading, setLoading] = useState(false)
  const { user, login } = useAuth()
  const navigate        = useNavigate()
  const returnTo        = params.get('return') || '/'

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate(returnTo, { replace: true })
  }, [user])

  const set = (k) => (e) => setFields(f => ({ ...f, [k]: k === 'callsign' ? e.target.value.toUpperCase() : e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setMsg(null)

    const { callsign, email, password } = fields
    if (tab === 'login' && (!callsign || !password))
      return setMsg({ text: 'Callsign and password are required.', type: 'error' })
    if (tab === 'signup' && (!callsign || !email || !password))
      return setMsg({ text: 'All fields are required.', type: 'error' })
    if (tab === 'signup' && password.length < 8)
      return setMsg({ text: 'Password must be at least 8 characters.', type: 'error' })

    setLoading(true)
    try {
      if (tab === 'signup') {
        const cs = callsign.trim().toUpperCase()
        const check = await fetch(`/api/auth/check-callsign?callsign=${encodeURIComponent(cs)}`)
        if (!check.ok) {
          setMsg({ text: 'Callsign not found on POTA. You must have a POTA account to register.', type: 'error' })
          setLoading(false)
          return
        }
      }

      const body = tab === 'login'
        ? { callsign, password }
        : { callsign, email, password }

      const res  = await fetch(`/api/auth/${tab === 'login' ? 'login' : 'signup'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) return setMsg({ text: data.error, type: 'error' })
      login(data)
      navigate(returnTo, { replace: true })
    } catch {
      setMsg({ text: 'Network error. Try again.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Nav crumb={tab === 'login' ? 'Log In' : 'Sign Up'} />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', minHeight: 'calc(100vh - 41px)' }}>
        <div className="card" style={{ width: '100%', maxWidth: 420 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {['login', 'signup'].map(t => (
              <button key={t} onClick={() => { setTab(t); setMsg(null); setCsStatus(null) }} style={{
                flex: 1, padding: '14px', fontSize: '0.95rem', fontWeight: 600,
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: `2px solid ${tab === t ? 'var(--green-mid)' : 'transparent'}`,
                color: tab === t ? 'var(--green-mid)' : 'var(--text-muted)',
                marginBottom: -1,
              }}>
                {t === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <div className="card-body">
            <form onSubmit={submit}>
              <div className="form-row">
                <label>Callsign</label>
                <input type="text" placeholder="W7ABC" maxLength={14}
                  value={fields.callsign}
                  onChange={set('callsign')}
                  style={{ width: '100%' }} />
                {tab === 'signup' && (
                  <div className="field-hint">This will be your username. You must have an active POTA account to register.</div>
                )}
              </div>

              {tab === 'signup' && (
                <div className="form-row">
                  <label>Email</label>
                  <input type="email" placeholder="you@example.com"
                    value={fields.email} onChange={set('email')} />
                  <div className="field-hint">Only used for password reset. Never shared.</div>
                </div>
              )}

              <div className="form-row" style={{ marginBottom: 20 }}>
                <label>Password</label>
                <input type="password" placeholder={tab === 'signup' ? 'Min. 8 characters' : '••••••••'}
                  value={fields.password} onChange={set('password')} />
              </div>

              <button type="submit" className="btn-green" disabled={loading || (tab === 'signup' && (
                !fields.callsign.trim() || !fields.email.trim() || fields.password.length < 8
              ))}>
                {loading ? (tab === 'login' ? 'Logging in…' : 'Creating account…') : (tab === 'login' ? 'Log In' : 'Create Account')}
              </button>

              {msg && (
                <div className={`submit-msg ${msg.type}`} style={{ display: 'block', marginTop: 14 }}>
                  {msg.text}
                </div>
              )}
            </form>
            {tab === 'login' && <ForgotPassword />}
          </div>
        </div>
      </div>

      <Footer back={{ to: '/', label: '← Back to POTA Wiki' }} />
    </>
  )
}

function ForgotPassword() {
  const [open,    setOpen]    = useState(false)
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)

  const [err, setErr] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErr(null)
    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error || 'Something went wrong.'); return }
      setSent(true)
    } catch {
      setErr('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return (
    <button type="button" onClick={() => setOpen(true)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem', padding: 0 }}>
      Forgot password?
    </button>
  )

  return (
    <div style={{ marginTop: 16, padding: 16, background: 'var(--green-muted)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', width: '100%' }}>
      {sent ? (
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--green-dark)' }}>
          If that email is registered, a reset link is on its way.
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
            Enter your account email
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required
              style={{ flex: 1, fontSize: '0.9rem' }} />
            <button type="submit" className="btn-green" disabled={loading} style={{ whiteSpace: 'nowrap' }}>
              {loading ? '…' : 'Send link'}
            </button>
          </div>
          {err && <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: 'var(--red, #c0392b)' }}>{err}</p>}
        </form>
      )}
    </div>
  )
}
