/** Inline icon set — 20×20 on a 24 grid, 1.5px stroke, currentColor. */

type P = { size?: number; className?: string };

function Svg({ size = 18, className, children }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const Icon = {
  dashboard: (p: P) => (
    <Svg {...p}>
      <rect x="3" y="3" width="7.5" height="8.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="5" rx="1.5" />
      <rect x="13.5" y="11" width="7.5" height="10" rx="1.5" />
      <rect x="3" y="14.5" width="7.5" height="6.5" rx="1.5" />
    </Svg>
  ),
  tasks: (p: P) => (
    <Svg {...p}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="m3 5.5 1.5 1.5L7 4.5M3 11.5 4.5 13 7 10.5M3 17.5 4.5 19 7 16.5" />
    </Svg>
  ),
  projects: (p: P) => (
    <Svg {...p}>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.2a2 2 0 0 1 1.6.8l.9 1.2H18a3 3 0 0 1 3 3v6.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5Z" />
    </Svg>
  ),
  clock: (p: P) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </Svg>
  ),
  upload: (p: P) => (
    <Svg {...p}>
      <path d="M12 16V4.5M8 8l4-4 4 4" />
      <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
    </Svg>
  ),
  megaphone: (p: P) => (
    <Svg {...p}>
      <path d="M4 10v4a2 2 0 0 0 2 2h1l1.5 4.5h2.2L9.5 16 19 20V4L9.5 8H6a2 2 0 0 0-2 2Z" />
      <path d="M21 10.5v3" />
    </Svg>
  ),
  book: (p: P) => (
    <Svg {...p}>
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H18a2 2 0 0 1 2 2v14a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2Z" />
      <path d="M4 17.5A2 2 0 0 1 6 16h14" />
    </Svg>
  ),
  users: (p: P) => (
    <Svg {...p}>
      <circle cx="9.5" cy="8" r="3.2" />
      <path d="M3.5 20a6 6 0 0 1 12 0" />
      <path d="M16.5 5.4a3.2 3.2 0 0 1 0 6.2M17 14.4A6 6 0 0 1 20.5 20" />
    </Svg>
  ),
  user: (p: P) => (
    <Svg {...p}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </Svg>
  ),
  settings: (p: P) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 14a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4 14a2 2 0 1 1 0-4 1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10.6 4a2 2 0 1 1 4 0 1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 20 10a2 2 0 1 1 0 4Z" />
    </Svg>
  ),
  shield: (p: P) => (
    <Svg {...p}>
      <path d="M12 3 5 6v5.5c0 4.3 2.9 8.2 7 9.5 4.1-1.3 7-5.2 7-9.5V6Z" />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  ),
  chart: (p: P) => (
    <Svg {...p}>
      <path d="M4 20V4M4 20h16" />
      <path d="M8 16v-4M12.5 16V7M17 16v-6" />
    </Svg>
  ),
  mail: (p: P) => (
    <Svg {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7.5 7.1 4.8a1.6 1.6 0 0 0 1.8 0L20 7.5" />
    </Svg>
  ),
  logout: (p: P) => (
    <Svg {...p}>
      <path d="M15 4h2.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H15" />
      <path d="M11 8 7 12l4 4M7 12h9" />
    </Svg>
  ),
  chevron: (p: P) => (
    <Svg {...p}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  ),
  arrow: (p: P) => (
    <Svg {...p}>
      <path d="M5 12h13M13 6.5 18.5 12 13 17.5" />
    </Svg>
  ),
  plus: (p: P) => (
    <Svg {...p}>
      <path d="M12 5.5v13M5.5 12h13" />
    </Svg>
  ),
  check: (p: P) => (
    <Svg {...p}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Svg>
  ),
  x: (p: P) => (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  ),
  menu: (p: P) => (
    <Svg {...p}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  ),
  link: (p: P) => (
    <Svg {...p}>
      <path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7l-1.3 1.3" />
      <path d="M13.5 10.5a4 4 0 0 0-5.7 0L5 13.3a4 4 0 0 0 5.7 5.7l1.3-1.3" />
    </Svg>
  ),
  star: (p: P) => (
    <Svg {...p}>
      <path d="m12 4 2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9L9.6 9Z" />
    </Svg>
  ),
  play: (p: P) => (
    <Svg {...p}>
      <path d="M8 5.5v13l10-6.5Z" />
    </Svg>
  ),
  stop: (p: P) => (
    <Svg {...p}>
      <rect x="6.5" y="6.5" width="11" height="11" rx="2" />
    </Svg>
  ),
  search: (p: P) => (
    <Svg {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </Svg>
  ),
  sparkle: (p: P) => (
    <Svg {...p}>
      <path d="M12 3.5 13.6 9 19 10.5 13.6 12 12 17.5 10.4 12 5 10.5 10.4 9Z" />
      <path d="M18 16.5 18.7 19l2.3.8-2.3.7L18 23l-.7-2.5-2.3-.7 2.3-.8Z" />
    </Svg>
  ),
  doc: (p: P) => (
    <Svg {...p}>
      <path d="M6 3.5h7.5L19 9v11.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" />
      <path d="M13 3.5V9h5.5" />
    </Svg>
  ),
};
