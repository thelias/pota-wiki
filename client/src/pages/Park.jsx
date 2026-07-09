import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Nav from '../components/Nav.jsx'
import Footer from '../components/Footer.jsx'
import Pagination from '../components/Pagination.jsx'
import MultiSelect from '../components/MultiSelect.jsx'
import ScaleToggle from '../components/ScaleToggle.jsx'
import BoolToggle from '../components/BoolToggle.jsx'
import LinkBtn from '../components/LinkBtn.jsx'
import ReportItem from '../components/ReportItem.jsx'
import ParkSummary from '../components/ParkSummary.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { QRM_LABELS, MODES, BANDS, EMPTY_FORM } from '../constants.js'

const REPORTS_PER_PAGE = 10

export default function Park() {
  const { ref }   = useParams()
  const { user }  = useAuth()
  const navigate  = useNavigate()

  const [park,    setPark]    = useState(null)
  const [pLoading, setPLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const [summary,   setSummary]   = useState(null)

  const [reports,    setReports]    = useState([])
  const [rTotal,     setRTotal]     = useState(0)
  const [rTotalPages, setRTotalPages] = useState(1)
  const [rPage,      setRPage]      = useState(1)
  const [rLoading,   setRLoading]   = useState(true)

  const [form,      setForm]      = useState(EMPTY_FORM)
  const [photos,    setPhotos]    = useState([])
  const [previews,  setPreviews]  = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState(null)
  const fileRef = useRef(null)

  const [lightbox,   setLightbox]   = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // Edit mode
  const [editingReport,   setEditingReport]   = useState(null)
  const [existingPhotos,  setExistingPhotos]  = useState([])
  const [removedPhotoIds, setRemovedPhotoIds] = useState([])
  const formRef = useRef(null)

  const MAX_TOTAL_BYTES = 56 * 1024 * 1024
  const [photoError, setPhotoError] = useState(null)

  // ── Data fetching ──────────────────────────────────────────────────────────

  // Load park detail
  useEffect(() => {
    setPLoading(true)
    fetch(`/api/parks/${encodeURIComponent(ref)}`)
      .then(r => { if (!r.ok) throw new Error('Park not found'); return r.json() })
      .then(d => { setPark(d); setPLoading(false) })
      .catch(e => { setError(e.message); setPLoading(false) })
  }, [ref])

  // Load summary
  function refreshSummary() {
    fetch(`/api/parks/${encodeURIComponent(ref)}/summary`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSummary(d) })
      .catch(() => {})
  }
  useEffect(() => { refreshSummary() }, [ref]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch a specific page of reports
  function fetchReports(page) {
    setRLoading(true)
    fetch(`/api/parks/${encodeURIComponent(ref)}/reports?page=${page}&limit=${REPORTS_PER_PAGE}`)
      .then(r => r.ok ? r.json() : { reports: [], total: 0, totalPages: 1 })
      .then(({ reports, total, totalPages }) => {
        setReports(reports)
        setRTotal(total)
        setRTotalPages(totalPages)
        setRLoading(false)
      })
      .catch(() => setRLoading(false))
  }

  // Reset to page 1 when park changes
  useEffect(() => {
    setRPage(1)
    fetchReports(1)
  }, [ref]) // eslint-disable-line react-hooks/exhaustive-deps

  function handlePageChange(newPage) {
    setRPage(newPage)
    fetchReports(newPage)
    // Scroll to the reports card
    document.querySelector('.reports-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ── Photo handling ─────────────────────────────────────────────────────────

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

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => { previews.forEach(u => URL.revokeObjectURL(u)) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Submit / edit report ───────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user) return navigate(`/auth?return=/park/${encodeURIComponent(ref)}`)
    setSubmitting(true)
    setSubmitMsg(null)

    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'mode' || k === 'bands') return
      if (v !== '') fd.append(k, v)
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
      const res  = await fetch(url, { method: isEdit ? 'PUT' : 'POST', body: fd })
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
        // Patch the report in the current page without a full reload
        setReports(prev => prev.map(r => r.id === data.id ? data : r))
      } else {
        // New report — go back to page 1 to see it (newest first)
        setRPage(1)
        fetchReports(1)
      }
      refreshSummary()
    } catch {
      setSubmitMsg({ type: 'error', text: 'Network error. Try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────

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
      activation_date:      report.activation_date ? report.activation_date.slice(0, 10) : '',
      cell_service:         report.cell_service         || 'unknown',
      bathrooms:            report.bathrooms            || 'unknown',
      qrm_level:            report.qrm_level            || 'normal',
      parking:              report.parking              || '',
      setup_locations:      report.setup_locations      || '',
      general_comments:     report.general_comments     || '',
      cell_provider:        report.cell_provider        || '',
      antenna:              report.antenna              || '',
      mode:                 report.mode                 || [],
      bands:                report.bands                || [],
      power_watts:          report.power_watts != null ? String(report.power_watts) : '',
      parking_availability: report.parking_availability || '',
      busyness:             report.busyness             || '',
      time_of_day:          report.time_of_day          || '',
    })
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
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

  // ── Delete report ──────────────────────────────────────────────────────────

  async function handleDelete(id) {
    if (!confirm('Delete this report?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' })
      if (res.ok) {
        refreshSummary()
        // If this was the last item on the page and not page 1, go back one
        const newPage = reports.length === 1 && rPage > 1 ? rPage - 1 : rPage
        setRPage(newPage)
        fetchReports(newPage)
      }
    } finally {
      setDeletingId(null)
    }
  }

  const field = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  // ── Loading / error states ─────────────────────────────────────────────────

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

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px 40px' }}>

        {/* ── Park detail card ──────────────────────────────── */}
        <div className="card">
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

        {/* ── Activator Insights ────────────────────────────── */}
        {summary && summary.total >= 2 && <ParkSummary summary={summary} />}

        {/* ── Activation Reports ─────────────────────────────── */}
        <div className="card reports-card">
          <div className="card-header">
            <h2>Activation Reports</h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {rLoading ? '…' : `${rTotal} report${rTotal !== 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="card-body">
            {rLoading && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                <span className="spinner" />
              </div>
            )}
            {!rLoading && rTotal === 0 && (
              <div className="empty-placeholder">No reports yet. Be the first to log an activation report!</div>
            )}
            {!rLoading && reports.map(r => (
              <ReportItem key={r.id} report={r} user={user}
                onDelete={handleDelete} deletingId={deletingId}
                onLightbox={setLightbox} onEdit={startEdit}
                editingId={editingReport?.id} />
            ))}
            {!rLoading && rTotalPages > 1 && (
              <Pagination page={rPage} totalPages={rTotalPages} onPage={handlePageChange} />
            )}
          </div>
        </div>

        {/* ── Submit / Edit Report ──────────────────────────── */}
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
              <form onSubmit={handleSubmit} onKeyDown={e => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') e.preventDefault() }}>
                {/* Callsign + Date */}
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

                {/* Cell / Bathrooms / QRM */}
                <div className="form-grid form-grid-3">
                  <div className="form-row">
                    <label>Cell Service</label>
                    <BoolToggle name="cell_service" value={form.cell_service}
                      onChange={v => setForm(f => ({ ...f, cell_service: v, cell_provider: v === 'unknown' ? '' : f.cell_provider }))} />
                    {(form.cell_service === 'yes' || form.cell_service === 'no') && (
                      <input type="text" placeholder="Provider (e.g. T-Mobile)"
                        value={form.cell_provider} onChange={field('cell_provider')}
                        style={{ marginTop: 6 }} />
                    )}
                  </div>
                  <div className="form-row">
                    <label>Bathrooms</label>
                    <BoolToggle name="bathrooms" value={form.bathrooms}
                      onChange={v => setForm(f => ({ ...f, bathrooms: v }))} />
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
                  <input style={{ minWidth: 60 }} type="number" min="0" max="10000" placeholder="e.g. 10"
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

                {/* New photos */}
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

      <Footer />
    </>
  )
}
