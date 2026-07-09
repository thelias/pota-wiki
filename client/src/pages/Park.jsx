import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Nav from '../components/Nav.jsx'
import Pagination from '../components/Pagination.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const QRM_LABELS = {
  'very-low':  { label: 'Very Low',  cls: 'qrm-very-low'  },
  'low':       { label: 'Low',       cls: 'qrm-low'       },
  'normal':    { label: 'Normal',    cls: 'qrm-normal'     },
  'high':      { label: 'High',      cls: 'qrm-high'       },
  'very-high': { label: 'Very High', cls: 'qrm-very-high'  },
}

const MODES = ['CW', 'FT4', 'FT8', 'SSB', 'DATA', 'PHONE', 'Other']
const BANDS = ['160m', '80m', '60m', '40m', '30m', '20m', '17m', '15m', '12m', '10m', '6m', '2m', '1.25m', '70cm', '33cm', '23cm']

const EMPTY_FORM = {
  activation_date: '', cell_service: 'unknown', bathrooms: 'unknown',
  qrm_level: 'normal', parking: '', setup_locations: '', general_comments: '',
  cell_provider: '', antenna: '', mode: [], bands: [], power_watts: '',
  parking_availability: '', busyness: '', time_of_day: '',
}

const QRM_NUM = { 'very-low': 1, 'low': 2, 'normal': 3, 'high': 4, 'very-high': 5 }
const QRM_NAMES = { 1: 'Very Low', 2: 'Low', 3: 'Normal', 4: 'High', 5: 'Very High' }

