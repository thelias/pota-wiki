import pool from '../db/pool.js'

const GREEN_DARK  = '#1a3a2a'
const GREEN_MID   = '#2d6a4f'
const GREEN_LIGHT = '#b7e4c7'
const GREEN_MUTED = '#f0faf4'
const BORDER      = '#d8eddf'
const TEXT_MUTED  = '#6b7c72'

function field(label, value) {
  if (!value) return ''
  return `
    <div class="field">
      <span class="field-label">${label}</span>
      <span class="field-value">${value}</span>
    </div>`
}

function boolField(label, value) {
  if (!value) return ''
  const map = {
    yes:     ['✓ Yes',    'bool-yes'],
    no:      ['✗ No',     'bool-no'],
    unknown: ['Unknown',  'bool-unk'],
  }
  const [text, cls] = map[value] ?? [value, '']
  return `
    <div class="field">
      <span class="field-label">${label}</span>
      <span class="field-value ${cls}">${text}</span>
    </div>`
}

function renderReport(r, callsign, baseUrl) {
  const date = r.activation_date
    ? new Date(r.activation_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    : null

  const mode  = Array.isArray(r.mode)  && r.mode.length  ? r.mode.join(', ')  : null
  const bands = Array.isArray(r.bands) && r.bands.length ? r.bands.join(', ') : null

  const MAX_COMMENT = 240
  const comments = r.general_comments
    ? (r.general_comments.length > MAX_COMMENT
        ? r.general_comments.slice(0, MAX_COMMENT).trimEnd() + '…'
        : r.general_comments)
    : null

  const parkUrl  = `${baseUrl}/park/${encodeURIComponent(r.park_reference)}`

  return `
    <div class="header">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="60 265 195 190" height="28" style="flex-shrink:0">
        <defs><style>.st1{fill:#fff}</style></defs>
        <path class="st1" d="M160.59,286.46l-.2-3.61v-5.05h4.98v15.86h-4.87l-5.66-8.64.2,3.61v5.02h-4.98v-15.86h4.87l5.66,8.66Z"/>
        <path class="st1" d="M223.42,367.34v-15.86h12.93v3.7h-7.73v2.27h6.54v3.7h-6.54v2.49h8.04v3.7h-13.24Z"/>
        <path class="st1" d="M159.19,430.52c-.09-.55-.38-.88-.75-1.08s-.84-.29-1.34-.29c-1.15,0-1.65.33-1.65.9,0,2.38,9.12.9,9.12,6.68,0,3.68-3.06,5.46-7.43,5.46s-6.92-2.45-7.03-5.31h4.98c.11.57.42.99.86,1.26.42.26.97.4,1.48.4,1.3,0,2.16-.42,2.16-1.17,0-2.4-9.12-.75-9.12-6.81,0-3.37,2.91-5.07,6.87-5.07,4.41,0,6.41,2.25,6.79,5.02h-4.94Z"/>
        <path class="st1" d="M85.61,361.28h.04l1.78-9.81h5.02l-3.94,15.86h-5.11l-1.83-9.21h-.04l-1.81,9.21h-5.11l-3.94-15.86h5.02l1.78,9.81h.04l1.9-9.81h4.3l1.89,9.81Z"/>
        <path class="st1" d="M211.59,394.04l-.54-4.5-51.18,6.09c.67-3.77,2.98-10.33,11.06-10.79,5.65-.32,11.95.4,18.62,1.17,7.08.81,14.39,1.65,20.96,1.14l-.35-4.52c-6.13.48-13.23-.33-20.09-1.12-4.81-.55-9.73-1.11-14.39-1.24v-19.84c3.07,3.29,7.43,5.36,12.27,5.36v-4.54c-6.77,0-12.27-5.5-12.27-12.27v-1.52c3.07,3.29,7.43,5.36,12.27,5.36v-4.54c-6.77,0-12.27-5.5-12.27-12.27h-4.54c0,6.77-5.5,12.27-12.27,12.27v4.54c4.84,0,9.2-2.07,12.27-5.36v1.52c0,6.77-5.5,12.27-12.27,12.27v4.54c4.84,0,9.2-2.07,12.27-5.36v19.88c-.15,0-.31,0-.46.02-7.04.4-11.13,4.26-13.34,8.59-2.21-4.33-6.29-8.19-13.34-8.59-.15,0-.31,0-.46-.02v-23.84c3.07,3.29,7.43,5.36,12.27,5.36v-4.54c-6.77,0-12.27-5.5-12.27-12.27v-1.52c3.07,3.29,7.43,5.36,12.27,5.36v-4.54c-6.77,0-12.27-5.5-12.27-12.27v-1.52c3.07,3.29,7.43,5.36,12.27,5.36v-4.54c-6.77,0-12.27-5.5-12.27-12.27h-4.54c0,6.77-5.5,12.27-12.27,12.27v4.54c4.84,0,9.2-2.07,12.27-5.36v1.52c0,6.77-5.5,12.27-12.27,12.27v4.54c4.84,0,9.2-2.07,12.27-5.36v1.52c0,6.77-5.5,12.27-12.27,12.27v4.54c4.84,0,9.2-2.07,12.27-5.36v23.81c-4.66.13-9.59.69-14.39,1.24-6.86.79-13.96,1.6-20.09,1.12l-.35,4.52c6.57.51,13.88-.33,20.96-1.14,6.67-.77,12.98-1.48,18.62-1.17,8.08.46,10.39,7.02,11.06,10.79l-51.18-6.09-.54,4.5,44.67,5.31c.16,3.45,4.89,5,9.58,5s9.41-1.55,9.58-5l44.67-5.31Z"/>
        <path class="st1" d="M200.12,399.31l-11.6,1.38c-8.67,6.6-19.47,10.52-31.18,10.52s-22.51-3.93-31.18-10.52l-11.6-1.38-2.28,2.28,3.21,3.21,3.89-3.89c9.48,8.73,21.96,14.23,35.7,14.78v5.5h4.54v-5.5c13.74-.55,26.22-6.06,35.7-14.78l3.89,3.89,3.21-3.21-2.28-2.28Z"/>
        <path class="st1" d="M218.81,357.47h-5.39c-.52-13.78-6.03-26.31-14.78-35.82l3.77-3.77-3.21-3.21-3.77,3.77c-9.5-8.79-22.02-14.34-35.82-14.89v-5.28h-4.54v5.28c-13.8.55-26.32,6.1-35.82,14.89l-3.77-3.77-3.21,3.21,3.77,3.77c-8.75,9.51-14.26,22.03-14.78,35.82h-5.39v4.54h5.39c.24,5.77,1.37,11.31,3.23,16.5,1.62.09,3.25.11,4.88.07-2.33-5.87-3.62-12.26-3.62-18.95,0-28.45,23.14-51.59,51.59-51.59s51.59,23.14,51.59,51.59c0,6.69-1.29,13.08-3.62,18.96,1.63.04,3.25.02,4.88-.07,1.86-5.19,2.99-10.73,3.23-16.5h5.39v-4.54Z"/>
      </svg>
      <div class="callsign">${callsign}</div>
      ${date ? `<div class="date">${date}</div>` : ''}
    </div>
    <div class="body">
      <a class="park-name" href="${parkUrl}" target="_blank" rel="noreferrer">
        ${r.park_name}
        <span class="park-ref">${r.park_reference}</span>
      </a>

      <div class="fields">
        ${boolField('Cell Service', r.cell_service)}
        ${boolField('Bathrooms',    r.bathrooms)}
        ${field('QRM',      r.qrm_level)}
        ${field('Antenna',  r.antenna)}
        ${field('Mode',     mode)}
        ${field('Bands',    bands)}
        ${r.power_watts != null ? field('Power', r.power_watts + ' W') : ''}
      </div>

      ${comments ? `<div class="comments">${comments.replace(/\n/g, '<br>')}</div>` : ''}

      <div class="footer">
        <a href="${parkUrl}" target="_blank" rel="noreferrer">View full report →</a>
        <span class="powered">Powered by <a href="${baseUrl}" target="_blank" rel="noreferrer">POTA Wiki</a></span>
      </div>
    </div>`
}

function renderEmpty(callsign) {
  return `
    <div class="header">
      <div class="callsign">${callsign}</div>
    </div>
    <div class="body">
      <div class="empty">No activation reports found for ${callsign}.</div>
      </div>`
}

function html(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>POTA Wiki Embed</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      color: ${GREEN_DARK};
      background: transparent;
      line-height: 1.4;
    }

    .card {
      border: 2px solid ${GREEN_LIGHT};
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
    }

    .header {
      background: ${GREEN_MID};
      color: #fff;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .callsign {
      font-family: 'SF Mono', Menlo, Consolas, monospace;
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .date { font-size: 0.78rem; opacity: 0.8; }

    .body { padding: 12px 14px; }

    .park-name {
      display: block;
      font-weight: 700;
      font-size: 0.9rem;
      color: ${GREEN_DARK};
      text-decoration: none;
      margin-bottom: 10px;
    }
    .park-name:hover { text-decoration: underline; }
    .park-ref {
      display: inline-block;
      font-family: 'SF Mono', Menlo, Consolas, monospace;
      font-size: 0.72rem;
      font-weight: 700;
      color: ${GREEN_MID};
      background: ${GREEN_MUTED};
      border: 1px solid ${GREEN_LIGHT};
      border-radius: 3px;
      padding: 1px 5px;
      margin-left: 6px;
    }

    .fields {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 10px;
    }
    .field {
      display: flex;
      align-items: center;
      gap: 4px;
      background: ${GREEN_MUTED};
      border: 1px solid ${BORDER};
      border-radius: 4px;
      padding: 3px 7px;
      font-size: 0.75rem;
    }
    .field-label {
      color: ${TEXT_MUTED};
      font-weight: 500;
    }
    .field-value { font-weight: 600; }
    .bool-yes { color: #1a7a3a; }
    .bool-no  { color: #a33; }
    .bool-unk { color: ${TEXT_MUTED}; }

    .comments {
      font-size: 0.8rem;
      color: #333;
      background: #fafafa;
      border-left: 3px solid ${GREEN_LIGHT};
      padding: 6px 10px;
      border-radius: 0 4px 4px 0;
      margin-bottom: 10px;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 8px;
      border-top: 1px solid ${BORDER};
      font-size: 0.75rem;
    }
    .footer a { color: ${GREEN_MID}; font-weight: 600; text-decoration: none; }
    .footer a:hover { text-decoration: underline; }
    .powered { color: ${TEXT_MUTED}; }
    .powered a { color: ${TEXT_MUTED}; font-weight: 400; }

    .empty {
      color: ${TEXT_MUTED};
      padding: 16px 0;
      font-size: 0.85rem;
    }
  </style>
</head>
<body>
  ${content}
  <script>
    // Notify parent of content height for auto-resizing
    window.addEventListener('load', () => {
      const h = document.body.scrollHeight
      window.parent.postMessage({ type: 'pota-wiki-embed-height', height: h }, '*')
    })
  </script>
</body>
</html>`
}

export async function embedHandler(req, res, next) {
  try {
    const callsign = (req.params.callsign || '').toUpperCase().trim()
    if (!callsign) return res.status(400).send('Missing callsign')

    const protocol = req.headers['x-forwarded-proto'] || req.protocol
    const baseUrl  = `${protocol}://${req.headers.host}`

    const { rows } = await pool.query(
      `SELECT ar.*, p.name AS park_name
       FROM activation_reports ar
       JOIN parks p ON p.reference = ar.park_reference
       WHERE UPPER(ar.callsign) = $1
         AND ar.activation_date IS NOT NULL
       ORDER BY ar.activation_date DESC, ar.created_at DESC
       LIMIT 1`,
      [callsign]
    )

    const inner = rows.length
      ? renderReport(rows[0], callsign, baseUrl)
      : renderEmpty(callsign)
    const content = `<div class="card">${inner}</div>`

    res.setHeader('X-Frame-Options', 'ALLOWALL')
    res.setHeader('Content-Security-Policy', "frame-ancestors * http: https:")
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(html(content))
  } catch (err) {
    next(err)
  }
}
