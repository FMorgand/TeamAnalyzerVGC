interface Props {
  value: string
  onChange: (value: string) => void
}

export function PasteInput({ value, onChange }: Props) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: 14 }}>
        Paste Showdown
      </label>
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
