import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

interface Props {
  to: string;
  image?: string | null;
  title: string;
  subtitle?: string;
  badge?: string;
  children?: ReactNode;
}

function initials(title: string) {
  return title
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

// A deterministic hue from the title so placeholder art (no cover_url from
// the source provider) still reads as a distinct, colorful card instead of
// a blank tile.
function hueFor(title: string) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

export function MediaCard({ to, image, title, subtitle, badge, children }: Props) {
  const hue = hueFor(title);
  return (
    <div className="media-card">
      <Link to={to} className="media-card-art-link">
        {image ? (
          <img src={image} alt={title} className="media-card-art" loading="lazy" />
        ) : (
          <div
            className="media-card-art media-card-placeholder"
            style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${hue + 40} 70% 35%))` }}
          >
            {initials(title)}
          </div>
        )}
        {badge && <span className="media-card-badge">{badge}</span>}
      </Link>
      <Link to={to} className="media-card-title">
        {title}
      </Link>
      {subtitle && <p className="media-card-subtitle muted">{subtitle}</p>}
      {children}
    </div>
  );
}
