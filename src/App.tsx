import { useState, useMemo } from 'react'
import { useLang } from './contexts/LangContext'
import type { Lang } from './lib/i18n'
import { parseShowdownPaste } from './lib/parseShowdown'
import { Sidebar } from './components/Sidebar'
import { PasteModal } from './components/PasteModal'
import { TeamBanner } from './components/TeamBanner'
import { TeamBilan } from './components/TeamBilan'
import { SwitchInAnalyzer } from './components/SwitchInAnalyzer'
import { MatchupAnalyzer } from './components/MatchupAnalyzer'
import { CoverageSection } from './components/CoverageSection'

const TITLE_HEIGHT = 52
const BANNER_HEIGHT = 78
const HEADER_HEIGHT = TITLE_HEIGHT + BANNER_HEIGHT

const TEST_PASTE = `Charizard @ Charizardite Y
Ability: Blaze
EVs: 2 HP / 32 SpA / 32 Spe
- Heat Wave
- Roost
- Solar Beam
- Scorching Sands
Whimsicott @ Focus Sash
Ability: Prankster
Level: 50
EVs: 32 HP / 32 SpA / 2 SpD
- Moonblast
- Protect
- Tailwind
- Encore
Sneasler @ Mental Herb
Ability: Unburden
Level: 50
EVs: 2 HP / 32 Atk / 32 Spe
- Protect
- Dire Claw
- Fake Out
- Close Combat
Kingambit @ Chople Berry
Ability: Defiant
Level: 50
EVs: 32 Atk / 10 Def / 24 SpD
- Brick Break
- Protect
- Kowtow Cleave
- Iron Head
Garchomp @ Sitrus Berry
Ability: Rough Skin
Level: 50
EVs: 2 HP / 32 Atk / 32 Spe
- Protect
- Rock Slide
- Dragon Claw
- Earthquake
Sinistcha @ Leftovers
Ability: Hospitality
Level: 50
EVs: 32 HP / 5 Def / 29 SpD
Relaxed Nature
- Protect
- Matcha Gotcha
- Trick Room
- Rage Powder`

function App() {
  const [paste, setPaste] = useState(() => localStorage.getItem('teamanalyzer-paste') ?? TEST_PASTE)
  const [pasteModalOpen, setPasteModalOpen] = useState(() => localStorage.getItem('teamanalyzer-paste') === null)
  const { lang, setLang } = useLang()

  const [coverageTrigger, setCoverageTrigger] = useState<{ indices: number[] } | null>(null)
  const [matchupIndices, setMatchupIndices] = useState<number[] | null>(null)
  const [megaActive, setMegaActive] = useState<Set<number>>(new Set())

  const toggleMega = (i: number) => setMegaActive(prev => {
    const next = new Set(prev)
    if (next.has(i)) next.delete(i); else next.add(i)
    return next
  })

  const handlePasteChange = (value: string) => {
    setPaste(value)
    localStorage.setItem('teamanalyzer-paste', value)
    handleActivateIndices(null)
  }

  const handleActivateIndices = (indices: number[] | null) => {
    setCoverageTrigger(indices ? { indices } : null)
    setMatchupIndices(indices)
  }

  const team = useMemo(() => parseShowdownPaste(paste), [paste])
  const hasTeam = team.length > 0

  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif',
      background: '#12121e',
      color: '#e0e0e0',
      minHeight: '100vh',
    }}>
      {/* ── Fixed top bar ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        background: '#0e0e1a',
        borderBottom: '1px solid #1e1e2e',
      }}>
        {/* Title row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 1.5rem',
          height: TITLE_HEIGHT,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>
              Team Analyzer VGC
            </h1>
            <button
              onClick={() => setPasteModalOpen(true)}
              style={{
                background: hasTeam ? '#1a1a2e' : '#3a3a6e',
                border: `1px solid ${hasTeam ? '#2a2a4e' : '#5a5a9e'}`,
                borderRadius: 6,
                color: hasTeam ? '#888' : '#fff',
                fontSize: 12,
                padding: '4px 12px',
                cursor: 'pointer',
                fontWeight: hasTeam ? 400 : 600,
              }}
            >
              {hasTeam ? 'Modifier' : 'Importer'}
            </button>
          </div>
          <div style={{
            display: 'flex',
            background: '#1a1a2e',
            border: '1px solid #2a2a3e',
            borderRadius: 6,
            overflow: 'hidden',
          }}>
            {(['fr', 'en'] as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  background: lang === l ? '#3a3a6e' : 'transparent',
                  color: lang === l ? '#fff' : '#555',
                  border: 'none',
                  padding: '5px 14px',
                  fontSize: 12,
                  fontWeight: lang === l ? 700 : 400,
                  cursor: 'pointer',
                  letterSpacing: '0.05em',
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Team banner row */}
        {hasTeam && (
          <TeamBanner
            team={team}
            megaActive={megaActive}
            onMegaToggle={toggleMega}
            onActivate={handleActivateIndices}
          />
        )}
      </div>

      {/* ── Scrollable body ────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        paddingTop: hasTeam ? HEADER_HEIGHT : TITLE_HEIGHT,
        minHeight: '100vh',
      }}>
        {hasTeam && <Sidebar topOffset={HEADER_HEIGHT} />}

        <main style={{ flex: 1, padding: '2rem', minWidth: 0 }}>

          {/* Empty state */}
          {!hasTeam && (
            <div style={{ textAlign: 'center', color: '#555', marginTop: '6rem' }}>
              <div style={{ fontSize: 16, marginBottom: '0.5rem', color: '#888' }}>
                Aucune équipe chargée
              </div>
              <div style={{ fontSize: 13, marginBottom: '1.5rem' }}>
                Importe ton paste Showdown pour commencer.
              </div>
              <button
                onClick={() => setPasteModalOpen(true)}
                style={{
                  background: '#3a3a6e',
                  border: '1px solid #5a5a9e',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  padding: '10px 24px',
                  cursor: 'pointer',
                }}
              >
                Importer une équipe
              </button>
            </div>
          )}

          {/* Main sections */}
          {hasTeam && (
            <>
              <TeamBilan team={team} megaActive={megaActive} activeIndices={matchupIndices} />
              <div id="couverture">
                <CoverageSection team={team} activeTrigger={coverageTrigger} />
              </div>
              <SwitchInAnalyzer team={team} activeIndices={matchupIndices} />
              <div id="matchup">
                <MatchupAnalyzer team={team} activeIndices={matchupIndices} />
              </div>
            </>
          )}
        </main>
      </div>

      <PasteModal
        value={paste}
        onChange={handlePasteChange}
        isOpen={pasteModalOpen}
        onClose={() => setPasteModalOpen(false)}
      />
    </div>
  )
}

export default App
