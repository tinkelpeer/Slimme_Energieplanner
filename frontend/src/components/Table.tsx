// Table.tsx
import React from 'react'
import type { SimulationInterval } from '../types'
import './Table.css'

// Props voor de Table component: een lijst met intervaldata
interface TableProps {
  intervals: SimulationInterval[]
}

// Table component: geeft de simulatie-resultaten weer in een tabel
const Table: React.FC<TableProps> = ({ intervals }) => {
  // Hulpfunctie voor het formatten van waarden in kWh
  const formatKwh = (v: number) => `${v.toFixed(2)} kWh`
  // Hulpfunctie voor het formatten van kosten in euro's
  const formatCost = (v: number) => `€ ${v.toFixed(2)}`

  return (
    <div className="results-table">
      {/* Titel van de resultaten tabel */}
      <h3 className="graph-title">Resultaten Tabel</h3>
      <table className="results-table__table">
        <thead>
          <tr>
            <th>Tijdstip</th>
            <th>Verbruik</th>
            <th>Batterijactie</th>
            <th>Netverbruik</th>
            <th>Bedrag</th>
          </tr>
        </thead>
        <tbody>
          {intervals.map((i, idx) => {
            // Bereken totaal verbruik: gepland + willekeurig verbruik
            const totalUsage = i.plannedUsage + i.randomUsage
            return (
              <tr key={idx}>
                {/* Tijdstip van het interval */}
                <td>{i.timestamp}</td>
                {/* Totaal verbruik in kWh */}
                <td className="text-right">{formatKwh(totalUsage)}</td>
                {/* Laad/ontlaad actie van de batterij */}
                <td className="text-right">{formatKwh(i.batteryAction)}</td>
                {/* Energieverbruik via het net */}
                <td className="text-right">{formatKwh(i.gridEnergy)}</td>
                {/* Kosten of opbrengsten voor dit interval */}
                <td className="text-right">{formatCost(i.cost)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default Table
