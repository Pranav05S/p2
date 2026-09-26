import { Navigate, Route, Routes, Link, NavLink } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Search } from './pages/Search';
import { Profile } from './pages/Profile';
import { AlbumDetail } from './pages/AlbumDetail';
import { ArtistDetail } from './pages/ArtistDetail';
import { TrackDetail } from './pages/TrackDetail';
import { ConnectionsCallback } from './pages/ConnectionsCallback';
import { Logo } from './components/Logo';
import './App.css';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Nav() {
  const { user, logout } = useAuth();
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link to="/" className="brand">
          <Logo />
          Rated
        </Link>
        <div className="nav-links">
          <NavLink to="/search" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Search
          </NavLink>
          {user && (
            <NavLink to="/profile" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Profile
            </NavLink>
          )}
        </div>
        <div className="nav-auth">
          {user ? (
            <>
              <Link to="/profile" className="user-pill">
                <span className="user-pill-avatar">{user.display_name[0]?.toUpperCase()}</span>
                {user.username}
              </Link>
              <button className="btn-ghost" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login">
                <button className="btn-ghost">Log in</button>
              </Link>
              <Link to="/register">
                <button className="btn-primary">Sign up</button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <>
      <Nav />
      <div className="app">
        <main>
          <Routes>
            <Route path="/" element={<Search />} />
            <Route path="/search" element={<Search />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <Profile />
                </RequireAuth>
              }
            />
            <Route path="/users/:username" element={<Profile />} />
            <Route path="/albums/:id" element={<AlbumDetail />} />
            <Route path="/artists/:id" element={<ArtistDetail />} />
            <Route path="/tracks/:id" element={<TrackDetail />} />
            <Route path="/settings/connections" element={<ConnectionsCallback />} />
          </Routes>
        </main>
      </div>
    </>
  );
}

export default App;
