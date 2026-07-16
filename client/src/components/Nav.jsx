import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Nav({ crumb }) {
  const { user, logout } = useAuth()
  const location = useLocation()

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
        <div className="nav-user">
          <Link to="/about">About</Link>
          <span className="sep">·</span>
          {user ? (
            <>
              {user.role === 'moderator' && (
                <><Link to="/admin">Mod Panel</Link><span className="sep">·</span></>
              )}
              <Link to="/user" className="callsign">{user.callsign}</Link>
              <span className="sep">·</span>
              <button onClick={logout}>Log out</button>
            </>
          ) : (
            <>
              <Link to={`/auth?return=${encodeURIComponent(location.pathname + location.search)}`}>
                Log in
              </Link>
              <span className="sep">·</span>
              <Link to={`/auth?tab=signup&return=${encodeURIComponent(location.pathname + location.search)}`}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
