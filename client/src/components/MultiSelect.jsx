import { useState, useRef, useEffect } from 'react'

export default function MultiSelect({ options, value, onChange, placeholder }) {
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
