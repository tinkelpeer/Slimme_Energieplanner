import React from 'react'
import type { InputErrors } from '../../types'
import './SidebarInputs.css'

// Props definitie voor de SidebarInputs component
type SidebarInputsProps = {
  capacity: string // huidige waarde voor batterijcapaciteit (kWh)
  startCharge: string // huidige waarde voor start-SoC (% van capaciteit)
  powerLimit: string // huidige waarde voor max laad-/ontlaadvermogen (kW)
  gridLimit: string // huidige waarde voor netaansluitvermogen (kW)
  errors: InputErrors // foutstatussen per veld voor visuele validatie-feedback
  onCapacityChange: React.ChangeEventHandler<HTMLInputElement> // handler voor wijzigingen in batterijcapaciteit
  onStartChargeChange: React.ChangeEventHandler<HTMLInputElement> // handler voor wijzigingen in start-SoC
  onPowerLimitChange: React.ChangeEventHandler<HTMLInputElement> // handler voor wijzigingen in laad-/ontlaadvermogen
  onGridLimitChange: React.ChangeEventHandler<HTMLInputElement> // handler voor wijzigingen in netaansluitvermogen
}

// SidebarInputs component: rendeert vier invoervelden met bijbehorende labels en validatie
const SidebarInputs: React.FC<SidebarInputsProps> = ({
  capacity,
  startCharge,
  powerLimit,
  gridLimit,
  errors,
  onCapacityChange,
  onStartChargeChange,
  onPowerLimitChange,
  onGridLimitChange,
}) => (
  <>
    {/* Invoerveld voor batterijcapaciteit (kWh) */}
    <label>
      <span className="label-text">Batterijcapaciteit (kWh)</span>
      <input
        type="text"
        inputMode="decimal"
        placeholder="Bijv. 10,5"
        value={capacity}
        onChange={onCapacityChange}
        className={errors.capacity ? 'input-error' : ''}
      />
    </label>

    {/* Invoerveld voor startlading als percentage van capaciteit */}
    <label>
      <span className="label-text">Start-SoC (% van kWh)</span>
      <input
        type="text"
        inputMode="decimal"
        placeholder="Bijv. 50%"
        value={startCharge}
        onChange={onStartChargeChange}
        className={errors.startCharge ? 'input-error' : ''}
      />
    </label>

    {/* Invoerveld voor maximaal laad-/ontlaadvermogen (kW) */}
    <label>
      <span className="label-text">Max laad-/ontlaadvermogen (kW)</span>
      <input
        type="text"
        inputMode="decimal"
        placeholder="Bijv. 5"
        value={powerLimit}
        onChange={onPowerLimitChange}
        className={errors.powerLimit ? 'input-error' : ''}
      />
    </label>

    {/* Invoerveld voor netaansluitvermogen (kW) */}
    <label>
      <span className="label-text">Netaansluitvermogen (kW)</span>
      <input
        type="text"
        inputMode="decimal"
        placeholder="Bijv. 17,25"
        value={gridLimit}
        onChange={onGridLimitChange}
        className={errors.gridLimit ? 'input-error' : ''}
      />
    </label>
  </>
)

export default SidebarInputs
