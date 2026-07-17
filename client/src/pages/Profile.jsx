import { useState, useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import Nav from '../components/Nav.jsx'
import Pagination from '../components/Pagination.jsx'
import Footer from '../components/Footer.jsx'
import { QRM_LABELS } from '../constants.js'

const PER_PAGE = 10

export default function Profile() {
  const { callsign }             = useParams()
  const cs                       = callsign.toUpperCase()
  const [reports,      setReports]      = useState([])
  const [total,        setTotal]        = useState(0)
  const [totalPages,   setTotalPages]   = useState(1)
  const [page,         setPage]         = useState(1)
  const [helpfulCount, setHelpfulCount] = useState(null)
  const [loading, setLoading]    = useState(true)
  const [notFound, setNotFound]  = useState(false)
  const topRef                   = useRef(null)

  function fetchPage(p) {
    setLoading(true)
    fetch(`/api/auth/users/${encodeURIComponent(cs)}/reports?page=${p}&limit=${PER_PAGE}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(({ reports, total, totalPages, helpful_count }) => {
        setReports(reports)
        setTotal(total)
        setTotalPages(totalPages)
        if (helpful_count != null) setHelpfulCount(helpful_count)
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }

  // Reset when callsign changes
  useEffect(() => {
    setPage(1)
    setNotFound(false)
    fetchPage(1)
  }, [cs]) // eslint-disable-line react-hooks/exhaustive-deps

  function handlePageChange(n) {
    setPage(n)
    fetchPage(n)
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <Nav crumb={cs} />

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
            {cs.slice(0, 2)}
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'SF Mono, Menlo, Consolas, monospace', color: 'var(--green-dark)' }}>
              {cs}
            </div>
            {!loading && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span>{total} activation report{total !== 1 ? 's' : ''}</span>
                {helpfulCount > 0 && (
                  <span>👍 {helpfulCount} helpful vote{helpfulCount !== 1 ? 's' : ''}</span>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <a href={`https://www.qrz.com/db/${cs}`} target="_blank" rel="noreferrer"
                style={{ fontSize: '0.78rem', fontWeight: 600, padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)', background: '#fff', color: 'var(--text-muted)', textDecoration: 'none' }}>
                QRZ →
              </a>
              <a href={`https://pota.app/#/profile/${cs}`} target="_blank" rel="noreferrer"
                style={{ fontSize: '0.78rem', fontWeight: 600, padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)', background: '#fff', color: 'var(--text-muted)', textDecoration: 'none' }}>
                POTA →
              </a>
            </div>
          </div>
        </div>

        <div className="card" ref={topRef}>
          <div className="card-header">
            <h2>Activation Reports</h2>
          </div>
          <div className="card-body">
            {loading && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                <span className="spinner" />
              </div>
            )}

            {!loading && (notFound || total === 0) && (
              <div className="empty-placeholder">
                No activation reports found for {cs}.{' '}
                <Link to="/" style={{ color: 'var(--green-mid)' }}>Browse parks →</Link>
              </div>
            )}

            {!loading && reports.map(r => (
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
                          {new Date(r.activation_date.slice(0, 10).replace(/-/g, '/')).toLocaleDateString('en-US', { day: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 2 }}>
                          {new Date(r.activation_date.slice(0, 10).replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
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

            {!loading && totalPages > 1 && (
              <Pagination page={page} totalPages={totalPages} onPage={handlePageChange} />
            )}
          </div>
        </div>
      </div>

      <Footer back={{ to: '/', label: '← All Parks' }} />
    </>
  )
}
