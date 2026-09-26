import { Navigate, Route, Routes, Link } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Search } from './pages/Search';
import { Profile } from './pages/Profile';
import { AlbumDetail } from './pages/AlbumDetail';
import { ArtistDetail } from './pages/ArtistDetail';
import { TrackDetail } from './pages/TrackDetail';
import { ConnectionsCallback } from './pages/ConnectionsCallback';
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
      <Link to="/" className="brand">
        Rated
      </Link>
      <Link to="/search">Search</Link>
      {user ? (
        <>
          <Link to="/profile">Profile</Link>
          <button onClick={logout}>Log out</button>
        </>
      ) : (
        <>
          <Link to="/login">Log in</Link>
          <Link to="/register">Register</Link>
        </>
      )}
    </nav>
  );
}

function App() {
  return (
    <div className="app">
      <Nav />
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
  );
}

export default App;
