// apps/frontend-kiosk/src/workers/box-generator.worker.ts
import modeling from '@jscad/modeling'
import stlSerializer from '@jscad/stl-serializer'

const { primitives, booleans, transforms } = modeling
const { roundedCuboid, cuboid } = primitives
const { subtract, union } = booleans
const { translate, rotateX } = transforms
const { serialize } = stlSerializer

export interface BoxParams {
  length: number       // interior length mm
  width: number        // interior width mm
  height: number       // interior height mm
  lipHeight: number    // lid lip height mm
  cornerRadius: number // corner fillet radius mm
  clearance: number    // snap-fit clearance mm
  wallThickness: number // wall thickness in mm
}

function generateBody(p: BoxParams) {
  const { length: L, width: W, height: H, cornerRadius: r, wallThickness: wt } = p
  // Outer shell — rounded cuboid
  const outer = roundedCuboid({ size: [L + 2 * wt, W + 2 * wt, H], roundRadius: r, segments: 16 })
  // Inner void — open top, floor = wallThickness
  const inner = cuboid({ size: [L, W, H - wt] })
  // JSCAD centers at origin. Inner center Z = wt/2 (floor sits at -H/2 + wt)
  const innerPositioned = translate([0, 0, wt / 2], inner)
  return subtract(outer, innerPositioned)
}

function generateLid(p: BoxParams) {
  const { length: L, width: W, lipHeight, clearance, cornerRadius: r, wallThickness: wt } = p
  // Flat plate — same outer footprint as box
  // roundedCuboid requires roundRadius < z/2; plate Z = wt, so clamp to avoid JSCAD crash
  const plateRadius = Math.min(r, wt / 2 - 0.01)
  const plate = roundedCuboid({ size: [L + 2 * wt, W + 2 * wt, wt], roundRadius: plateRadius, segments: 16 })
  // Lip hangs down from underside of plate; clearance on each side
  const lip = cuboid({ size: [L - clearance, W - clearance, lipHeight] })
  // Plate center at Z=0, underside at -wt/2. Lip center = -wt/2 - lipHeight/2
  const lipPositioned = translate([0, 0, -wt / 2 - lipHeight / 2], lip)
  return union(plate, lipPositioned)
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

self.onmessage = (e: MessageEvent<BoxParams & { __id?: number }>) => {
  const { __id, ...params } = e.data
  try {
    if (params.cornerRadius <= 0 ||
        params.cornerRadius >= (params.length + 2 * params.wallThickness) / 2 ||
        params.cornerRadius >= (params.width + 2 * params.wallThickness) / 2 ||
        params.cornerRadius >= params.height / 2) {
      self.postMessage({ error: 'Corner radius too large for box dimensions', __id })
      return
    }
    const body = generateBody(params)
    const lid = generateLid(params)
    const bodyBuffer = concatBuffers(serialize({ binary: true }, body) as ArrayBuffer[])
    const lidBuffer = concatBuffers(serialize({ binary: true }, lid) as ArrayBuffer[])

    // Combined: both parts positioned flat on the print bed (Z=0), side by side.
    // Body: translate up so its bottom face sits at Z=0.
    const bodyForPrint = translate([0, 0, params.height / 2], body)
    // Lid: flip upside-down (plate on bed, lip pointing up), then move beside the body.
    const lidFlipped = rotateX(Math.PI, lid)
    const lidForPrint = translate(
      [params.length + 2 * params.wallThickness + 10, 0, params.wallThickness / 2],
      lidFlipped
    )
    const combinedBuffer = concatBuffers(
      serialize({ binary: true }, bodyForPrint, lidForPrint) as ArrayBuffer[]
    )

    self.postMessage({ bodyBuffer, lidBuffer, combinedBuffer, __id }, [bodyBuffer, lidBuffer, combinedBuffer])
  } catch (err) {
    self.postMessage({ error: (err as Error).message, __id })
  }
}
