export type GeoTarget = {
  id: string
  label: string
  lat: number
  lng: number
  kind: 'recon' | 'scan' | 'photo'
  detail?: string
}

export type ToolId =
  | 'recon'
  | 'scan'
  | 'identity'
  | 'photo'
  | 'globe'
  | 'cipher'

export type PushTargets = (targets: GeoTarget[]) => void
