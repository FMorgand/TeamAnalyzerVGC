import { useState } from 'react'
import { useLang } from './contexts/LangContext'
import type { Lang } from './lib/i18n'
import { parseShowdownPaste } from './lib/parseShowdown'
import { getTeamDefensiveProfiles, getOffensiveCoverage } from './lib/teamAnalysis'
import { PasteInput } from './components/PasteInput'
import { TeamOverview } from './components/TeamOverview'
import { OffensiveCoverage } from './components/OffensiveCoverage'
import { SwitchInAnalyzer } from './components/SwitchInAnalyzer'
import { MatchupAnalyzer } from './components/MatchupAnalyzer'
import { TeamComposition } from './components/TeamComposition'
import { CoverageSection } from './components/CoverageSection'

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
  const [paste, setPaste] = useState(TEST_PASTE)
  const { lang, setLang } = useLang()

  const team = parseShowdownPaste(paste)
  const profiles = getTeamDefensiveProfiles(team)
  const coverage = getOffensiveCoverage(team)

  return (
    <div style={{
      padding: '2rem',
      fontFamily: 'system-ui, sans-serif',
      background: '#12121e',
      color: '#e0e0e0',
      minHeight: '100vh',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0 }}>
          Team Analyzer VGC
        </h1>
        <div style={{ display: 'flex', background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 6, overflow: 'hidden' }}>
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

      <PasteInput value={paste} onChange={setPaste} />

      <TeamOverview profiles={profiles} />
      <OffensiveCoverage coverage={coverage} />
      <TeamComposition team={team} />
      <CoverageSection team={team} />
      <SwitchInAnalyzer team={team} />
      <MatchupAnalyzer team={team} />
    </div>
  )
}

export default App
