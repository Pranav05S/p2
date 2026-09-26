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

export function RateWidget({ subjectType, subjectId, initialScore = null }: Props) {
  const { user } = useAuth();
  const [score, setScore] = useState<number | null>(initialScore);
  const [saving, setSaving] = useState(false);
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

  return (
    <div className="rate-widget">
      <RatingStars value={score} onChange={handleChange} />
      {saving && <span className="hint">Saving…</span>}
      {error && <span className="error">{error}</span>}
    </div>
  );
}
