interface Props {
  value: number | null;
  onChange: (score: number) => void;
  size?: number;
}

export function RatingStars({ value, onChange, size = 24 }: Props) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <span className="rating-stars" style={{ fontSize: size }}>
      {stars.map((n) => {
        const filled = value !== null && value >= n;
        const half = value !== null && value >= n - 0.5 && value < n;
        return (
          <span key={n} className="rating-star">
            <button
              type="button"
              className="rating-star-half rating-star-half-left"
              aria-label={`${n - 0.5} stars`}
              onClick={() => onChange(n - 0.5)}
            />
            <button
              type="button"
              className="rating-star-half rating-star-half-right"
              aria-label={`${n} stars`}
              onClick={() => onChange(n)}
            />
            <span className={`rating-star-glyph ${filled ? 'full' : half ? 'half' : 'empty'}`}>★</span>
          </span>
        );
      })}
    </span>
  );
}
