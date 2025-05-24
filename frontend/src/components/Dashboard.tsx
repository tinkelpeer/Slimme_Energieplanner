import React from 'react'
import './Dashboard.css'

// Props voor het Dashboard-component
interface DashboardProps {
  netUsage?: number     // Netto energiegebruik in kWh
  netCost?: number      // Kosten in euro's
  avgSoc?: number       // Gemiddelde state-of-charge in %
}

// Hulpfunctie om een getal te formatteren, toont een streepje als de waarde ontbreekt
const fmt = (v?: number, digits = 1) =>
  v === undefined ? '–' : v.toFixed(digits)

// Klein component voor bijschriften onder de waarden
const Caption: React.FC<{ text: string }> = ({ text }) => (
  <p className="dashboard-label">{text}</p>
)

// Hoofdcomponent voor het Dashboard
const Dashboard: React.FC<DashboardProps> = ({ netUsage, netCost, avgSoc }) => (
  <div className="dashboard-square">
    {/* Titel */}
    <h2 className="dashboard-title">Dashboard</h2>

    {/* Box 1 – Netgebruik */}
    <div className="dashboard-box box1">
      <div className="icon-circle">
        <img src="/lightning.svg" alt="Lightning icon" />
      </div>
      {/* Toon netto-energiegebruik */}
      <p className="dashboard-value">{fmt(netUsage)} kWh</p>
      <Caption text="Netgebruik" />
    </div>

    {/* Box 2 – Kosten */}
    <div className="dashboard-box box2">
      <div className="icon-circle">
        <img src="/euro.svg" alt="Euro icon" />
      </div>
      {/* Toon kosten */}
      <p className="dashboard-value">€ {fmt(netCost, 2)}</p>
      <Caption text="Kosten" />
    </div>

    {/* Box 3 – Gemiddelde SoC */}
    <div className="dashboard-box box3">
      <div className="icon-circle">
        <img src="/battery.svg" alt="Battery icon" />
      </div>
      {/* Toon gemiddelde SoC */}
      <p className="dashboard-value">{fmt(avgSoc)} %</p>
      <Caption text="SoC-gem." />
    </div>
  </div>
)

export default Dashboard
