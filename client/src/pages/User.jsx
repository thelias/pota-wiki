import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Nav from '../components/Nav.jsx'
import Footer from '../components/Footer.jsx'
import Pagination from '../components/Pagination.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { QRM_LABELS } from '../constants.js'

const PER_PAGE = 10

export default function User() {
  const { user, loading } = useAuth()
  const navigate          = useNavigate()
  const [tab, setTab]     = useState('reports')

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) navigate('/auth?return=/user', { replace: true })
  }, [user, loading])

  if (loading || !user) return null

  return (
    <>
      <Nav crumb="My Profile" />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 12px 48px' }}>
        {/* Profile header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--green-mid)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.4rem', fontWeight: 700, fontFamily: 'SF Mono, Menlo, Consolas, monospace',
            flexShrink: 0,
          }}>
            {user.callsign.slice(0, 2)}
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'SF Mono, Menlo, Consolas, monospace', color: 'var(--green-dark)' }}>
              {user.callsign}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {user.report_count ?? '…'} activation report{user.report_count !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card">
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {[['reports', '📋 My Reports'], ['settings', '⚙️ Settings']].map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '13px 20px', fontSize: '0.9rem', fontWeight: 600,
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: `2px solid ${tab === t ? 'var(--green-mid)' : 'transparent'}`,
                color: tab === t ? 'var(--green-mid)' : 'var(--text-muted)',
                marginBottom: -1,
              }}>
                {label}
              </button>
            ))}
          </div>

          <div className="card-body">
            {tab === 'settings' && <SettingsTab user={user} />}
            {tab === 'reports'  && <ReportsTab userId={user.id} />}
          </div>
        </div>
      </div>

      <Footer back={{ to: '/', label: '← All Parks' }} />
    </>
  )
}

// ── Settings tab ──────────────────────────────────────────────────────────────

function SettingsTab({ user }) {
  return (
    <div style={{ maxWidth: 420 }}>
      <div className="form-row">
        <label>Callsign</label>
        <input type="text" value={user.callsign} readOnly
          style={{ background: '#f4f6f2', color: 'var(--text-muted)', cursor: 'not-allowed',
                   fontFamily: 'SF Mono, Menlo, Consolas, monospace', fontWeight: 700 }} />
        <div className="field-hint">Callsigns cannot be changed.</div>
      </div>
      <div className="form-row">
        <label>Email</label>
        <input type="email" value={user.email} readOnly
          style={{ background: '#f4f6f2', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
        <div className="field-hint">Used only for password reset. Never shared.</div>
      </div>
    </div>
  )
}

// ── Reports tab ───────────────────────────────────────────────────────────────

function ReportsTab({ userId }) {
  const [reports,    setReports]    = useState([])
  const [total,      setTotal]      = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page,       setPage]       = useState(1)
  const [loading,    setLoading]    = useState(true)

  function fetchPage(p) {
    setLoading(true)
    fetch(`/api/auth/my-reports?page=${p}&limit=${PER_PAGE}`)
      .then(r => r.ok ? r.json() : { reports: [], total: 0, totalPages: 1 })
      .then(({ reports, total, totalPages }) => {
        setReports(reports)
        setTotal(total)
        setTotalPages(totalPages)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchPage(1) }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  function handlePageChange(n) {
    setPage(n)
    fetchPage(n)
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
      <span className="spinner" />
    </div>
  )

  if (!total) return (
    <div className="empty-placeholder">
      You haven't submitted any activation reports yet.{' '}
      <Link to="/" style={{ color: 'var(--green-mid)' }}>Browse parks →</Link>
    </div>
  )

  return (
    <div>
      {reports.map(r => (
        <Link key={r.id} to={`/park/${encodeURIComponent(r.park_reference)}`}
          style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 14,
            padding: '14px 0', borderBottom: '1px solid var(--border)',
            transition: 'background 0.1s', borderRadius: 4,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--green-muted)'}
          onMouseLeave={e => e.currentTarget.style.background = ''}>

            {/* Date block */}
            <div style={{
              minWidth: 52, textAlign: 'center', background: 'var(--green-muted)',
              borderRadius: 6, padding: '6px 4px', flexShrink: 0,
            }}>
              {r.activation_date ? (
                <>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1, color: 'var(--green-dark)' }}>
                    {new Date(r.activation_date).toLocaleDateString('en-US', { day: 'numeric' })}
                  </div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 2 }}>
                    {new Date(r.activation_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>No date</div>
              )}
            </div>

            {/* Details */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 3 }}>
                {r.park_name}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'SF Mono, Menlo, Consolas, monospace', fontWeight: 600, color: 'var(--green-mid)' }}>
                  {r.park_reference}
                </span>
                {r.qrm_level && (
                  <span className={`qrm-badge ${QRM_LABELS[r.qrm_level]?.cls || ''}`}>
                    {QRM_LABELS[r.qrm_level]?.label || r.qrm_level} QRM
                  </span>
                )}
                {r.general_comments && (
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                    {r.general_comments}
                  </span>
                )}
              </div>
            </div>

            <span style={{ color: 'var(--green-mid)', fontWeight: 600, fontSize: '0.85rem', flexShrink: 0, alignSelf: 'center' }}>→</span>
          </div>
        </Link>
      ))}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPage={handlePageChange} />
      )}
    </div>
  )
}
