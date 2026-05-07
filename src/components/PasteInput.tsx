interface Props {
  value: string
  onChange: (value: string) => void
}

export function PasteInput({ value, onChange }: Props) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <label style={{ fontWeight: 600, fontSize: 14 }}>
          Paste Showdown
        </label>
        {value && (
          <button
            onClick={() => onChange('')}
            style={{
              background: 'none',
              border: '1px solid #444',
              borderRadius: 4,
              color: '#666',
              fontSize: 11,
              padding: '2px 10px',
              cursor: 'pointer',
            }}
          >
            Effacer
          </button>
        )}
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Colle ton équipe Showdown ici…"
        rows={12}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          background: '#1a1a2e',
          color: '#e0e0e0',
          border: '1px solid #333',
          borderRadius: 6,
          padding: '0.75rem',
          fontFamily: 'monospace',
          fontSize: 13,
          resize: 'vertical',
        }}
      />
    </div>
  )
}
