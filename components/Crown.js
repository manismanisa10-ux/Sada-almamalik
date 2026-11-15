export default function Crown({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round">
      <path d="M8 46 L4 18 L20 30 L32 10 L44 30 L60 18 L56 46 Z" fill="currentColor" fillOpacity=".15" />
      <path d="M8 52 H56" />
      <circle cx="32" cy="10" r="2.5" fill="currentColor" />
      <circle cx="4" cy="18" r="2.5" fill="currentColor" />
      <circle cx="60" cy="18" r="2.5" fill="currentColor" />
    </svg>
  );
    }
