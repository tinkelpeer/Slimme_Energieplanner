import './App.css'
import { useState, useRef } from 'react'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar/Sidebar'
import Dashboard from './components/Dashboard'
import Graphs from './components/Graphs'
import Table from './components/Table'
import type { Action, ActionError, InputErrors, SimulationResult } from './types'

function App() {
  // ---------- Sidebar invoerwaarden ----------
  const [capacity, setCapacity] = useState<string>('') // Batterijcapaciteit in kWh
  const [startCharge, setStartCharge] = useState<string>('') // Start-SoC in % of kWh
  const [powerLimit, setPowerLimit] = useState<string>('') // Max laad-/ontlaadvermogen in kW
  const [gridLimit, setGridLimit] = useState<string>('')   // Netaansluitwaarde in kW

  // ---------- Foutflags voor validatie ----------
  const [errors, setErrors] = useState<InputErrors>({
    capacity: false,
    startCharge: false,
    powerLimit: false,
    gridLimit: false,
  })

  // ---------- Acties tabel state ----------
  const [actions, setActions] = useState<Action[]>([
    { startTime: '', duration: '', power: '' },
  ])
  const [actionErrors, setActionErrors] = useState<ActionError[]>([
    { startTime: false, duration: false, power: false },
  ])
  const [noActionsError, setNoActionsError] = useState(false) // Fout als geen acties zijn toegevoegd

  // ---------- Spinner tijdens simulatie ----------
  const [spinning, setSpinning] = useState(false)

  // ---------- Bestandsreferenties ----------
  const [dayAheadFile, setDayAheadFile] = useState<File | null>(null)
  const [dayAheadError, setDayAheadError] = useState(false)
  const [pvProfileFile, setPvProfileFile] = useState<File | null>(null)
  const dayAheadInputRef = useRef<HTMLInputElement | null>(null)
  const pvInputRef       = useRef<HTMLInputElement | null>(null)
  const [simResult, setSimResult] = useState<SimulationResult | null>(null) // Resultaat van de simulatie

  // ---------- Hulpfuncties voor formatten ----------
  const parsePercent = (val: string) =>
    Number(val.replace('%', '').replace(',', '.')) // Verwijder '%' en komma voor omzetten

  // Formatter: cijfers plus maximaal één scheidingsteken
  const formatDecimalInput = (value: string) => {
    let seenSep = false
    return value
      .split('')
      .filter((ch) => {
        if (ch === '.' || ch === ',') {
          if (seenSep) return false
          seenSep = true
          return true
        }
        return /\d/.test(ch)
      })
      .join('')
  }

  // Formatter: cijfers, één decimaal en één '%' voor SoC
  const formatSoCInput = (value: string) => {
    let seenSep = false
    let seenPct = false
    let sawDigit = false
    return value
      .split('')
      .filter((ch) => {
        if (/\d/.test(ch)) {
          sawDigit = true
          return true
        }
        if ((ch === '.' || ch === ',') && !seenSep) {
          seenSep = true
          return true
        }
        if (ch === '%' && sawDigit && !seenPct) {
          seenPct = true
          return true
        }
        return false
      })
      .join('')
  }

  // Formatter: tijd invoer "hh:mm"
  const formatTimeInput = (value: string) => {
    let seenColon = false
    let out = ''
    for (const ch of value) {
      if (/\d/.test(ch)) {
        if (!seenColon) {
          if (out.length < 2) out += ch
        } else {
          const mins = out.slice(out.indexOf(':') + 1)
          if (mins.length < 2) out += ch
        }
      } else if (ch === ':' && !seenColon) {
        seenColon = true
        if (out.length > 0) out += ch
      }
    }
    return out
  }

  // ---------- Handlers die fout wissen bij invoer ----------
  const handleDecimalChange = (
    setter: (v: string) => void,
    field: keyof InputErrors
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = formatDecimalInput(e.target.value)
    setter(val)
    if (/\d/.test(val) && errors[field]) {
      setErrors((err) => ({ ...err, [field]: false }))
    }
  }
  const handleSoCChange = (
    setter: (v: string) => void,
    field: keyof InputErrors
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = formatSoCInput(e.target.value)
    setter(val)
    if (/\d/.test(val) && errors[field]) {
      setErrors((err) => ({ ...err, [field]: false }))
    }
  }

  // ---------- Validatiefuncties ----------
  const validateFields = () => ({
    capacity: !/\d/.test(capacity),
    startCharge: !/\d/.test(startCharge),
    powerLimit: !/\d/.test(powerLimit),
    gridLimit: !/\d/.test(gridLimit),
  })

  const validateActions = (): boolean => {
    const timeRe = /^(?:(?:[01]?\d|2[0-3]):[0-5]\d|24:00)$/
    const newErrors = actions.map((a) => ({
      startTime: !timeRe.test(a.startTime),
      duration: !/\d/.test(a.duration),
      power: !/\d/.test(a.power),
    }))
    setActionErrors(newErrors)
    return !newErrors.some((err) => err.startTime || err.duration || err.power)
  }

  // ---------- Start simulatie ----------
  const runSimulation = async () => {
    if (!dayAheadFile) return
    const dayAheadCsv     = await dayAheadFile.text()
    const pvProfileCsv    = pvProfileFile ? await pvProfileFile.text() : undefined

    // Bouw payload voor backend
    const payload: Record<string, any> = {
      capacity   : Number(capacity.replace(',', '.')),
      startSoc   : parsePercent(startCharge),
      powerLimit : Number(powerLimit.replace(',', '.')),
      gridLimit  : Number(gridLimit.replace(',', '.')),
      dayAheadCsv,
      ...(pvProfileCsv ? { pvProfileCsv } : {}),
      actions    : actions.map(a => ({
        startTime: a.startTime,
        duration : Number(a.duration.replace(',', '.')),
        power    : Number(a.power.replace(',', '.')),
      })),
    }

    try {
      const res = await fetch('http://localhost:3000/simulate', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Simulatie mislukt')
      const data: SimulationResult = await res.json()
      setSimResult(data) // Sla resultaat op
    } catch (err) {
      console.error(err) // Toon fout in console
    }
  }

  // ---------- Handler voor refresh knop ----------
  const handleRefresh = () => {
    const fieldErrs = validateFields()
    setErrors(fieldErrs)
    const okFields = !Object.values(fieldErrs).some(Boolean)
    const hasDayAhead = Boolean(dayAheadFile)
    setDayAheadError(!hasDayAhead)
    if (actions.length === 0) {
      setNoActionsError(true)
      return
    }
    const okActions = validateActions()
    if (okFields && hasDayAhead && okActions) {
      setSpinning(true)
      runSimulation()
    }
  }
  const onSpinEnd = () => {
    setSpinning(false) // Stop spinner na animatie
  }

  // ---------- Actie handlers voor acties tabel ----------
  const addAction = () => {
    setActions([...actions, { startTime: '', duration: '', power: '' }])
    setActionErrors([
      ...actionErrors,
      { startTime: false, duration: false, power: false },
    ])
    setNoActionsError(false)
  }
  const updateAction = (
    index: number,
    field: keyof Action,
    value: string
  ) => {
    const newActions = [...actions]
    newActions[index] = { ...newActions[index], [field]: value }
    setActions(newActions)
    setActionErrors((errs) => {
      const copy = [...errs]
      copy[index] = { ...copy[index], [field]: false }
      return copy
    })
  }
  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index))
    setActionErrors(actionErrors.filter((_, i) => i !== index))
  }

  // ---------- Handlers voor bestandselectie ----------
  const onChooseDayAhead = () => dayAheadInputRef.current?.click()
  const onChoosePv = () => pvInputRef.current?.click()
  const onDayAheadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.name.endsWith('.csv')) {
      setDayAheadFile(file)
    } else {
      e.target.value = ''
    }
  }
  const onPvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.name.endsWith('.csv')) {
      setPvProfileFile(file)
    } else {
      e.target.value = ''
    }
  }
  const clearDayAhead = () => {
    setDayAheadFile(null)
    if (dayAheadInputRef.current) dayAheadInputRef.current.value = ''
  }
  const clearPv = () => {
    setPvProfileFile(null)
    if (pvInputRef.current) pvInputRef.current.value = ''
  }

  // ---------- Drag-and-drop handlers ----------
  const onDragEnter = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault()
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault()
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }
  const onDayAheadDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) {
      setDayAheadFile(file)
    }
  }
  const onPvDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) {
      setPvProfileFile(file)
    }
  }

  // ---------- JSX-rendering ----------
  return (
    <>
      <TopBar
        spinning={spinning}
        onRefresh={handleRefresh}
        onSpinEnd={onSpinEnd}
      />
      <div className="app-container">
        <Sidebar
          capacity={capacity}
          startCharge={startCharge}
          powerLimit={powerLimit}
          gridLimit={gridLimit}
          errors={errors}
          dayAheadFile={dayAheadFile}
          dayAheadError={dayAheadError}
          pvProfileFile={pvProfileFile}
          dayAheadInputRef={dayAheadInputRef}
          pvInputRef={pvInputRef}
          onCapacityChange={handleDecimalChange(
            setCapacity,
            'capacity'
          )}
          onStartChargeChange={handleSoCChange(
            setStartCharge,
            'startCharge'
          )}
          onPowerLimitChange={handleDecimalChange(
            setPowerLimit,
            'powerLimit'
          )}
          onGridLimitChange={handleDecimalChange(
            setGridLimit,
            'gridLimit'
          )}
          onChooseDayAhead={onChooseDayAhead}
          onDayAheadChange={onDayAheadChange}
          clearDayAhead={clearDayAhead}
          onChoosePv={onChoosePv}
          onPvChange={onPvChange}
          clearPv={clearPv}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDayAheadDrop={onDayAheadDrop}
          onPvDrop={onPvDrop}
          actions={actions}
          actionErrors={actionErrors}
          noActionsError={noActionsError}
          addAction={addAction}
          updateAction={updateAction}
          removeAction={removeAction}
          formatTimeInput={formatTimeInput}
          formatDecimalInput={formatDecimalInput}
        />
        <main className="content">
          <Dashboard
            netUsage={simResult?.netUsage}
            netCost={simResult?.netCost}
            avgSoc={simResult?.avgSoc}
          />
          <Graphs intervals={simResult?.intervals ?? []} />
          <Table intervals={simResult?.intervals ?? []} />
        </main>
      </div>
    </>
  )
}

export default App