function MultiSelect({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  const toggle = opt => onChange(value.includes(opt) ? value.filter(x => x !== opt) : [...value, opt])
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px',
        cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: 4, minHeight: 38,
        alignItems: 'center', background: 'var(--white)',
      }}>
        {value.length === 0
          ? <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', flex: 1 }}>{placeholder}</span>
          : value.map(v => (
              <span key={v} style={{
                background: 'var(--green-muted)', color: 'var(--green-mid)',
                borderRadius: 3, padding: '1px 6px', fontSize: '0.8rem', fontWeight: 600,
              }}>
                {v}
                <span onClick={e => { e.stopPropagation(); toggle(v) }}
                  style={{ marginLeft: 5, cursor: 'pointer', opacity: 0.7 }}>×</span>
              </span>
            ))
        }
        <span style={{ marginLeft: 'auto', paddingLeft: 6, color: 'var(--text-muted)', fontSize: '0.75rem' }}>▾</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, zIndex: 50,
          background: 'var(--white)', border: '1px solid var(--border)',
          borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          maxHeight: 200, overflowY: 'auto',
        }}>
          {options.map(opt => (
            <div key={opt} onClick={() => toggle(opt)} style={{
              padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              fontSize: '0.88rem', userSelect: 'none',
              background: value.includes(opt) ? 'var(--green-muted)' : 'transparent',
            }}>
              <span style={{
                width: 15, height: 15, border: `1px solid ${value.includes(opt) ? 'var(--green-mid)' : 'var(--border)'}`,
                borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: value.includes(opt) ? 'var(--green-mid)' : 'transparent',
                color: '#fff', fontSize: '0.65rem', flexShrink: 0,
              }}>
                {value.includes(opt) ? '✓' : ''}
              </span>
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Park() {
  const { ref }   = useParams()
  const { user }  = useAuth()
  const navigate  = useNavigate()

  const [park,    setPark]    = useState(null)
  const [reports, setReports] = useState([])
  const [pLoading, setPLoading] = useState(true)
  const [rLoading, setRLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const [summary,   setSummary]   = useState(null)

  const [form,      setForm]      = useState(EMPTY_FORM)
  const [photos,    setPhotos]    = useState([])
  const [previews,  setPreviews]  = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState(null)
  const fileRef = useRef(null)

  const [lightbox,  setLightbox]  = useState(null) // url
  const [deletingId, setDeletingId] = useState(null)
  const [rPage, setRPage] = useState(1)
  const REPORTS_PER_PAGE = 5

  // Edit mode
  const [editingReport,   setEditingReport]   = useState(null)  // null = create, report obj = edit
  const [existingPhotos,  setExistingPhotos]  = useState([])    // photos already on the report
  const [removedPhotoIds, setRemovedPhotoIds] = useState([])    // IDs to delete on save
  const formRef = useRef(null)

  // Load park
  useEffect(() => {
    setPLoading(true)
    fetch(`/api/parks/${encodeURIComponent(ref)}`)
      .then(r => { if (!r.ok) throw new Error('Park not found'); return r.json() })
      .then(d => { setPark(d); setPLoading(false) })
      .catch(e => { setError(e.message); setPLoading(false) })
  }, [ref])

  // Load summary
  useEffect(() => {
    fetch(`/api/parks/${encodeURIComponent(ref)}/summary`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSummary(d) })
      .catch(() => {})
  }, [ref])

  // Load reports
  const loadReports = useCallback(() => {
    setRLoading(true)
    fetch(`/api/parks/${encodeURIComponent(ref)}/reports`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setReports(d); setRLoading(false); setRPage(1) })
      .catch(() => setRLoading(false))
  }, [ref])
  useEffect(() => { loadReports() }, [loadReports])

  const MAX_TOTAL_BYTES = 56 * 1024 * 1024 // 56 MB
  const [photoError, setPhotoError] = useState(null)

  // Photo handling
  function addPhotos(files) {
    const newFiles = Array.from(files).slice(0, 4 - photos.length)
    const combined = [...photos, ...newFiles]
    const totalSize = combined.reduce((sum, f) => sum + f.size, 0)
    if (totalSize > MAX_TOTAL_BYTES) {
      setPhotoError(`Total photo size is too large (${(totalSize / 1024 / 1024).toFixed(1)} MB). Please keep combined size under 56 MB.`)
      return
    }
    setPhotoError(null)
    setPhotos(prev => [...prev, ...newFiles])
    setPreviews(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))])
  }
  function removePhoto(i) {
    URL.revokeObjectURL(previews[i])
    setPhotos(p => p.filter((_, idx) => idx !== i))
    setPreviews(p => p.filter((_, idx) => idx !== i))
    setPhotoError(null)
  }

  // Submit / update report
  async function handleSubmit(e) {
    e.preventDefault()
    if (!user) return navigate(`/auth?return=/park/${encodeURIComponent(ref)}`)
    setSubmitting(true)
    setSubmitMsg(null)

    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'mode' || k === 'bands') return
      if (v !== '') fd.append(k, v)  // skip empty optional fields
    })
    form.mode.forEach(m => fd.append('mode', m))
    form.bands.forEach(b => fd.append('bands', b))
    photos.forEach(f => fd.append('photos', f))
    if (editingReport && removedPhotoIds.length) {
      fd.append('removePhotoIds', JSON.stringify(removedPhotoIds))
    }

    const isEdit = !!editingReport
    const url = isEdit
      ? `/api/reports/${editingReport.id}`
      : `/api/parks/${encodeURIComponent(ref)}/reports`

    try {
      const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setSubmitMsg({ type: 'error', text: data.error || 'Submission failed.' }); return }

      setSubmitMsg({ type: 'success', text: isEdit ? 'Report updated!' : 'Report submitted!' })
      setForm(EMPTY_FORM)
      setPhotos([])
      previews.forEach(u => URL.revokeObjectURL(u))
      setPreviews([])
      if (isEdit) {
        setEditingReport(null)
        setExistingPhotos([])
        setRemovedPhotoIds([])
        setReports(prev => prev.map(r => r.id === data.id ? data : r))
      } else {
        loadReports()
      }
      refreshSummary()
    } catch {
      setSubmitMsg({ type: 'error', text: 'Network error. Try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  // Start editing a report
  function startEdit(report) {
    setEditingReport(report)
    setExistingPhotos(report.photos || [])
    setRemovedPhotoIds([])
    setPhotos([])
    previews.forEach(url => URL.revokeObjectURL(url))
    setPreviews([])
    setPhotoError(null)
    setSubmitMsg(null)
    setForm({
      activation_date:  report.activation_date ? report.activation_date.slice(0, 10) : '',
      cell_service:     report.cell_service  || 'unknown',
      bathrooms:        report.bathrooms     || 'unknown',
      qrm_level:        report.qrm_level     || 'normal',
      parking:          report.parking       || '',
      setup_locations:  report.setup_locations || '',
      general_comments: report.general_comments || '',
      cell_provider:    report.cell_provider || '',
      antenna:               report.antenna              || '',
      mode:                  report.mode                || [],
      bands:                 report.bands               || [],
      power_watts:           report.power_watts != null ? String(report.power_watts) : '',
      parking_availability:  report.parking_availability || '',
      busyness:              report.busyness             || '',
      time_of_day:           report.time_of_day          || '',
    })
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function refreshSummary() {
    fetch(`/api/parks/${encodeURIComponent(ref)}/summary`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSummary(d) })
      .catch(() => {})
  }

  function cancelEdit() {
    setEditingReport(null)
    setExistingPhotos([])
    setRemovedPhotoIds([])
    setPhotos([])
    previews.forEach(url => URL.revokeObjectURL(url))
    setPreviews([])
    setPhotoError(null)
    setSubmitMsg(null)
    setForm(EMPTY_FORM)
  }

  function removeExistingPhoto(id) {
    setRemovedPhotoIds(prev => [...prev, id])
    setExistingPhotos(prev => prev.filter(p => p.id !== id))
  }

  // Delete report
  async function handleDelete(id) {
    if (!confirm('Delete this report?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' })
      if (res.ok) { setReports(prev => prev.filter(r => r.id !== id)); refreshSummary() }
    } finally {
      setDeletingId(null)
    }
  }

  const field = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  if (pLoading) return (
    <>
      <Nav />
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
        <span className="spinner" /> Loading park…
      </div>
    </>
  )

  if (error || !park) return (
    <>
      <Nav />
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>🌲</div>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>{error || 'Park not found.'}</p>
        <Link to="/" style={{ color: 'var(--green-mid)' }}>← Back to park list</Link>
      </div>
    </>
  )

  return (
    <>
      <Nav crumb={park.name} />

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          <img src={lightbox} alt="Park photo" onClick={e => e.stopPropagation()} />
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px 48px' }}>

        {/* ── Park detail card ───────────────────────────── */}
        <div className="card">
          {/* Map */}
          {park.latitude && park.longitude ? (
            <div style={{ position: 'relative' }}>
              <iframe
                className="map-frame"
                title="Park location"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${park.longitude - 0.05},${park.latitude - 0.05},${parseFloat(park.longitude) + 0.05},${parseFloat(park.latitude) + 0.05}&layer=mapnik&marker=${park.latitude},${park.longitude}`}
              />
              <div style={{ position: 'absolute', inset: 0, cursor: 'default' }} />
            </div>
          ) : (
            <div className="map-placeholder">📍 No location data</div>
          )}

          <div className="card-body">
            {/* Title row */}
            <div style={{ marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                  {park.location_desc && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--blue-sky)', background: '#f0f4ff', padding: '2px 8px', borderRadius: 4, border: '1px solid #c8daef' }}>
                      {park.location_name || park.location_desc}
                    </span>
                  )}
                  <span style={{ fontFamily: 'SF Mono, Menlo, Consolas, monospace', fontSize: '0.82rem', fontWeight: 700, color: 'var(--green-mid)', background: 'var(--green-muted)', padding: '2px 8px', borderRadius: 4 }}>
                    {park.reference}
                  </span>
                  {park.active !== false && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#27ae60', background: '#eafaf1', padding: '2px 8px', borderRadius: 4, border: '1px solid #a9dfbf' }}>
                      ✓ Active
                    </span>
                  )}
                  {park.active === false && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7f8c8d', background: '#f0f0f0', padding: '2px 8px', borderRadius: 4 }}>
                      Inactive
                    </span>
                  )}
                </div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2 }}>{park.name} {park.park_type}</h1>
              </div>
              {/* Links */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {park.website && (
                  <LinkBtn href={park.website} color="var(--green-mid)" bg="var(--green-muted)">
                    🌐 State website
                  </LinkBtn>
                )}
                <LinkBtn href={`https://pota.app/#/park/${park.reference}`} color="var(--blue-sky)" bg="#f0f4ff">
                  📡 POTA page
                </LinkBtn>
                {park.latitude && park.longitude && (
                  <LinkBtn href={`https://maps.google.com/?q=${park.latitude},${park.longitude}`} color="var(--text-muted)" bg="#f4f4f4">
                    📍 Google Maps
                  </LinkBtn>
                )}
              </div>
            </div>

            {/* Stats row */}
            {(park.activations != null || park.attempts != null || park.qsos != null) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16, padding: '12px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                {[
                  ['Activations', park.activations],
                  ['Attempts',    park.attempts],
                  ['QSOs',        park.qsos != null ? park.qsos.toLocaleString() : null],
                ].map(([label, val]) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--green-mid)' }}>
                      {val != null ? val : '—'}
                    </div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginTop: 2 }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Info grid */}
            <div className="info-grid">
              {park.park_type && (
                <div className="info-item">
                  <label>Area Type</label>
                  <div className="val">{park.park_type}</div>
                </div>
              )}
              {park.grid6 && (
                <div className="info-item">
                  <label>Grid</label>
                  <div className="val mono">{park.grid6}</div>
                </div>
              )}
              {park.agencies && (
                <div className="info-item">
                  <label>Managing Agency</label>
                  <div className="val">{park.agencies}</div>
                </div>
              )}
              {park.first_activator && (
                <div className="info-item">
                  <label>First Activator</label>
                  <div className="val mono">{park.first_activator}</div>
                </div>
              )}
              {park.first_activation_date && (
                <div className="info-item">
                  <label>First Activation</label>
                  <div className="val">{new Date(park.first_activation_date.slice(0, 10).replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>
              )}
              {park.access_methods && (
                <div className="info-item">
                  <label>Access</label>
                  <div className="val">{park.access_methods}</div>
                </div>
              )}
              {park.activation_methods && (
                <div className="info-item">
                  <label>Activation Modes</label>
                  <div className="val">{park.activation_methods}</div>
                </div>
              )}
              {park.park_comments && (
                <div className="info-item info-notes">
                  <label>Notes</label>
                  <div className="val">{park.park_comments}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Aggregated Summary ────────────────────────── */}
        {summary && summary.total >= 2 && <ParkSummary summary={summary} />}

        {/* ── Activation Reports ─────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <h2>Activation Reports</h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {rLoading ? '…' : `${reports.length} report${reports.length !== 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="card-body">
            {rLoading && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                <span className="spinner" />
              </div>
            )}
            {!rLoading && reports.length === 0 && (
              <div className="empty-placeholder">No reports yet. Be the first to log an activation report!</div>
            )}
            {!rLoading && (() => {
              const totalPages = Math.ceil(reports.length / REPORTS_PER_PAGE)
              const page = Math.min(rPage, totalPages || 1)
              const pageReports = reports.slice((page - 1) * REPORTS_PER_PAGE, page * REPORTS_PER_PAGE)
              return (
                <>
                  {pageReports.map(r => (
                    <ReportItem key={r.id} report={r} user={user} onDelete={handleDelete} deletingId={deletingId} onLightbox={setLightbox} onEdit={startEdit} editingId={editingReport?.id} />
                  ))}
                  <Pagination page={page} totalPages={totalPages} onPage={setRPage} />
                </>
              )
            })()}
          </div>
        </div>

        {/* ── Submit / Edit Report ──────────────────────── */}
        <div className="card" ref={formRef}>
          <div className="card-header">
            <h2>{editingReport ? 'Edit Report' : 'Submit Activation Report'}</h2>
            {editingReport && (
              <button onClick={cancelEdit} style={{
                background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                padding: '4px 12px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-muted)',
              }}>
                Cancel
              </button>
            )}
          </div>
          <div className="card-body">
            {!user && user !== undefined && (
              <div className="api-error" style={{ background: 'var(--green-muted)', border: '1px solid var(--border)', color: 'var(--green-dark)', marginBottom: 0 }}>
                <Link to={`/auth?return=/park/${encodeURIComponent(ref)}`} style={{ color: 'var(--green-mid)', fontWeight: 700 }}>Log in or sign up</Link>
                {' '}to submit an activation report.
              </div>
            )}
            {(user || user === undefined) && (
              <form onSubmit={handleSubmit} onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}>
                {/* Callsign (readonly) + Date */}
                <div className="form-grid">
                  <div className="form-row">
                    <label>Callsign</label>
                    <input type="text" value={user ? user.callsign : '—'} readOnly
                      style={{ background: '#f4f6f2', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
                    <div className="field-hint">From your account</div>
                  </div>
                  <div className="form-row">
                    <label>Activation Date <span className="req">*</span></label>
                    <input type="date" value={form.activation_date} onChange={field('activation_date')} required />
                  </div>
                </div>
                {/* Parking / Busyness / Time of Day */}
                <div className="form-grid form-grid-3">
                  <div className="form-row">
                    <label>Parking Availability</label>
                    <ScaleToggle name="parking_availability" value={form.parking_availability}
                      onChange={v => setForm(f => ({ ...f, parking_availability: v }))}
                      options={[['good', 'Good'], ['okay', 'Okay'], ['bad', 'Bad']]}
                      colors={['#27ae60', '#e67e22', '#e74c3c']} />
                  </div>
                  <div className="form-row">
                    <label>Park Busyness</label>
                    <ScaleToggle name="busyness" value={form.busyness}
                      onChange={v => setForm(f => ({ ...f, busyness: v }))}
                      options={[['quiet', 'Quiet'], ['moderate', 'Moderate'], ['busy', 'Busy']]}
                      colors={['#27ae60', '#e67e22', '#e74c3c']} />
                  </div>
                  <div className="form-row">
                    <label>Time of Day</label>
                    <ScaleToggle name="time_of_day" value={form.time_of_day}
                      onChange={v => setForm(f => ({ ...f, time_of_day: v }))}
                      options={[['morning', 'Morning'], ['afternoon', 'Afternoon'], ['evening', 'Evening']]}
                      colors={['var(--green-mid)', 'var(--green-mid)', 'var(--green-mid)']} />
                  </div>
                </div>

                {/* Toggles */}
                <div className="form-grid form-grid-3">
                  <div className="form-row">
                    <label>Cell Service</label>
                    <BoolToggle name="cell_service" value={form.cell_service} onChange={v => setForm(f => ({ ...f, cell_service: v, cell_provider: v === 'unknown' ? '' : f.cell_provider }))} />
                    {(form.cell_service === 'yes' || form.cell_service === 'no') && (
                      <input type="text" placeholder="Provider (e.g. T-Mobile)"
                        value={form.cell_provider} onChange={field('cell_provider')}
                        style={{ marginTop: 6 }} />
                    )}
                  </div>
                  <div className="form-row">
                    <label>Bathrooms</label>
                    <BoolToggle name="bathrooms" value={form.bathrooms} onChange={v => setForm(f => ({ ...f, bathrooms: v }))} />
                  </div>
                  <div className="form-row">
                    <label>QRM Level</label>
                    <select value={form.qrm_level} onChange={field('qrm_level')}>
                      {Object.entries(QRM_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>


                {/* Mode + Bands + Power */}
                <div className="form-grid" style={{ marginBottom: 16 }}>
                  <div className="form-row" style={{ marginBottom: 0 }}>
                    <label>Mode</label>
                    <MultiSelect options={MODES} value={form.mode} placeholder="Select modes…"
                      onChange={v => setForm(f => ({ ...f, mode: v }))} />
                  </div>
                  <div className="form-row" style={{ marginBottom: 0 }}>
                    <label>Bands Used</label>
                    <MultiSelect options={BANDS} value={form.bands} placeholder="Select bands…"
                      onChange={v => setForm(f => ({ ...f, bands: v }))} />
                  </div>
                </div>
                <div className="form-row" style={{ marginBottom: 16, maxWidth: 200 }}>
                  <label>Power (watts)</label>
                  <input style={{minWidth: 60}} type="number" min="0" max="10000" placeholder="e.g. 10"
                    value={form.power_watts} onChange={field('power_watts')} />
                </div>

                {/* Text fields */}
                <div className="form-row">
                  <label>Antenna</label>
                  <input type="text" placeholder="e.g. End-fed half-wave, vertical, dipole…"
                    value={form.antenna} onChange={field('antenna')} />
                </div>
                <div className="form-row">
                  <label>Parking Notes</label>
                  <textarea value={form.parking} onChange={field('parking')} placeholder="Describe parking availability, lot size, fees, restrictions…" rows={2} />
                </div>
                <div className="form-row">
                  <label>Setup Locations</label>
                  <textarea value={form.setup_locations} onChange={field('setup_locations')} placeholder="Where did you set up? Picnic areas, trailheads, open fields…" rows={2} />
                </div>
                <div className="form-row">
                  <label>General Comments</label>
                  <textarea value={form.general_comments} onChange={field('general_comments')} placeholder="Tips, conditions, anything useful for future activators…" rows={3} />
                </div>

                {/* Existing photos (edit mode) */}
                {editingReport && existingPhotos.length > 0 && (
                  <div className="form-row">
                    <label>Current Photos</label>
                    <div className="photo-preview-row">
                      {existingPhotos.map(p => (
                        <div key={p.id} className="preview-thumb">
                          <img src={p.url} alt={p.original_name || 'Photo'} />
                          <button type="button" className="remove-btn"
                            onClick={() => removeExistingPhoto(p.id)}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Photos */}
                <div className="form-row">
                  <label>{editingReport ? 'Add More Photos' : 'Photos'} (max {editingReport ? 4 - existingPhotos.length : 4})</label>
                  <div className="photo-upload-area" onClick={() => photos.length < (editingReport ? 4 - existingPhotos.length : 4) && fileRef.current?.click()}>
                    <input ref={fileRef} type="file" accept="image/*" multiple
                      onChange={e => { addPhotos(e.target.files); e.target.value = '' }}
                      style={{ display: 'none' }} />
                    <div className="photo-upload-label">
                      📷 Click to add photos{photos.length > 0 ? ` (${photos.length}/${editingReport ? 4 - existingPhotos.length : 4})` : ''}
                    </div>
                    {previews.length > 0 && (
                      <div className="photo-preview-row" style={{ justifyContent: 'center' }}>
                        {previews.map((url, i) => (
                          <div key={i} className="preview-thumb">
                            <img src={url} alt={`Preview ${i + 1}`} />
                            <button type="button" className="remove-btn"
                              onClick={e => { e.stopPropagation(); removePhoto(i) }}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {photoError && (
                    <div className="submit-msg error" style={{ marginTop: 8 }}>{photoError}</div>
                  )}
                </div>

                <button type="submit" className="btn-green" disabled={submitting || !user || !!photoError}>
                  {submitting ? (editingReport ? 'Saving…' : 'Submitting…') : (editingReport ? 'Save Changes' : 'Submit Report')}
                </button>

                {submitMsg && (
                  <div className={`submit-msg ${submitMsg.type}`} style={{ display: 'block', marginTop: 14 }}>
                    {submitMsg.text}
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>

      <footer>
        Park data from <a href="https://pota.app" target="_blank" rel="noreferrer">Parks on the Air®</a>
      </footer>
    </>
  )
}

/* ── Sub-components ──────────────────────────────────────── */

function ReportItem({ report: r, user, onDelete, deletingId, onLightbox, onEdit, editingId }) {
  const isOwner   = user && r.user_id === user.id
  const isEditing = editingId === r.id
  const qrm       = QRM_LABELS[r.qrm_level]

  return (
    <div className="report-item" style={isEditing ? { outline: '2px solid var(--green-mid)', borderRadius: 'var(--radius)' } : {}}>
      <div className="report-header">
        <div>
          <Link to={`/profile/${encodeURIComponent(r.callsign)}`}
            onClick={e => e.stopPropagation()}
            style={{ textDecoration: 'none' }}>
            <div className="report-callsign" style={{ cursor: 'pointer' }}>{r.callsign}</div>
          </Link>
          {r.activation_date && (
            <div className="report-date">
              {new Date(r.activation_date.slice(0, 10).replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          )}
        </div>
        {isOwner && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-delete" style={{ background: 'var(--green-muted)', color: 'var(--green-mid)', borderColor: 'var(--green-light)' }}
              disabled={!!deletingId}
              onClick={() => onEdit(r)}>
              Edit
            </button>
            <button className="btn-delete" disabled={deletingId === r.id}
              onClick={() => onDelete(r.id)}>
              {deletingId === r.id ? '…' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      <div className="report-fields">
        {r.cell_service && (
          <div className="rf-item">
            <label>Cell Service</label>
            <div className={`rfval ${r.cell_service === 'yes' ? 'bool-yes' : r.cell_service === 'no' ? 'bool-no' : 'bool-unk'}`}>
              {r.cell_service === 'yes' ? '✓ Yes' : r.cell_service === 'no' ? '✗ No' : 'Unknown'}
              {r.cell_provider && (
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>· {r.cell_provider}</span>
              )}
            </div>
          </div>
        )}
        <Field label="Bathrooms"    value={r.bathrooms}    bool />
        {r.parking_availability && (
          <div className="rf-item">
            <label>Parking</label>
            <div className={`rfval ${r.parking_availability === 'good' ? 'bool-yes' : r.parking_availability === 'bad' ? 'bool-no' : 'bool-unk'}`}>
              {{ good: '✓ Good', okay: '~ Okay', bad: '✗ Bad' }[r.parking_availability]}
            </div>
          </div>
        )}
        {r.busyness && (
          <div className="rf-item">
            <label>Busyness</label>
            <div className={`rfval ${r.busyness === 'quiet' ? 'bool-yes' : r.busyness === 'busy' ? 'bool-no' : 'bool-unk'}`}>
              {{ quiet: 'Quiet', moderate: 'Moderate', busy: 'Busy' }[r.busyness]}
            </div>
          </div>
        )}
        {r.time_of_day && (
          <div className="rf-item">
            <label>Time of Day</label>
            <div className="rfval">{{ morning: '🌅 Morning', afternoon: '☀️ Afternoon', evening: '🌇 Evening' }[r.time_of_day]}</div>
          </div>
        )}
        {r.qrm_level && (
          <div className="rf-item">
            <label>QRM Level</label>
            <div className="rfval">
              <span className={`qrm-badge ${qrm?.cls || ''}`}>{qrm?.label || r.qrm_level}</span>
            </div>
          </div>
        )}
        {r.mode?.length > 0 && (
          <div className="rf-item">
            <label>Mode</label>
            <div className="rfval" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {r.mode.map(m => (
                <span key={m} style={{ fontFamily: 'SF Mono, Menlo, Consolas, monospace', fontSize: '0.78rem', fontWeight: 700, padding: '1px 6px', borderRadius: 3, background: 'var(--green-muted)', color: 'var(--green-mid)', border: '1px solid var(--green-light)' }}>{m}</span>
              ))}
            </div>
          </div>
        )}
        {r.bands?.length > 0 && (
          <div className="rf-item">
            <label>Bands</label>
            <div className="rfval" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {r.bands.map(b => (
                <span key={b} style={{ fontFamily: 'SF Mono, Menlo, Consolas, monospace', fontSize: '0.78rem', fontWeight: 700, padding: '1px 6px', borderRadius: 3, background: 'var(--green-muted)', color: 'var(--green-mid)', border: '1px solid var(--green-light)' }}>{b}</span>
              ))}
            </div>
          </div>
        )}
        {r.power_watts != null && (
          <div className="rf-item">
            <label>Power</label>
            <div className="rfval">{r.power_watts} W</div>
          </div>
        )}
        {r.antenna && (
          <div className="rf-item">
            <label>Antenna</label>
            <div className="rfval">{r.antenna}</div>
          </div>
        )}
      </div>

      {r.parking && (
        <div className="report-text-section">
          <div className="report-text-label">Parking</div>
          {r.parking}
        </div>
      )}
      {r.setup_locations && (
        <div className="report-text-section">
          <div className="report-text-label">Setup Locations</div>
          {r.setup_locations}
        </div>
      )}
      {r.general_comments && (
        <div className="report-text-section">
          <div className="report-text-label">Comments</div>
          {r.general_comments}
        </div>
      )}

      {r.photos?.length > 0 && (
        <div className="report-photos">
          {r.photos.map(p => (
            <img key={p.id} src={p.url} alt={p.original_name || 'Photo'}
              className="report-photo" loading="lazy" onClick={() => onLightbox(p.url)} />
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, value, bool }) {
  if (!value) return null
  let display = value
  let cls     = ''
  if (bool) {
    if (value === 'yes')     { display = '✓ Yes';    cls = 'bool-yes' }
    if (value === 'no')      { display = '✗ No';     cls = 'bool-no'  }
    if (value === 'unknown') { display = 'Unknown'; cls = 'bool-unk' }
  }
  return (
    <div className="rf-item">
      <label>{label}</label>
      <div className={`rfval ${cls}`}>{display}</div>
    </div>
  )
}

function LinkBtn({ href, color, bg, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '6px 12px', borderRadius: 'var(--radius)',
      background: bg, color: color,
      fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none',
      border: `1px solid ${color}33`, transition: 'opacity 0.12s, transform 0.1s',
    }}
    onMouseEnter={e => Object.assign(e.currentTarget.style, { opacity: '0.8', transform: 'translateY(-1px)' })}
    onMouseLeave={e => Object.assign(e.currentTarget.style, { opacity: '1', transform: '' })}>
      {children}
    </a>
  )
}

function ScaleToggle({ name, value, onChange, options, colors }) {
  return (
    <div className="bool-group">
      {options.map(([v, label], i) => (
        <div key={v} className="bool-opt">
          <input type="radio" name={name} id={`${name}-${v}`} value={v}
            checked={value === v} onChange={() => onChange(value === v ? '' : v)} />
          <label htmlFor={`${name}-${v}`} style={{
            background: value === v ? colors[i] : undefined,
            color:      value === v ? '#fff'     : undefined,
          }}>
            {label}
          </label>
        </div>
      ))}
    </div>
  )
}

function ParkSummary({ summary: s }) {
  const { total, cell_yes, cell_no, cell_total, bath_yes, bath_no, bath_total,
          qrm_min, qrm_max, qrm_avg, qrm_total,
          parking_good, parking_okay, parking_bad, parking_total, patterns } = s

  // Cell service verdict
  function boolVerdict(yes, no, tot) {
    if (!tot) return null
    const pct = yes / tot
    if (pct >= 0.65) return { label: '✓ Yes', sub: `${yes} of ${tot} reported service`, cls: 'bool-yes' }
    if (pct <= 0.35) return { label: '✗ No',  sub: `${no} of ${tot} reported no service`, cls: 'bool-no' }
    return { label: 'Mixed', sub: `${yes} yes · ${no} no out of ${tot}`, cls: 'bool-unk' }
  }
    function boolVerdictBath(yes, no, tot) {
    if (!tot) return null
    const pct = yes / tot
    if (pct >= 0.65) return { label: '✓ Yes', sub: `${yes} of ${tot} reported facilities`, cls: 'bool-yes' }
    if (pct <= 0.35) return { label: '✗ No',  sub: `${no} of ${tot} reported no facilities`, cls: 'bool-no' }
    return { label: 'Mixed', sub: `${yes} yes · ${no} no out of ${tot}`, cls: 'bool-unk' }
  }

  // QRM label from numeric
  function qrmLabel(n) { return QRM_NAMES[Math.round(n)] || '—' }

  // Parking verdict — top answer
  function parkingVerdict() {
    if (!parking_total) return null
    const counts = [['good', parking_good], ['okay', parking_okay], ['bad', parking_bad]]
    const [top, topCount] = counts.reduce((a, b) => b[1] > a[1] ? b : a)
    const labels = { good: '✓ Good', okay: '~ Okay', bad: '✗ Bad' }
    const cls    = { good: 'bool-yes', okay: 'bool-unk', bad: 'bool-no' }
    return { label: labels[top], sub: `${topCount} of ${parking_total} reported`, cls: cls[top] }
  }

  // Busyness pattern blurb
  function busynessBlurb() {
    if (!patterns?.length) return null
    const score = p => parseFloat(p.avg_busyness)
    const busy  = patterns.filter(p => score(p) >= 2.4)
    const quiet = patterns.filter(p => score(p) <= 1.6)
    const fmt   = p => `${p.day_type} ${p.time_of_day}s`

    if (!busy.length && !quiet.length) return null
    const parts = []
    if (busy.length)  parts.push(`tends to be busier during ${busy.map(fmt).join(' and ')}`)
    if (quiet.length) parts.push(`quieter during ${quiet.map(fmt).join(' and ')}`)
    return parts.join(', ') + '.'
  }

  const cellV    = boolVerdict(cell_yes, cell_no, cell_total)
  const bathV    = boolVerdictBath(bath_yes, bath_no, bath_total)
  const parkingV = parkingVerdict()
  const blurb    = busynessBlurb()

  const statCards = [
    cellV    && { heading: 'Cell Service', value: cellV.label,    sub: cellV.sub,    cls: cellV.cls },
    bathV    && { heading: 'Bathrooms',    value: bathV.label,    sub: bathV.sub,    cls: bathV.cls },
    qrm_total > 0 && {
      heading: 'QRM Level',
      value: qrm_min === qrm_max ? qrmLabel(qrm_min) : `${qrmLabel(qrm_min)} – ${qrmLabel(qrm_max)}`,
      sub: `avg ${qrmLabel(qrm_avg)} · ${qrm_total} report${qrm_total !== 1 ? 's' : ''}`,
      cls: '',
    },
    parkingV && { heading: 'Parking', value: parkingV.label, sub: parkingV.sub, cls: parkingV.cls },
  ].filter(Boolean)

  if (!statCards.length && !blurb) return null

  return (
    <div className="card">
      <div className="card-header" style={{ alignItems: 'baseline' }}>
        <h2>Activator Insights</h2>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Based on {total} report{total !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="card-body">
        {statCards.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: blurb ? 16 : 0 }}>
            {statCards.map(({ heading, value, sub, cls }) => (
              <div key={heading} style={{ background: 'var(--green-muted)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 }}>
                  {heading}
                </div>
                <div className={`rfval ${cls}`} style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>
                  {value}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub}</div>
              </div>
            ))}
          </div>
        )}
        {blurb && (
          <div style={{ fontSize: '0.88rem', color: 'var(--text)', background: 'var(--green-muted)', borderRadius: 8, padding: '10px 14px' }}>
            🕐 <strong>Busyness:</strong> This park {blurb}
          </div>
        )}
      </div>
    </div>
  )
}

function BoolToggle({ name, value, onChange }) {
  return (
    <div className="bool-group">
      {[['yes', 'Yes'], ['no', 'No'], ['unknown', '?']].map(([v, label]) => (
        <div key={v} className={`bool-opt ${v === 'yes' ? 'yes' : v === 'no' ? 'no' : 'unk'}`}>
          <input type="radio" name={name} id={`${name}-${v}`} value={v}
            checked={value === v} onChange={() => onChange(v)} />
          <label htmlFor={`${name}-${v}`}>{label}</label>
        </div>
      ))}
    </div>
  )
}
