import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Nav({ crumb }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on navigation
  useEffect(() => { setOpen(false) }, [location.pathname])

  return (
    <nav className="topnav">
      <div className="topnav-inner">
        <Link to="/"><img src="/logo-icon.svg" alt="POTA Wiki" style={{ height: 36, display: 'block' }} /></Link>
        {crumb && (
          <>
            <span className="sep">›</span>
            <span className="current">{crumb}</span>
          </>
        )}
        <span className="nav-spacer" />

        {user ? (
          <><Link to="/user" className="nav-callsign">{user.callsign}</Link><span className="sep">·</span></>
        ) : user === null ? (
          <><Link to={`/auth?return=${encodeURIComponent(location.pathname + location.search)}`} className="nav-callsign">Sign in</Link><span className="sep">·</span></>
        ) : null}

        <div className="nav-hamburger" ref={menuRef}>
          <button
            className="hamburger-btn"
            onClick={() => setOpen(o => !o)}
            aria-label="Menu"
            aria-expanded={open}
          >
            <span className="hamburger-icon">
              <span /><span /><span />
            </span>
          </button>

          {open && (
            <div className="hamburger-menu">
              <Link to="/about" onClick={() => setOpen(false)}>About</Link>
              <Link to="/help" onClick={() => setOpen(false)}>Documentation</Link>
              {user && (
                <>
                  <div className="hamburger-divider" />
                  {user.role === 'moderator' && (
                    <Link to="/admin" onClick={() => setOpen(false)}>Mod Panel</Link>
                  )}
                  <button onClick={() => { logout(); setOpen(false) }}>Log out</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
