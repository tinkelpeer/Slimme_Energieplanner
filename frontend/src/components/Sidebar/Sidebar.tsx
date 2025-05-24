import React from 'react'
import SidebarInputs from './SidebarInputs'
import FileInput from './FileInput'
import ActionsTable from './ActionsTable'
import type { Action, ActionError, InputErrors } from '../../types'
import './Sidebar.css'

// Props definitie voor de Sidebar component
interface SidebarProps {
  capacity: string            // Batterijcapaciteit in kWh
  startCharge: string         // Begin-SoC als percentage of kWh
  powerLimit: string          // Maximaal laad-/ontlaadvermogen in kW
  gridLimit: string           // Netaansluitvermogen in kW
  errors: InputErrors         // Fouten voor de invoervelden
  dayAheadFile: File | null   // Geüpload CSV bestand met day-ahead prijzen
  dayAheadError: boolean      // Foutstatus bij ontbreken van day-ahead bestand
  pvProfileFile: File | null  // Optioneel CSV bestand met PV productieprofiel
  dayAheadInputRef: React.Ref<HTMLInputElement> // Ref voor day-ahead file input
  pvInputRef:       React.Ref<HTMLInputElement> // Ref voor PV profiel file input
  onCapacityChange: React.ChangeEventHandler<HTMLInputElement>    // Handler voor wijziging capaciteit
  onStartChargeChange: React.ChangeEventHandler<HTMLInputElement> // Handler voor wijziging start-SoC
  onPowerLimitChange: React.ChangeEventHandler<HTMLInputElement>  // Handler voor wijziging vermogen
  onGridLimitChange: React.ChangeEventHandler<HTMLInputElement>  // Handler voor wijziging netaansluiting
  onChooseDayAhead: () => void     // Callback om day-ahead bestand te kiezen
  onDayAheadChange: React.ChangeEventHandler<HTMLInputElement> // Callback na wijziging day-ahead input
  clearDayAhead: () => void        // Callback om day-ahead bestand te verwijderen
  onChoosePv: () => void           // Callback om PV profiel bestand te kiezen
  onPvChange: React.ChangeEventHandler<HTMLInputElement>      // Callback na wijziging PV profiel input
  clearPv: () => void              // Callback om PV profiel bestand te verwijderen
  onDragEnter: React.DragEventHandler<HTMLDivElement> // Drag-enter handler (file drop)
  onDragLeave: React.DragEventHandler<HTMLDivElement> // Drag-leave handler (file drop)
  onDragOver: React.DragEventHandler<HTMLDivElement>  // Drag-over handler (file drop)
  onDayAheadDrop: React.DragEventHandler<HTMLDivElement> // Drop handler voor day-ahead bestand
  onPvDrop: React.DragEventHandler<HTMLDivElement>      // Drop handler voor PV profiel bestand
  actions: Action[]                               // Lijst van geplande verbruiksacties
  actionErrors: ActionError[]                     // Fouten per actie
  noActionsError: boolean                         // Foutstatus bij ontbreken acties
  addAction: () => void                           // Callback om een nieuwe actie toe te voegen
  updateAction: (index: number, field: keyof Action, value: string) => void // Callback om actie te wijzigen
  removeAction: (index: number) => void           // Callback om een actie te verwijderen
  formatTimeInput: (value: string) => string      // Formatter voor tijd invoer
  formatDecimalInput: (value: string) => string   // Formatter voor decimale invoer
}

// Sidebar component: houdt alle invoervelden, bestandsuploads en acties bij
const Sidebar: React.FC<SidebarProps> = ({
  capacity,
  startCharge,
  powerLimit,
  gridLimit,
  errors,
  dayAheadFile,
  dayAheadError,
  pvProfileFile,
  dayAheadInputRef,
  pvInputRef,
  onCapacityChange,
  onStartChargeChange,
  onPowerLimitChange,
  onGridLimitChange,
  onChooseDayAhead,
  onDayAheadChange,
  clearDayAhead,
  onChoosePv,
  onPvChange,
  clearPv,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDayAheadDrop,
  onPvDrop,
  actions,
  actionErrors,
  noActionsError,
  addAction,
  updateAction,
  removeAction,
  formatTimeInput,
  formatDecimalInput,
}) => (
  // Hoofd container voor de sidebar
  <aside className="sidebar">
    {/* Logo bovenin */}
    <img
      src="/full_logo.svg"
      alt="Currentt full logo"
      className="sidebar-logo"
    />
    {/* Wrapper voor input secties */}
    <div className="sidebar-inputs">
      {/* Sectie voor numerieke inputs */}
      <SidebarInputs
        capacity={capacity}
        startCharge={startCharge}
        powerLimit={powerLimit}
        gridLimit={gridLimit}
        errors={errors}
        onCapacityChange={onCapacityChange}
        onStartChargeChange={onStartChargeChange}
        onPowerLimitChange={onPowerLimitChange}
        onGridLimitChange={onGridLimitChange}
      />
      {/* Bestand upload voor day-ahead prijzen */}
      <FileInput
        label="Day-ahead stroomprijzen CSV"
        file={dayAheadFile}
        error={dayAheadError}
        inputRef={dayAheadInputRef}
        onChoose={onChooseDayAhead}
        onChange={onDayAheadChange}
        onClear={clearDayAhead}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDayAheadDrop}
      />
      {/* Bestand upload voor PV productieprofiel (optioneel) */}
      <FileInput
        label="PV-productieprofiel CSV (optioneel)"
        file={pvProfileFile}
        inputRef={pvInputRef}
        onChoose={onChoosePv}
        onChange={onPvChange}
        onClear={clearPv}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onPvDrop}
      />
      {/* Sectie voor geplande verbruiksacties */}
      <div className="sidebar-actions">
        <label className="section-title">Geplande verbruiksacties</label>
        <ActionsTable
          actions={actions}
          actionErrors={actionErrors}
          noActionsError={noActionsError}
          addAction={addAction}
          updateAction={updateAction}
          removeAction={removeAction}
          formatTimeInput={formatTimeInput}
          formatDecimalInput={formatDecimalInput}
        />
      </div>
    </div>
  </aside>
)

export default Sidebar
