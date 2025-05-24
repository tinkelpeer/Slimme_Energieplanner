import React, { useMemo } from 'react'
import type { GraphsProps } from '../types'
import './Graphs.css'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'

/** Kleuren voor batterij acties: ontladen vs laden */
const DISCHARGE_COLOR = '#ff6b6b' // batterij levert energie (boven 0)
const CHARGE_COLOR    = '#0be19b' // batterij laadt op (onder 0)

/** Haal “HH:MM” uit timestamp (plain of ISO‑8601) */
const getTime = (ts: string): string =>
  ts.split(/[T ]/).pop()?.slice(0, 5) ?? ts // resultaat in HH:MM

const Graphs: React.FC<GraphsProps> = ({ intervals }) => {
  /* ── Graph 1: Energieprijs ──────────────────────────────────── */
  // Alleen één punt per uur tonen bij kwartierdata
  const priceData = useMemo(() => {
    if (intervals.length <= 24) return intervals
    const seenHours = new Set<number>()
    return intervals.filter(row => {
      const hour = parseInt(getTime(row.timestamp).split(':')[0], 10)
      if (seenHours.has(hour)) return false
      seenHours.add(hour)
      return true
    })
  }, [intervals])

  // Bereken ticks voor de Y-as (prijzen)
  const prices = priceData.map(i => i.price)
  const maxPrice = Math.max(...prices)
  const maxPriceTick = Math.ceil(maxPrice * 10) / 10
  const priceStep = maxPriceTick / 4
  const priceTicks = Array.from({ length: 5 }, (_, i) =>
    Number((i * priceStep).toFixed(2))
  )

  /** Helper: bouw X-as ticks voor grafieken */
  const buildXTicks = (data: typeof intervals | typeof priceData) => {
    const ticks: string[] = []
    data.forEach((d, idx) => {
      const time = getTime(d.timestamp)
      const [h, m] = time.split(':').map(Number)
      const boundary = idx === 0 || idx === data.length - 1
      if (boundary || (m === 0 && h % 4 === 0)) ticks.push(d.timestamp)
    })
    return Array.from(new Set(ticks))
  }

  const priceXTicks   = useMemo(() => buildXTicks(priceData), [priceData])
  const batteryXTicks = useMemo(() => buildXTicks(intervals),  [intervals])

  /* ── Graph 2: Laad-/Ontlaadmomenten ────────────────────────── */
  // Bepaal maximum voor Y-as op basis van grootste actie
  const actions    = intervals.map(i => i.batteryAction)
  const maxAbsAction = Math.max(...actions.map(Math.abs))
  const yMax = Math.ceil(maxAbsAction * 10) / 10 || 1
  const actionTicks = [-yMax, -yMax/2, 0, yMax/2, yMax].map(v =>
    Number(v.toFixed(1))
  )

  /* ── Graph 4: Huishoudelijk verbruik vs gepland ────────────── */
  // Voeg daadwerkelijk verbruik samen (gepland + random)
  const usageData = intervals.map(i => ({
    ...i,
    actualUsage: i.plannedUsage + i.randomUsage,
  }))

  /* ── Render alle vier grafieken ────────────────────────────── */
  return (
    <div className="graphs-container">
      {/* Graph 1: Energieprijs */}
      <div className="graph-box graph1">
        <h3 className="graph-title">Energieprijs</h3>
        {intervals.length > 0 && (
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={priceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="timestamp"
                ticks={priceXTicks}
                tickFormatter={ts => getTime(ts as string)}
                height={30}
                tickLine={false}
                tick={{ fontSize: '0.45rem', fill: '#666666' }}
              />
              <YAxis
                domain={[0, maxPriceTick]}
                ticks={priceTicks}
                tickFormatter={v => `€${(v as number).toFixed(2)}`}
                tickLine={false}
                tick={{ fontSize: '0.45rem', fill: '#666666' }}
              />
              <Tooltip
                formatter={(value: number) => [`€${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Prijs']}
                labelFormatter={label => `Tijd: ${getTime(label)}`}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#0893c5"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                name="Prijs per kWh"
              />
              <Legend verticalAlign="bottom" align="center" iconType="square" iconSize={7} wrapperStyle={{ bottom: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        )}
      </div>

      {/* Graph 2: Laad-/Ontlaadmomenten */}
      <div className="graph-box graph2">
        <h3 className="graph-title">Laad‑/Ontlaadmomenten</h3>
        {intervals.length > 0 && (
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={intervals} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barSize={6}>
              <XAxis
                dataKey="timestamp"
                ticks={batteryXTicks}
                tickFormatter={ts => getTime(ts as string)}
                height={30}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: '0.45rem', fill: '#666666' }}
              />
              <YAxis
                domain={[ -yMax, yMax ]}
                ticks={actionTicks}
                tickFormatter={v => `${(v as number).toFixed(1)}`}
                tickLine={false}
                tick={{ fontSize: '0.45rem', fill: '#666666' }}
              />
              <ReferenceLine y={0} stroke="#666666" strokeWidth={1} />
              <Tooltip
                formatter={(value: number) => [`${value.toLocaleString('en-US', { minimumFractionDigits: 2 })} kWh`, 'Batterij‑actie']}
                labelFormatter={label => `Tijd: ${getTime(label)}`}
              />
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="square"
                iconSize={7}
                wrapperStyle={{ bottom: 8 }}
                payload={[
                  { value: 'Ontlading in kWh', type: 'square', color: DISCHARGE_COLOR },
                  { value: 'Lading in kWh',   type: 'square', color: CHARGE_COLOR },
                ]}
              />
              <Bar dataKey="batteryAction" name="batterij‑actie" isAnimationActive={false}>
                {intervals.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry.batteryAction >= 0 ? DISCHARGE_COLOR : CHARGE_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        )}
      </div>

      {/* Graph 3: State‑of‑Charge in procenten */}
      <div className="graph-box graph3">
        <h3 className="graph-title">State‑of‑Charge</h3>
        {intervals.length > 0 && (
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={intervals} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {/* Gradient voor de vulling onder de lijn */}
                <linearGradient
                  id="socGradient"
                  gradientUnits="objectBoundingBox"
                  x1="0" y1="0"
                  x2="0" y2="1"
                >
                  <stop offset="0%"   stopColor="#0be19b" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#0be19b" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="timestamp"
                ticks={batteryXTicks}
                tickFormatter={ts => getTime(ts as string)}
                height={30}
                tickLine={false}
                tick={{ fontSize: '0.45rem', fill: '#666666' }}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={v => `${v}%`}
                tickLine={false}
                tick={{ fontSize: '0.45rem', fill: '#666666' }}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)} %`, 'SoC']}
                labelFormatter={label => `Tijd: ${getTime(label)}`}
              />
              <Area
                type="monotone"
                dataKey="soc"
                stroke="#01c282"
                strokeWidth={2}
                fill="url(#socGradient)"
                isAnimationActive={false}
                name="Batterij %"
              />
              <Legend verticalAlign="bottom" align="center" iconType="square" iconSize={7} wrapperStyle={{ bottom: 8 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        )}
      </div>

      {/* Graph 4: Huishoudelijk verbruik vs gepland verbruik */}
      <div className="graph-box graph4">
        <h3 className="graph-title">Huishoudelijk vs Gepland</h3>
        {intervals.length > 0 && (
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={usageData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="timestamp"
                ticks={batteryXTicks}
                tickFormatter={ts => getTime(ts as string)}
                height={30}
                tickLine={false}
                tick={{ fontSize: '0.45rem', fill: '#666666' }}
              />
              <YAxis
                tickFormatter={v => `${(v as number).toFixed(1)}`}
                tickLine={false}
                tick={{ fontSize: '0.45rem', fill: '#666666' }}
              />
              <Tooltip
                formatter={(value: number, name: string) => [`${value.toFixed(2)} kWh`, name]}
                labelFormatter={label => `Tijd: ${getTime(label)}`}
              />
              <Line
                type="monotone"
                dataKey="actualUsage"
                name="H verbruik in kWh"
                stroke="#ff69b4"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="plannedUsage"
                name="G verbruik in kWh"
                stroke="#8b4513"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Legend verticalAlign="bottom" align="center" iconType="square" iconSize={7} wrapperStyle={{ bottom: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        )}
      </div>
    </div>
  )
}

export default Graphs
