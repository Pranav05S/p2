import { useState } from 'react';
import { RatingStars } from './RatingStars';
import { apiFetch, ApiError } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import type { SubjectType } from '../lib/types';

interface Props {
  subjectType: SubjectType;
  subjectId: string;
  initialScore?: number | null;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function RateWidget({ subjectType, subjectId, initialScore = null }: Props) {
  const { user } = useAuth();
  const [score, setScore] = useState<number | null>(initialScore);
  const [saving, setSaving] = useState(false);
  const [logging, setLogging] = useState(false);
  const [justLogged, setJustLogged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(newScore: number) {
    if (!user) {
      setError('Log in to rate');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/ratings', {
        method: 'POST',
        body: { subject_type: subjectType, subject_id: subjectId, score: newScore },
      });
      setScore(newScore);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save rating');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogListen() {
    if (!user) {
      setError('Log in to log a listen');
      return;
    }
    setLogging(true);
    setError(null);
    try {
      await apiFetch('/diary', {
        method: 'POST',
        body: {
          subject_type: subjectType,
          subject_id: subjectId,
          listened_on: todayIso(),
          score: score ?? undefined,
        },
      });
      setJustLogged(true);
      setTimeout(() => setJustLogged(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not log listen');
    } finally {
      setLogging(false);
    }
  }

  return (
    <div className="rate-widget">
      <RatingStars value={score} onChange={handleChange} />
      <button type="button" className="log-listen-btn" onClick={handleLogListen} disabled={logging}>
        {justLogged ? 'Logged ✓' : logging ? 'Logging…' : '+ Log listen'}
      </button>
      {saving && <span className="hint">Saving…</span>}
      {error && <span className="error">{error}</span>}
    </div>
  );
}
