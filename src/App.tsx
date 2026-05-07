import { useState } from 'react'
import { parseShowdownPaste } from './lib/parseShowdown'
import { getTeamDefensiveProfiles, getOffensiveCoverage } from './lib/teamAnalysis'
import { PasteInput } from './components/PasteInput'
import { TeamOverview } from './components/TeamOverview'
import { OffensiveCoverage } from './components/OffensiveCoverage'
import { SwitchInAnalyzer } from './components/SwitchInAnalyzer'
import { TeamComposition } from './components/TeamComposition'
import { CoverageGraph } from './components/CoverageGraph'

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
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: '1.5rem', color: '#fff' }}>
        Team Analyzer VGC
      </h1>

      <PasteInput value={paste} onChange={setPaste} />

      <TeamOverview profiles={profiles} />
      <OffensiveCoverage coverage={coverage} />
      <TeamComposition team={team} />
      <CoverageGraph team={team} />
      <SwitchInAnalyzer team={team} />
    </div>
  )
}

export default App
