export type Action = {
  startTime: string
  duration: string
  power: string
}
export type ActionError = {
  startTime: boolean
  duration: boolean
  power: boolean
}
export interface InputErrors {
  capacity: boolean
  startCharge: boolean
  powerLimit: boolean
  gridLimit: boolean
}
export interface SimulationInterval {
  timestamp: string
  price: number
  plannedUsage: number
  randomUsage: number
  pvProduction: number 
  batteryAction: number
  soc: number
  gridEnergy: number
  cost: number
}
export interface SimulationResult {
  netUsage: number
  netCost: number
  avgSoc: number
  intervals: SimulationInterval[]
}
export interface GraphsProps {
  intervals: SimulationInterval[]
}
