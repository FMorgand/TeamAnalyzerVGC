const SECTIONS = [
  { id: 'bilan', label: 'Bilan' },
  { id: 'couverture', label: 'Couverture' },
  { id: 'switch-in', label: 'Switch-in' },
  { id: 'matchup', label: 'Matchup' },
  { id: 'strategies', label: 'Stratégies' },
]

export function Sidebar({ topOffset }: { topOffset: number }) {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - topOffset
    window.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <nav style={{
      width: 140,
      flexShrink: 0,
      position: 'sticky',
      top: topOffset,
      height: `calc(100vh - ${topOffset}px)`,
      overflowY: 'auto',
      background: '#0e0e1a',
      borderRight: '1px solid #1e1e2e',
      display: 'flex',
      flexDirection: 'column',
      paddingTop: '1rem',
      gap: 2,
    }}>
      {SECTIONS.map(s => (
        <button
          key={s.id}
          onClick={() => scrollTo(s.id)}
          style={{
            background: 'none',
            border: 'none',
            borderLeft: '2px solid transparent',
            color: '#555',
            fontSize: 12,
            fontWeight: 500,
            padding: '7px 16px',
            textAlign: 'left',
            cursor: 'pointer',
            letterSpacing: '0.02em',
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#ccc'
            e.currentTarget.style.borderLeftColor = '#5a5a9e'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#555'
            e.currentTarget.style.borderLeftColor = 'transparent'
          }}
        >
          {s.label}
        </button>
      ))}
    </nav>
  )
}
