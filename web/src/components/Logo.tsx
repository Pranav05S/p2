export function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect width="28" height="28" rx="8" fill="url(#logo-gradient)" />
      <path
        d="M14 6L16 11.3L21.6 11.5L17.2 15.1L18.7 20.5L14 17.4L9.3 20.5L10.8 15.1L6.4 11.5L12 11.3Z"
        fill="white"
      />
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--accent-1)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
