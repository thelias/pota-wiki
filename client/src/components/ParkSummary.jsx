import { QRM_NAMES } from '../constants.js'

export default function ParkSummary({ summary: s }) {
  const { total, cell_yes, cell_no, cell_total, bath_yes, bath_no, bath_total,
          qrm_min, qrm_max, qrm_avg, qrm_total,
          parking_good, parking_okay, parking_bad, parking_total, patterns } = s

  function boolVerdict(yes, no, tot) {
    if (!tot) return null
    const pct = yes / tot
    if (pct >= 0.65) return { label: '✓ Yes', sub: `${yes} of ${tot} reported service`,    cls: 'bool-yes' }
    if (pct <= 0.35) return { label: '✗ No',  sub: `${no} of ${tot} reported no service`,  cls: 'bool-no'  }
    return { label: 'Mixed', sub: `${yes} yes · ${no} no out of ${tot}`, cls: 'bool-unk' }
  }

  function boolVerdictBath(yes, no, tot) {
    if (!tot) return null
    const pct = yes / tot
    if (pct >= 0.65) return { label: '✓ Yes', sub: `${yes} of ${tot} reported facilities`,    cls: 'bool-yes' }
    if (pct <= 0.35) return { label: '✗ No',  sub: `${no} of ${tot} reported no facilities`,  cls: 'bool-no'  }
    return { label: 'Mixed', sub: `${yes} yes · ${no} no out of ${tot}`, cls: 'bool-unk' }
  }

  function qrmLabel(n) { return QRM_NAMES[Math.round(n)] || '—' }

  function parkingVerdict() {
    if (!parking_total) return null
    const counts = [['good', parking_good], ['okay', parking_okay], ['bad', parking_bad]]
    const [top, topCount] = counts.reduce((a, b) => b[1] > a[1] ? b : a)
    const labels = { good: '✓ Good', okay: '~ Okay', bad: '✗ Bad' }
    const cls    = { good: 'bool-yes', okay: 'bool-unk', bad: 'bool-no' }
    return { label: labels[top], sub: `${topCount} of ${parking_total} reported`, cls: cls[top] }
  }

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
