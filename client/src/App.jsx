import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import Home from './pages/Home.jsx'
import Park from './pages/Park.jsx'
import Auth from './pages/Auth.jsx'
import User from './pages/User.jsx'
import About from './pages/About.jsx'
import Profile from './pages/Profile.jsx'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"                    element={<Home />} />
          <Route path="/park/:ref"           element={<Park />} />
          <Route path="/auth"                element={<Auth />} />
          <Route path="/user"                element={<User />} />
          <Route path="/profile/:callsign"   element={<Profile />} />
          <Route path="/about"               element={<About />} />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
