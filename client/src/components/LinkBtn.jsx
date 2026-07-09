export default function LinkBtn({ href, color, bg, children }) {
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
