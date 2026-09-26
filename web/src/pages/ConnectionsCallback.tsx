import { Link, useSearchParams } from 'react-router-dom';

export function ConnectionsCallback() {
  const [params] = useSearchParams();
  const connected = params.get('connected');
  const error = params.get('error');

  return (
    <div className="auth-page">
      {connected && <p>Connected {connected} successfully.</p>}
      {error && <p className="error">Connection failed: {error}</p>}
      <Link to="/profile">Back to profile</Link>
    </div>
  );
}
