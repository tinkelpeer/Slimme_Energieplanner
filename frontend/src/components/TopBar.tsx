import React from 'react'
import './TopBar.css'

// Props voor de TopBar component
type TopBarProps = {
  spinning: boolean // Geeft aan of de knop moet draaien
  onRefresh: () => void // Callback bij klik op vernieuw-knop
  onSpinEnd: () => void // Callback wanneer de draai-animatie eindigt
}

// TopBar component toont de app-titel en een herlaadknop
const TopBar: React.FC<TopBarProps> = ({ spinning, onRefresh, onSpinEnd }) => (
  <header className="top-bar">
    {/* Applicatienaam */}
    <h1 className="top-bar-title">Slimme Energieplanner</h1>
    {/* Verfris-knop om data opnieuw op te halen */}
    <button
      type="button"
      className="refresh-button"
      aria-label="Vernieuwen"
      onClick={onRefresh}
    >
      <img
        src="/refresh.svg"
        alt="Refresh icon"
        className={spinning ? 'spin' : ''} // Voeg spin-klasse toe tijdens draaien
        onAnimationEnd={onSpinEnd} // Meld einde animatie
      />
    </button>
  </header>
)

export default TopBar
