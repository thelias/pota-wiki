import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Nav from '../components/Nav.jsx'
import Footer from '../components/Footer.jsx'

const TODAY = new Date().toISOString().slice(0, 10)

export default function Admin() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'moderator')) {
      navigate('/', { replace: true })
    }
  }, [user, authLoading])

  useEffect(() => {
    if (user?.role === 'moderator') {
      fetch('/api/admin/stats')
        .then(r => r.ok ? r.json() : null)
        .then(setStats)
    }
  }, [user])

  if (authLoading || !user) return null

  return (
    <>
      <Nav crumb="Mod Panel" />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 80px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 4 }}>Mod Panel</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 24 }}>
          Activity filtered by date — defaults to today
        </p>

        {/* Overall stats */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
          {[
            { label: 'Users', value: stats?.users },
            { label: 'Activation Reports', value: stats?.reports },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              padding: '16px 28px', display: 'flex', alignItems: 'baseline', gap: 12,
            }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--green-dark)', lineHeight: 1 }}>
                {value != null ? value.toLocaleString() : '—'}
              </span>
              <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: 24 }}>
          <ActivityPanel
            title="Accounts"
            endpoint="/api/admin/signups"
            renderItem={item => <SignupRow item={item} />}
            emptyText="No signups on this date."
          />
          <ActivityPanel
            title="Activations"
            endpoint="/api/admin/reports"
            renderItem={(item, onDeleted) => <ReportRow item={item} onDeleted={onDeleted} />}
            emptyText="No reports submitted on this date."
          />
        </div>
      </div>

      <Footer />
    </>
  )
}

const DATE_INPUT_STYLE = {
  fontSize: '0.85rem', padding: '4px 8px',
  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  outline: 'none', cursor: 'pointer',
}

