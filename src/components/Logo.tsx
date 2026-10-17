/** Mark: a 2×2 cube grid holding a standing and a lying box. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="5" fill="var(--accent)" />
      <rect x="4.5" y="4.5" width="10.5" height="10.5" rx="1.2" fill="var(--accent-ink)" opacity=".9" />
      <rect x="17" y="4.5" width="10.5" height="10.5" rx="1.2" fill="var(--accent-ink)" opacity=".9" />
      <rect x="4.5" y="17" width="10.5" height="10.5" rx="1.2" fill="var(--accent-ink)" opacity=".9" />
      <rect x="17" y="17" width="10.5" height="10.5" rx="1.2" fill="var(--accent-ink)" opacity=".9" />
      <rect x="6" y="6" width="2.6" height="9" rx=".4" fill="var(--accent)" />
      <rect x="9.3" y="6" width="2.6" height="9" rx=".4" fill="var(--accent)" />
      <rect x="18" y="12.3" width="8.5" height="2.7" rx=".4" fill="var(--accent)" />
      <rect x="18.5" y="9.3" width="7.5" height="2.6" rx=".4" fill="var(--accent)" />
      <rect x="18" y="24.8" width="8.5" height="2.7" rx=".4" fill="var(--accent)" />
    </svg>
  )
}
