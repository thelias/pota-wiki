/**
 * Windowed pagination — shows first, last, current ± 2, with ellipsis gaps.
 * Props: page, totalPages, onPage (n => void)
 */
export default function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null

  // Build the set of page numbers to show
  const pages = new Set([1, totalPages])
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) pages.add(i)
  const sorted = [...pages].sort((a, b) => a - b)

  // Insert null as ellipsis marker where there are gaps
  const items = []
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) items.push(null)
    items.push(n)
  })

  const btnBase = {
    padding: '5px 10px', borderRadius: 'var(--radius)',
    border: '1px solid var(--border)', fontWeight: 600,
    fontSize: '0.82rem', cursor: 'pointer', background: '#fff',
    color: 'var(--text)',
  }

  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
      <button onClick={() => onPage(page - 1)} disabled={page === 1}
        style={{ ...btnBase, padding: '5px 12px', cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>
        ← Prev
      </button>

      {items.map((n, i) =>
        n === null
          ? <span key={`ellipsis-${i}`} style={{ padding: '5px 2px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>…</span>
          : <button key={n} onClick={() => onPage(n)}
              style={{ ...btnBase, background: n === page ? 'var(--green-mid)' : '#fff', color: n === page ? '#fff' : 'var(--text)' }}>
              {n}
            </button>
      )}

      <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
        style={{ ...btnBase, padding: '5px 12px', cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>
        Next →
      </button>

      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{page} of {totalPages}</span>
    </div>
  )
}
