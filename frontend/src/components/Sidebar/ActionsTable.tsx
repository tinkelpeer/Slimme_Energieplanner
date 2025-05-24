import React from 'react'
import type { Action, ActionError } from '../../types'
import './ActionsTable.css'

// Props voor de ActionsTable component
type ActionsTableProps = {
  // Lijst van acties (starttijd, duur, vermogen)
  actions: Action[]
  // Foutenstatus per actieveld
  actionErrors: ActionError[]
  // Foutstatus als er geen acties zijn toegevoegd
  noActionsError: boolean
  // Callback om een nieuwe actie toe te voegen
  addAction: () => void
  // Callback om een veld van een actie bij te werken
  updateAction: (index: number, field: keyof Action, value: string) => void
  // Callback om een actie te verwijderen
  removeAction: (index: number) => void
  // Formatter voor tijdinvoer (hh:mm)
  formatTimeInput: (value: string) => string
  // Formatter voor decimale invoer (getallen en decimaal)
  formatDecimalInput: (value: string) => string
}

// Component voor de tabel met geplande verbruiksacties
const ActionsTable: React.FC<ActionsTableProps> = ({
  actions,
  actionErrors,
  noActionsError,
  addAction,
  updateAction,
  removeAction,
  formatTimeInput,
  formatDecimalInput,
}) => (
  <>
    {/* Tabel met kolommen voor starttijd, duur, vermogen en verwijderknop */}
    <table className="actions-table">
      <thead>
        <tr>
          <th className="start-time">Starttijd</th>
          <th className="duration">Duur</th>
          <th className="power">Vermogen</th>
          <th className="actions"></th>
        </tr>
      </thead>
      <tbody>
        {actions.map((action, idx) => (
          <tr key={idx}>
            <td>
              {/* Invoerveld voor starttijd van de actie */}
              <input
                type="text"
                inputMode="numeric"
                pattern="\\d{1,2}:\\d{1,2}"
                placeholder="hh:mm"
                value={action.startTime}
                onChange={e =>
                  updateAction(
                    idx,
                    'startTime',
                    formatTimeInput(e.target.value)
                  )
                }
                className={
                  actionErrors[idx].startTime ? 'input-error' : ''
                }
              />
            </td>
            <td>
              {/* Invoerveld voor duur van de actie in minuten */}
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]+([.,][0-9]+)?"
                placeholder="Min"
                value={action.duration}
                onChange={e =>
                  updateAction(
                    idx,
                    'duration',
                    formatDecimalInput(e.target.value)
                  )
                }
                className={
                  actionErrors[idx].duration ? 'input-error' : ''
                }
              />
            </td>
            <td>
              {/* Invoerveld voor vermogen van de actie in kW */}
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]+([.,][0-9]+)?"
                placeholder="kW"
                value={action.power}
                onChange={e =>
                  updateAction(
                    idx,
                    'power',
                    formatDecimalInput(e.target.value)
                  )
                }
                className={actionErrors[idx].power ? 'input-error' : ''}
              />
            </td>
            <td>
              {/* Knop om de huidige actie te verwijderen */}
              <button
                type="button"
                className="remove-action-button"
                onClick={() => removeAction(idx)}
                aria-label="Verwijder actie"
              >
                &minus;
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    {/* Knop om een nieuwe actie toe te voegen, markering bij fout als er geen acties zijn */}
    <button
      type="button"
      className={`add-action-button${noActionsError ? ' error' : ''}`}
      onClick={addAction}
    >
      + Toevoegen
    </button>
  </>
)

export default ActionsTable
