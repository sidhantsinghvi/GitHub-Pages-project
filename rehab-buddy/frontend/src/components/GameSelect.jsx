import './GameSelect.css'

const GAMES = {
  bicep: [
    {
      id: 'basketball',
      icon: '🏀',
      title: 'Basketball',
      desc: <>Aim the hoop with your curl.<br />Shoot when ready!</>,
    },
    {
      id: 'tracker',
      icon: '📊',
      title: 'Tracker',
      desc: <>Classic rep counter.<br />Score reps, track your form.</>,
    },
  ],
  tricep: [
    {
      id: 'pong',
      icon: '🏓',
      title: 'Pong',
      desc: <>Control your paddle with your arm.<br />First to 7 beats the CPU!</>,
    },
    {
      id: 'archery',
      icon: '🏹',
      title: 'Archery',
      desc: <>Extend to aim at the target.<br />Hold steady to auto-fire!</>,
    },
    {
      id: 'tracker',
      icon: '📊',
      title: 'Tracker',
      desc: <>Classic rep counter.<br />Score reps, track your form.</>,
    },
  ],
}

export default function GameSelect({ onSelect, exercise = 'bicep' }) {
  const games = GAMES[exercise] ?? GAMES.bicep
  return (
    <div className="gs-root">
      <h1 className="gs-title">Choose Your Mode</h1>
      <p className="gs-sub">Your limits are set. Pick how you want to train.</p>
      <div className="gs-cards">
        {games.map(g => (
          <button key={g.id} className="gs-card" onClick={() => onSelect(g.id)}>
            <div className="gs-icon">{g.icon}</div>
            <div className="gs-card-title">{g.title}</div>
            <div className="gs-card-desc">{g.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
