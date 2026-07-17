import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { QRM_LABELS } from '../constants.js'

function NL({ text }) {
  return text.split('\n').map((line, i, arr) => (
    <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
  ))
}

function Field({ label, value, bool }) {
  if (!value) return null
  let display = value
  let cls     = ''
  if (bool) {
    if (value === 'yes')     { display = '✓ Yes';   cls = 'bool-yes' }
    if (value === 'no')      { display = '✗ No';    cls = 'bool-no'  }
    if (value === 'unknown') { display = 'Unknown'; cls = 'bool-unk' }
  }
  return (
    <div className="rf-item">
      <label>{label}</label>
      <div className={`rfval ${cls}`}>{display}</div>
    </div>
  )
}

export default function ReportItem({ report: r, user, onDelete, deletingId, onLightbox, onEdit, editingId, onVote }) {
  const isOwner   = user && r.user_id === user.id
  const isEditing = editingId === r.id
  const qrm       = QRM_LABELS[r.qrm_level]
  const navigate  = useNavigate()

  const [localVoted, setLocalVoted] = useState(!!r.user_voted)
  const [localCount, setLocalCount] = useState(r.helpful_count ?? 0)
  const [voting,     setVoting]     = useState(false)

  async function handleVote() {
    if (!user) return navigate(`/auth?return=${encodeURIComponent(window.location.pathname)}`)
    if (isOwner || voting) return
    const prevVoted = localVoted
    const prevCount = localCount
    setLocalVoted(!localVoted)
    setLocalCount(c => localVoted ? c - 1 : c + 1)
    setVoting(true)
    try {
      const res  = await fetch(`/api/reports/${r.id}/vote`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setLocalVoted(data.voted)
        setLocalCount(data.helpful_count)
        onVote?.(r.id, data)
      } else {
        setLocalVoted(prevVoted)
        setLocalCount(prevCount)
      }
    } catch {
      setLocalVoted(prevVoted)
      setLocalCount(prevCount)
    } finally {
      setVoting(false)
    }
  }

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
        <Field label="Bathrooms" value={r.bathrooms} bool />
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
          <NL text={r.parking} />
        </div>
      )}
      {r.setup_locations && (
        <div className="report-text-section">
          <div className="report-text-label">Setup Locations</div>
          <NL text={r.setup_locations} />
        </div>
      )}
      {r.general_comments && (
        <div className="report-text-section">
          <div className="report-text-label">Comments</div>
          <NL text={r.general_comments} />
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

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleVote}
          disabled={voting || isOwner}
          title={isOwner ? 'You cannot vote on your own report' : localVoted ? 'Remove helpful vote' : 'Mark as helpful'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 12px', borderRadius: 20,
            border: `1px solid ${localVoted ? 'var(--green-mid)' : 'var(--border)'}`,
            background: localVoted ? 'var(--green-muted)' : '#fff',
            color: localVoted ? 'var(--green-dark)' : 'var(--text-muted)',
            fontWeight: 600, fontSize: '0.82rem',
            cursor: isOwner ? 'default' : 'pointer',
            opacity: isOwner ? 0.45 : 1,
            transition: 'all 0.15s',
          }}>
          👍 {localCount > 0 ? localCount : ''} Helpful
        </button>
      </div>
    </div>
  )
}
