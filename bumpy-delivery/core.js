// Shared helpers for every module: libraries, toon materials, small math.
import * as THREE from './vendor/three.module.min.js'
import * as pl from './vendor/planck.mjs'

export { THREE, pl }
export const V = (x, y) => new pl.Vec2(x, y)
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const lerp = (a, b, k) => a + (b - a) * k
export const rnd = (a, b) => a + Math.random() * (b - a)
export const pick = (list) => list[Math.floor(Math.random() * list.length)]

const toonRamp = (() => { const d = new Uint8Array([95, 175, 255]); const tx = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); tx.minFilter = tx.magFilter = THREE.NearestFilter; tx.needsUpdate = true; return tx })()
const matCache = new Map()
export function mat(color, extra) {
  if (extra && extra.map) return new THREE.MeshToonMaterial({ color, gradientMap: toonRamp, ...extra })
  const key = color + (extra ? JSON.stringify(extra) : '')
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshToonMaterial({ color, gradientMap: toonRamp, ...extra }))
  return matCache.get(key)
}
export const mesh = (geo, color, extra) => new THREE.Mesh(geo, mat(color, extra))
export const box = (w, h, d, color) => mesh(new THREE.BoxGeometry(w, h, d), color)
export const ball = (r, color, seg = 14) => mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg - 4)), color)
export const cyl = (rt, rb, h, color, seg = 16) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), color)
export function at(obj, x, y, z = 0) { obj.position.set(x, y, z); return obj }

// A label painted on a canvas, for signs.
export function signTexture(text, bg, fg, w = 512, h = 128) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const g = c.getContext('2d')
  g.fillStyle = bg; g.fillRect(0, 0, w, h)
  g.font = `900 ${Math.round(h * 0.62)}px Arial Rounded MT Bold, Arial, sans-serif`
  g.textAlign = 'center'; g.textBaseline = 'middle'
  g.lineWidth = h * 0.1; g.strokeStyle = '#2b1d3a'; g.strokeText(text, w / 2, h * 0.54)
  g.fillStyle = fg; g.fillText(text, w / 2, h * 0.54)
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace
  return tx
}

// A toy animal: round body, head, ears. kind: 'bear' | 'dog' | 'bunny' | 'cat'.
export function critter(kind, color, opts = {}) {
  const g = new THREE.Group()
  const body = ball(0.42, opts.shirt ?? color); body.scale.set(1, 1.1, 0.9); body.position.y = 0.45; g.add(body)
  const head = ball(0.36, color); head.position.y = 1.12; g.add(head)
  const snout = ball(0.15, opts.snout ?? 0xfff1dc); snout.scale.set(1.2, 0.85, 0.9); snout.position.set(0, 1.04, 0.3); g.add(snout)
  const nose = ball(0.06, 0x2b1d3a, 8); nose.position.set(0, 1.09, 0.44); g.add(nose)
  for (const s of [-1, 1]) {
    const eye = ball(0.05, 0x2b1d3a, 8); eye.position.set(s * 0.14, 1.22, 0.31); g.add(eye)
    let ear
    if (kind === 'bunny') { ear = ball(0.1, color); ear.scale.set(0.9, 3.2, 0.7); ear.position.set(s * 0.15, 1.6, 0) }
    else if (kind === 'cat') { ear = mesh(new THREE.ConeGeometry(0.12, 0.24, 4), color); ear.position.set(s * 0.22, 1.45, 0) }
    else if (kind === 'dog') { ear = ball(0.13, opts.ear ?? 0x8a5a3c); ear.scale.set(0.8, 1.6, 0.6); ear.position.set(s * 0.33, 1.08, 0); ear.rotation.z = s * 0.3 }
    else { ear = ball(0.12, color); ear.position.set(s * 0.27, 1.42, 0) }
    g.add(ear)
  }
  if (opts.hat === 'chef') { const h = cyl(0.26, 0.22, 0.34, 0xffffff); h.position.y = 1.55; g.add(h); const puff = ball(0.3, 0xffffff); puff.scale.y = 0.6; puff.position.y = 1.78; g.add(puff) }
  if (opts.hat === 'veil') { const v = mesh(new THREE.ConeGeometry(0.42, 0.9, 16, 1, true), 0xffffff, { transparent: true, opacity: 0.75, side: THREE.DoubleSide }); v.position.set(0, 1.18, -0.08); g.add(v); const f = ball(0.08, 0xff8fb1, 8); f.position.set(0.18, 1.42, 0.12); g.add(f) }
  if (opts.bow) { const b = box(0.3, 0.12, 0.08, opts.bow); b.position.set(0, 0.86, 0.36); g.add(b) }
  if (opts.cap) { const c = cyl(0.33, 0.35, 0.14, opts.cap); c.position.y = 1.42; g.add(c); const v = box(0.32, 0.04, 0.24, opts.cap); v.position.set(0, 1.37, 0.3); g.add(v) }
  return g
}
