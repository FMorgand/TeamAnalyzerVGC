import { useState, useEffect } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  isOpen: boolean
  onClose: () => void
}

export function PasteModal({ value, onChange, isOpen, onClose }: Props) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (isOpen) setDraft(value)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleImport = () => {
    onChange(draft)
    onClose()
  }

  const handleCancel = () => {
    setDraft(value)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={e => { if (e.target === e.currentTarget) handleCancel() }}
    >
      <div style={{
        background: '#1a1a2e',
        border: '1px solid #2a2a3e',
        borderRadius: 10,
        width: 600,
        maxWidth: 'calc(100vw - 4rem)',
        padding: '1.5rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#eee' }}>Importer une équipe</span>
          <button
            onClick={handleCancel}
            style={{ background: 'none', border: 'none', color: '#555', fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Colle ton équipe Showdown ici…"
          rows={16}
          autoFocus
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: '#12121e',
            color: '#e0e0e0',
            border: '1px solid #333',
            borderRadius: 6,
            padding: '0.75rem',
            fontFamily: 'monospace',
            fontSize: 13,
            resize: 'vertical',
            marginBottom: '1rem',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={handleCancel}
            style={{
              background: 'none',
              border: '1px solid #333',
              borderRadius: 6,
              color: '#777',
              padding: '6px 16px',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleImport}
            style={{
              background: '#3a3a6e',
              border: '1px solid #5a5a9e',
              borderRadius: 6,
              color: '#fff',
              padding: '6px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Importer
          </button>
        </div>
      </div>
    </div>
  )
}
