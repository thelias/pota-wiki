import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const STATE_NAMES = {
  'US-AL': 'Alabama',        'US-AK': 'Alaska',         'US-AZ': 'Arizona',
  'US-AR': 'Arkansas',       'US-CA': 'California',     'US-CO': 'Colorado',
  'US-CT': 'Connecticut',    'US-DC': 'Washington D.C.','US-DE': 'Delaware',
  'US-FL': 'Florida',        'US-GA': 'Georgia',        'US-HI': 'Hawaii',
  'US-ID': 'Idaho',          'US-IL': 'Illinois',       'US-IN': 'Indiana',
  'US-IA': 'Iowa',           'US-KS': 'Kansas',         'US-KY': 'Kentucky',
  'US-LA': 'Louisiana',      'US-ME': 'Maine',          'US-MD': 'Maryland',
  'US-MA': 'Massachusetts',  'US-MI': 'Michigan',       'US-MN': 'Minnesota',
  'US-MS': 'Mississippi',    'US-MO': 'Missouri',       'US-MT': 'Montana',
  'US-NE': 'Nebraska',       'US-NV': 'Nevada',         'US-NH': 'New Hampshire',
  'US-NJ': 'New Jersey',     'US-NM': 'New Mexico',     'US-NY': 'New York',
  'US-NC': 'North Carolina', 'US-ND': 'North Dakota',   'US-OH': 'Ohio',
  'US-OK': 'Oklahoma',       'US-OR': 'Oregon',         'US-PA': 'Pennsylvania',
  'US-RI': 'Rhode Island',   'US-SC': 'South Carolina', 'US-SD': 'South Dakota',
  'US-TN': 'Tennessee',      'US-TX': 'Texas',          'US-UT': 'Utah',
  'US-VT': 'Vermont',        'US-VA': 'Virginia',       'US-WA': 'Washington',
  'US-WV': 'West Virginia',  'US-WI': 'Wisconsin',      'US-WY': 'Wyoming',
}
const PAGE_SIZE   = 21