function ActivityPanel({ title, endpoint, renderItem, emptyText }) {
  const [from,       setFrom]       = useState(TODAY)
  const [to,         setTo]         = useState(TODAY)
  const [items,      setItems]      = useState([])
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  function fetchData(p, f, t) {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ page: p, from: f, to: t })
    fetch(`${endpoint}?${params}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(({ items, total, page, totalPages }) => {
        setItems(items)
        setTotal(total)
        setPage(page)
        setTotalPages(totalPages)
        setLoading(false)
      })
      .catch(() => { setError('Failed to load.'); setLoading(false) })
  }

  useEffect(() => { fetchData(1, TODAY, TODAY) }, [])

  function handleFrom(e) {
    const f = e.target.value
    setFrom(f)
    // if from > to, snap to to date
    const t = f > to ? f : to
    setTo(t)
    setPage(1)
    fetchData(1, f, t)
  }

  function handleTo(e) {
    const t = e.target.value
    setTo(t)
    setPage(1)
    fetchData(1, from, t)
  }

  function handlePage(n) {
    setPage(n)
    fetchData(n, from, to)
  }

  return (
    <div className="card">
      <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {!loading && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: 4 }}>
              {total} {total === 1 ? 'result' : 'results'}
            </span>
          )}
          <input type="date" value={from} max={TODAY} onChange={handleFrom} style={DATE_INPUT_STYLE} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>to</span>
          <input type="date" value={to} min={from} max={TODAY} onChange={handleTo} style={DATE_INPUT_STYLE} />
        </div>
      </div>

      <div className="card-body" style={{ padding: 0 }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <span className="spinner" />
          </div>
        )}
        {!loading && error && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#c0392b' }}>{error}</div>
        )}
        {!loading && !error && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {emptyText}
          </div>
        )}
        {!loading && !error && items.map((item, i) => (
          <div key={item.id} style={{ borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
            {renderItem(item, id => setItems(prev => prev.filter(r => r.id !== id)))}
          </div>
        ))}

        {!loading && totalPages > 1 && (
          <AdminPagination page={page} totalPages={totalPages} onPage={handlePage} />
        )}
      </div>
    </div>
  )
}

function SignupRow({ item }) {
  const ts = new Date(item.ts)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px' }}>
      <div style={{
        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
        background: 'var(--green-mid)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'SF Mono, Menlo, Consolas, monospace', fontWeight: 700, fontSize: '0.8rem',
      }}>
        {item.callsign.slice(0, 2)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link to={`/profile/${encodeURIComponent(item.callsign)}`}
          style={{ fontWeight: 700, fontFamily: 'SF Mono, Menlo, Consolas, monospace', color: 'var(--green-dark)', fontSize: '0.95rem' }}>
          {item.callsign}
        </Link>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.email}
        </div>
      </div>
      <div style={{ flexShrink: 0, fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'right' }}>
        {ts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
      </div>
    </div>
  )
}

function ReportRow({ item, onDeleted }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const ts = new Date(item.ts)

  function handleDelete() {
    setDeleting(true)
    fetch(`/api/reports/${item.id}`, { method: 'DELETE' })
      .then(r => { if (r.ok) onDeleted(item.id) })
      .finally(() => setDeleting(false))
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.92rem', marginBottom: 3 }}>
          <Link to={`/profile/${encodeURIComponent(item.callsign)}`}
            style={{ fontWeight: 700, fontFamily: 'SF Mono, Menlo, Consolas, monospace', color: 'var(--green-dark)' }}>
            {item.callsign}
          </Link>
          {' → '}
          <Link to={`/park/${encodeURIComponent(item.park_reference)}`}
            style={{ fontWeight: 600, color: 'var(--green-mid)' }}>
            {item.park_name || item.park_reference}
          </Link>
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: 10 }}>
          <span style={{ fontFamily: 'SF Mono, Menlo, Consolas, monospace' }}>{item.park_reference}</span>
          {item.activation_date && (
            <span>activated {new Date(item.activation_date.slice(0, 10).replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          )}
        </div>
      </div>
      <div style={{ flexShrink: 0, fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'right' }}>
        {ts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
      </div>
      <div style={{ flexShrink: 0 }}>
        {confirming ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleDelete} disabled={deleting}
              style={{ fontSize: '0.78rem', padding: '3px 8px', borderRadius: 4, border: '1px solid #e53e3e', background: '#e53e3e', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
              {deleting ? '…' : 'Confirm'}
            </button>
            <button onClick={() => setConfirming(false)}
              style={{ fontSize: '0.78rem', padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)}
            style={{ fontSize: '0.78rem', padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)', background: '#fff', color: '#e53e3e', cursor: 'pointer', fontWeight: 600 }}>
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

function AdminPagination({ page, totalPages, onPage }) {
  const pages = []
  const start = Math.max(1, page - 2)
  const end   = Math.min(totalPages, page + 2)
  for (let i = start; i <= end; i++) pages.push(i)

  const Btn = ({ n, label, disabled, active }) => (
    <button onClick={() => onPage(n)} disabled={disabled}
      style={{
        padding: '5px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
        background: active ? 'var(--green-mid)' : '#fff', color: active ? '#fff' : 'var(--text)',
        fontWeight: 600, fontSize: '0.8rem', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
      }}>
      {label ?? n}
    </button>
  )

  return (
    <div style={{ display: 'flex', gap: 5, justifyContent: 'center', padding: '14px 20px', flexWrap: 'wrap' }}>
      <Btn n={page - 1} label="←" disabled={page === 1} />
      {start > 1 && <><Btn n={1} />{start > 2 && <span style={{ alignSelf: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>…</span>}</>}
      {pages.map(n => <Btn key={n} n={n} active={n === page} />)}
      {end < totalPages && <>{end < totalPages - 1 && <span style={{ alignSelf: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>…</span>}<Btn n={totalPages} /></>}
      <Btn n={page + 1} label="→" disabled={page === totalPages} />
    </div>
  )
}
