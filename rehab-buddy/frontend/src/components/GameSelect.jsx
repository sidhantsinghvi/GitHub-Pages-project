import './GameSelect.css'

export default function GameSelect({ onSelect }) {
  return (
    <div className="gs-root">
      <h1 className="gs-title">Choose Your Mode</h1>
      <p className="gs-sub">Your limits are set. Pick how you want to train.</p>
      <div className="gs-cards">
        <button className="gs-card" onClick={() => onSelect('runner')}>
          <div className="gs-icon">〰️</div>
          <div className="gs-card-title">Corridor</div>
          <div className="gs-card-desc">
            Stay between the lines.<br />
            Extend to go up, relax to go down.
          </div>
        </button>
        <button className="gs-card" onClick={() => onSelect('archery')}>
          <div className="gs-icon">🏹</div>
          <div className="gs-card-title">Archery</div>
          <div className="gs-card-desc">
            Extend to aim at the target.<br />
            Hold steady to auto-fire!
          </div>
        </button>
        <button className="gs-card" onClick={() => onSelect('tracker')}>
          <div className="gs-icon">📊</div>
          <div className="gs-card-title">Tracker</div>
          <div className="gs-card-desc">
            Classic rep counter.<br />
            Score reps, track your form.
          </div>
        </button>
      </div>
    </div>
  )
}
