// apps/frontend-kiosk/src/workers/pcb-standoff.worker.ts
import { primitives, booleans, transforms } from '@jscad/modeling'
import { serialize } from '@jscad/stl-serializer'

const { roundedCuboid, cylinder } = primitives
const { subtract, union } = booleans
const { translate } = transforms

export interface HolePosition {
  x: number
  y: number
}

export interface PcbStandoffParams {
  pcbLength: number      // interior length mm
  pcbWidth: number       // interior width mm
  plateThickness: number // mm
  standoffHeight: number // mm
  standoffOD: number     // standoff outer diameter mm
  screwHoleDia: number   // screw hole diameter mm
  holes: HolePosition[]  // coords from top-left corner of PCB
}

function generatePlate(p: PcbStandoffParams) {
  const { pcbLength: L, pcbWidth: W, plateThickness: pt, standoffHeight: sh, standoffOD: od, screwHoleDia: sd, holes } = p

  // Base plate centered at origin
  const plateRadius = Math.min(1, pt / 2 - 0.01)
  let result = roundedCuboid({ size: [L, W, pt], roundRadius: plateRadius, segments: 16 })

  if (holes.length === 0) return result

  // Union standoffs onto plate
  for (const hole of holes) {
    // User coords: origin top-left, Y down. Convert to JSCAD: origin center, Y up.
    const hx = hole.x - L / 2
    const hy = W / 2 - hole.y
    const standoff = cylinder({ radius: od / 2, height: sh, segments: 32 })
    result = union(result, translate([hx, hy, pt / 2 + sh / 2], standoff))
  }

  // Subtract screw holes through plate + standoff
  for (const hole of holes) {
    const hx = hole.x - L / 2
    const hy = W / 2 - hole.y
    const holeHeight = pt + sh + 2  // +1mm each side for clean boolean
    const screwHole = cylinder({ radius: sd / 2, height: holeHeight, segments: 32 })
    // center Z = sh/2 puts hole from -pt/2-1 to pt/2+sh+1 (through everything)
    result = subtract(result, translate([hx, hy, sh / 2], screwHole))
  }

  return result
}

function concatBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  const totalLength = buffers.reduce((sum, b) => sum + b.byteLength, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const buf of buffers) {
    result.set(new Uint8Array(buf), offset)
    offset += buf.byteLength
  }
  return result.buffer
}

self.onmessage = (e: MessageEvent<PcbStandoffParams & { __id?: number }>) => {
  const { __id, ...params } = e.data
  try {
    if (params.screwHoleDia >= params.standoffOD) {
      self.postMessage({ error: 'Screw hole must be smaller than standoff outer diameter', __id })
      return
    }
    const plate = generatePlate(params)
    const buffer = concatBuffers(serialize({ binary: true }, plate) as ArrayBuffer[])
    self.postMessage({ buffer, __id }, [buffer])
  } catch (err) {
    self.postMessage({ error: (err as Error).message, __id })
  }
}