export default function Home() {
  const [parks,      setParks]      = useState([])
  const [total,      setTotal]      = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  const [search,     setSearch]     = useState('')
  const [debSearch,  setDebSearch]  = useState('')   // debounced
  const [stateTab,   setStateTab]   = useState('ALL')
  const [page,       setPage]       = useState(1)
  const [userCoords, setUserCoords] = useState(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError,   setGeoError]   = useState(null)
  const { user, logout } = useAuth()

  // Debounce search input — reset page on change
  useEffect(() => {
    const t = setTimeout(() => { setDebSearch(search); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [search])

  // Fetch from server whenever filters or page change
  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ page, limit: PAGE_SIZE })
    if (debSearch)   params.set('search', debSearch)
    if (stateTab !== 'ALL') params.set('state', stateTab)
    if (userCoords)  { params.set('lat', userCoords.lat); params.set('lng', userCoords.lng) }

    fetch(`/api/parks?${params}`)
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then(({ parks, total, totalPages }) => {
        setParks(parks)
        setTotal(total)
        setTotalPages(totalPages)
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [debSearch, stateTab, page, userCoords])

  function requestLocation() {
    if (!navigator.geolocation) return setGeoError('Geolocation not supported by your browser.')
    setGeoLoading(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      pos => { setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setPage(1); setGeoLoading(false) },
      ()  => { setGeoError('Location access denied.'); setGeoLoading(false) },
      { timeout: 10000 }
    )
  }

  function go(n) { setPage(n); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function resetPage(fn) { return (...args) => { setPage(1); fn(...args) } }

  return (
    <>
      {/* Header */}
      <header style={{ background: 'linear-gradient(135deg, var(--green-dark) 0%, var(--green-mid) 60%, var(--green-light) 100%)', color: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '15px 24px 15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
            <img src="/logo.svg" alt="POTA Wiki" style={{ height: 110, display: 'block' }} />
            <div style={{ flex: 1 }}>
            </div>
            {/* Inline nav user for the header */}
            <div style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 6, marginTop: '12px' }}>
              <Link to="/about" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>About</Link>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
              {user ? (
                <>
                  <Link to="/user" style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700, textDecoration: 'none' }}>{user.callsign}</Link>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
                  <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem' }}>Log out</button>
                </>
              ) : user === null ? (
                <>
                  <Link to="/auth" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>Log in</Link>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
                  <Link to="/auth?tab=signup" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>Sign up</Link>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* Sticky controls */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '12px 24px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="search" placeholder="Search parks by name or reference…" value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 34px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.9rem', outline: 'none' }} />
          </div>
          {/* State dropdown */}
          <select value={stateTab} onChange={resetPage(e => setStateTab(e.target.value))}
            style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.85rem', fontWeight: 600, background: '#fff', outline: 'none', cursor: 'pointer' }}>
            <option value="ALL">All States</option>
            {Object.entries(STATE_NAMES).sort((a, b) => a[1].localeCompare(b[1])).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
          {/* Closest sort */}
          <button
            onClick={userCoords ? () => { setUserCoords(null); setPage(1) } : requestLocation}
            disabled={geoLoading}
            style={{ padding: '7px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '0.85rem', fontWeight: 600, cursor: geoLoading ? 'default' : 'pointer', background: userCoords ? 'var(--green-mid)' : '#fff', color: userCoords ? '#fff' : 'var(--text-muted)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
            {geoLoading ? '…' : userCoords ? '📍 Nearest first' : '📍 Sort by closest'}
          </button>
          {geoError && <span style={{ fontSize: '0.78rem', color: '#c0392b' }}>{geoError}</span>}
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {total.toLocaleString()} park{total !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
        {error && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            ⚠️ Could not load parks: {error}
          </div>
        )}
        {!error && (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 16,
                transition: 'opacity 0.2s',
                opacity: loading && parks.length > 0 ? 0.45 : 1,
                pointerEvents: loading ? 'none' : 'auto',
              }}
            >
              {/* Initial load — skeleton cards */}
              {loading && parks.length === 0 && (
                Array.from({ length: PAGE_SIZE }, (_, i) => <ParkSkeleton key={i} />)
              )}

              {/* No results */}
              {!loading && parks.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                  No parks match your search.
                </div>
              )}

              {/* Park cards (shown during refetch too, just dimmed) */}
              {parks.map(p => <ParkCard key={p.reference} park={p} />)}
            </div>
            {!loading && <Pagination page={page} total={totalPages} onChange={go} />}
          </>
        )}
      </div>

      <footer>
        Park data from <a href="https://pota.app" target="_blank" rel="noreferrer">Parks on the Air®</a>
      </footer>
    </>
  )
}

function ParkSkeleton() {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="skeleton" style={{ height: 20, width: 72, borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 20, width: 64, borderRadius: 4 }} />
      </div>
      <div className="skeleton" style={{ height: 15, width: '80%', marginBottom: 7, borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 15, width: '55%', marginBottom: 12, borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 12, width: '100%', marginBottom: 5, borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 12, width: '70%', marginBottom: 14, borderRadius: 4 }} />
      <div style={{ paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="skeleton" style={{ height: 24, width: 88, borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 12, width: 60, borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 12, width: 36, borderRadius: 4, marginLeft: 'auto' }} />
      </div>
    </div>
  )
}

function ParkCard({ park: p }) {
  const stateName = STATE_NAMES[p.location_desc] || p.location_desc

  return (
    <Link to={`/park/${encodeURIComponent(p.reference)}`}
      style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, transition: 'transform 0.12s, box-shadow 0.12s, border-color 0.12s', cursor: 'pointer' }}
      onMouseEnter={e => Object.assign(e.currentTarget.style, { transform: 'translateY(-2px)', boxShadow: 'var(--shadow)', borderColor: 'var(--green-light)' })}
      onMouseLeave={e => Object.assign(e.currentTarget.style, { transform: '', boxShadow: '', borderColor: 'var(--border)' })}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontFamily: 'SF Mono, Menlo, Consolas, monospace', fontSize: '0.8rem', fontWeight: 700, color: 'var(--green-mid)', background: 'var(--green-muted)', padding: '2px 8px', borderRadius: 4 }}>
          {p.reference}
        </span>
        <span style={{ fontSize: '0.78rem', background: '#f0f4ff', color: 'var(--blue-sky)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
          {stateName}
        </span>
      </div>

      <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6, lineHeight: 1.3 }}>{p.name} {p.park_type}</div>

      {p.park_comments && (
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>
          {p.park_comments}
        </div>
      )}

      <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 12, fontSize: '0.8rem', color: 'var(--text-muted)', alignItems: 'center', flexWrap: 'wrap' }}>
        {p.latitude && p.longitude && (
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); window.open(`https://maps.google.com/?q=${p.latitude},${p.longitude}`, '_blank') }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: '0.78rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)', borderRadius: 4, background: '#f4f4f4', color: 'var(--text-muted)', transition: 'background 0.12s, color 0.12s, border-color 0.12s' }}
            onMouseEnter={e => Object.assign(e.currentTarget.style, { background: 'var(--green-muted)', color: 'var(--green-mid)', borderColor: 'var(--green-light)' })}
            onMouseLeave={e => Object.assign(e.currentTarget.style, { background: '#f4f4f4', color: 'var(--text-muted)', borderColor: 'var(--border)' })}>
            📍Google Maps
          </button>
        )}
        <span>📋 {p.report_count ?? 0} {p.report_count === 1 ? 'report' : 'reports'}</span>
        <span style={{ marginLeft: 'auto', color: 'var(--green-mid)', fontWeight: 600 }}>View →</span>
      </div>
    </Link>
  )
}

function Pagination({ page, total, onChange }) {
  if (total <= 1) return null

  const max   = 5
  let start   = Math.max(1, page - Math.floor(max / 2))
  let end     = Math.min(total, start + max - 1)
  if (end - start < max - 1) start = Math.max(1, end - max + 1)

  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)

  const Btn = ({ n, label, disabled, active }) => (
    <button onClick={() => onChange(n)} disabled={disabled}
      style={{ padding: '6px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: active ? 'var(--green-mid)' : '#fff', color: active ? '#fff' : 'var(--text)', fontWeight: 600, fontSize: '0.85rem', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1 }}>
      {label ?? n}
    </button>
  )

  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', marginTop: 32, flexWrap: 'wrap' }}>
      <Btn n={page - 1} label="← Prev" disabled={page === 1} />
      {start > 1 && <><Btn n={1} />{start > 2 && <span style={{ color: 'var(--text-muted)' }}>…</span>}</>}
      {pages.map(n => <Btn key={n} n={n} active={n === page} />)}
      {end < total && <>{end < total - 1 && <span style={{ color: 'var(--text-muted)' }}>…</span>}<Btn n={total} /></>}
      <Btn n={page + 1} label="Next →" disabled={page === total} />
      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Page {page} of {total}</span>
    </div>
  )
}
