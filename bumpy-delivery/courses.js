// Ten roads from the bakery to the wedding. A road is ground lines (planck chains) plus obstacles.
import { THREE, pl, V, mat, mesh, box, ball, cyl, at, rnd, pick, signTexture, critter } from './core.js'

export const LIMIT = 300 // seconds until the wedding

export const THEMES = {
  town: { skyTop: 0x5fbfff, skyBottom: 0xd9f3ff, dirt: 0xc98a55, top: 0x7ed957, far: 0x9fd9a0, decor: ['house', 'tree', 'lamp', 'tree'] },
  country: { skyTop: 0x6fc8ff, skyBottom: 0xfff1c9, dirt: 0xa8703f, top: 0x6cc644, far: 0x8fcf7a, decor: ['tree', 'hay', 'fence', 'barn', 'tree'] },
  mountain: { skyTop: 0x7aa8ff, skyBottom: 0xe9e4ff, dirt: 0x8d8a99, top: 0x9bd66b, far: 0x9aa0c8, decor: ['pine', 'rock', 'pine'] },
  snow: { skyTop: 0x9fcfff, skyBottom: 0xffffff, dirt: 0x9fb6cc, top: 0xffffff, far: 0xc9dcf0, decor: ['snowpine', 'snowpine', 'rock'] },
  city: { skyTop: 0xff9f6b, skyBottom: 0xffe4c4, dirt: 0x7c8294, top: 0x4a4f5e, far: 0xc98aa0, decor: ['tower', 'lamp', 'flower', 'tower'] },
}

class Builder {
  constructor() {
    this.chains = []; this.objs = []; this.x = -16; this.y = 0
    this.cur = { pts: [[-16, 9, true], [-16, 0]], ice: false }; this.chains.push(this.cur); this.flat(18)
  }
  newChain(ice = false) { this.cur = { pts: [[this.x, this.y]], ice }; this.chains.push(this.cur) }
  to(x, y) { this.cur.pts.push([x, y]); this.x = x; this.y = y; return this }
  flat(L) { return this.to(this.x + L, this.y) }
  slope(L, dy, n = 10) { const x0 = this.x, y0 = this.y; for (let i = 1; i <= n; i++) { const s = i / n; this.to(x0 + L * s, y0 + dy * (s * s * (3 - 2 * s))) } return this }
  hill(L, h, n = 14) { const x0 = this.x, y0 = this.y; for (let i = 1; i <= n; i++) this.to(x0 + (L * i) / n, y0 + (h * (1 - Math.cos((2 * Math.PI * i) / n))) / 2); return this }
  bumps(n, w = 2.2, h = 0.35) { for (let i = 0; i < n; i++) this.hill(w, h, 6); return this }
  ramp(L, h, n = 8) { const x0 = this.x, y0 = this.y; for (let i = 1; i <= n; i++) { const s = i / n; this.to(x0 + L * s, y0 + h * s * s) } return this }
  // A gap ends the ground; the far side starts with a wall face so a short jump hits it.
  // The landing edge is a slanted lip, so a jump that falls just short rolls up instead of snagging a wheel.
  gap(L, dy = 0) { this.x += L; this.y += dy; this.cur = { pts: [[this.x - 1, this.y - 8, true], [this.x - 1, this.y - 1.3, true], [this.x - 0.35, this.y - 0.25, true], [this.x, this.y]], ice: false }; this.chains.push(this.cur); return this }
  stairs(n, w, dh) { for (let i = 0; i < n; i++) { this.to(this.x, this.y + dh); this.flat(w) } return this }
  ice(L, dy) { this.newChain(true); this.slope(L, dy); this.newChain(); return this }
  obj(kind, o = {}) { this.objs.push({ kind, x: this.x, y: this.y, ...o }); return this }
  rope(L, dy = 0) { this.obj('rope', { L, dy }); return this.gap(L, dy) }
  collapse(L) { this.obj('collapse', { L }); return this.gap(L) }
  lift(L, h) { this.obj('lift', { L, h }); return this.gap(L, h) }
  finish() { this.finishX = this.x; this.obj('finish'); this.flat(26); this.cur.pts.push([this.x, this.y + 9, true]); return this }
}

// Each road is short (15-30 s) and mixes two or three obstacles.
export const COURSES = [
  { theme: 'town', build: (b) => b.obj('bakery', { x: -9 }).flat(4).slope(16, -3.2).flat(3).ramp(7, 1.6).gap(5.5, -1).slope(11, -2).flat(3).obj('boxes', { n: 6 }).flat(9).bumps(3).flat(5).finish() },
  { theme: 'town', build: (b) => b.flat(4).bumps(5, 2.4, 0.38).flat(4).obj('seesaw', { L: 7 }).flat(9).hill(14, 2.6).flat(4).stairs(4, 2.4, -0.42).flat(5).finish() },
  { theme: 'town', build: (b) => b.flat(4).obj('tunnel', { L: 13, h: 2.1 }).bumps(5, 2.6, 0.32).flat(3).ramp(6, 1.3).gap(6, -0.6).flat(3).obj('boxes', { n: 10 }).flat(8).obj('fan', { L: 12, dir: -1 }).flat(13).finish() },
  { theme: 'country', build: (b) => b.flat(4).hill(16, 3).hill(12, 2).flat(4).rope(15).flat(5).hill(10, 1.4).flat(4).finish() },
  { theme: 'country', build: (b) => b.flat(4).obj('barrels', { at: 24, h: 5 }).slope(24, 5).flat(6).obj('tramp').flat(2.4).gap(4.5, 0).slope(10, -3.2).bumps(3).flat(4).finish() },
  { theme: 'mountain', build: (b) => b.obj('brokenBridge', { x: 12 }).flat(6).slope(12, 2.6).flat(3).lift(4.8, 4.6).flat(8).obj('wrecker', { dx: 2 }).flat(10).slope(16, -5).flat(5).finish() },
  { theme: 'snow', build: (b) => b.flat(5).ice(18, -4).flat(3).ramp(6, 1.1).gap(7, -0.8).slope(11, -3).obj('rocks').bumps(4, 2.2, 0.3).flat(5).finish() },
  { theme: 'mountain', build: (b) => b.flat(5).collapse(16).flat(5).obj('windmill', { dx: 4 }).flat(10).hill(11, 2.6).obj('barrels', { at: 0, h: 0, back: true }).flat(4).finish() },
  { theme: 'city', build: (b) => b.flat(4).obj('fan', { L: 12, dir: -1 }).flat(13).obj('seesaw', { L: 8 }).flat(11).obj('seesaw', { L: 8 }).flat(11).stairs(5, 2.2, -0.4).flat(3).obj('tunnel', { L: 10, h: 1.95 }).bumps(4, 2.4, 0.5).flat(4).finish() },
  { theme: 'city', build: (b) => b.flat(4).slope(18, -4).flat(2).ramp(7, 2.1).gap(8, -2.4).obj('cars', { back: 8 }).flat(3).obj('boxes', { n: 10 }).flat(7).bumps(4).flat(3).obj('wrecker', { dx: 2 }).flat(10).finish().obj('wedding', { x: b.finishX + 9 }) },
]

// ---------------------------------------------------------------- building
function groundMesh(pts, bottom, colorDirt, colorTop, ice) {
  const g = new THREE.Group()
  const shape = new THREE.Shape()
  shape.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1])
  shape.lineTo(pts[pts.length - 1][0], bottom); shape.lineTo(pts[0][0], bottom)
  const dirt = new THREE.ExtrudeGeometry(shape, { depth: 4, bevelEnabled: false }); dirt.translate(0, 0, -2)
  g.add(mesh(dirt, colorDirt))
  const surf = pts.filter((p) => !p[2])
  const strip = new THREE.Shape()
  strip.moveTo(surf[0][0], surf[0][1] + 0.03)
  for (let i = 1; i < surf.length; i++) strip.lineTo(surf[i][0], surf[i][1] + 0.03)
  for (let i = surf.length - 1; i >= 0; i--) strip.lineTo(surf[i][0], surf[i][1] - 0.3)
  const top = new THREE.ExtrudeGeometry(strip, { depth: 4.1, bevelEnabled: false }); top.translate(0, 0, -2.05)
  g.add(mesh(top, ice ? 0xc8f1ff : colorTop))
  // Front face: two darker layers and pebbles so the ground is not one flat brown.
  const dark = new THREE.Color(colorDirt).multiplyScalar(0.82).getHex(), darker = new THREE.Color(colorDirt).multiplyScalar(0.68).getHex()
  for (const [d0, d1, c] of [[1.3, 2.1, dark], [3.4, 4.6, darker]]) {
    const band = new THREE.Shape()
    band.moveTo(surf[0][0], surf[0][1] - d0)
    for (let i = 1; i < surf.length; i++) band.lineTo(surf[i][0], surf[i][1] - d0 - Math.sin(surf[i][0] * 0.4) * 0.15)
    for (let i = surf.length - 1; i >= 0; i--) band.lineTo(surf[i][0], surf[i][1] - d1 - Math.sin(surf[i][0] * 0.3) * 0.2)
    const m = mesh(new THREE.ShapeGeometry(band), c); m.position.z = 2.01; g.add(m)
  }
  const x0 = surf[0][0], x1 = surf[surf.length - 1][0]
  for (let x = x0 + 0.5; x < x1 - 0.5; x += rnd(1.2, 2.6)) {
    let y = null
    for (let i = 1; i < surf.length; i++) if (x >= surf[i - 1][0] && x <= surf[i][0]) { y = surf[i - 1][1] + ((surf[i][1] - surf[i - 1][1]) * (x - surf[i - 1][0])) / Math.max(0.001, surf[i][0] - surf[i - 1][0]); break }
    if (y === null) continue
    const p = mesh(new THREE.CircleGeometry(rnd(0.1, 0.24), 7), pick([dark, darker, 0xe8d2b0])); p.scale.y = 0.7; p.position.set(x, y - rnd(0.6, 5), 2.02); g.add(p)
  }
  return g
}

const WOOD = 0xb5793f, DARK = 0x2b1d3a

function decorPiece(kind, theme) {
  const g = new THREE.Group()
  if (kind === 'tree' || kind === 'pine' || kind === 'snowpine') {
    g.add(at(cyl(0.12, 0.16, 1.2, 0x8a5a3c, 8), 0, 0.6))
    if (kind === 'tree') { const c = ball(rnd(0.8, 1.15), pick([0x58c25a, 0x6fd16b, 0x4aa84f])); g.add(at(c, 0, 1.75)) }
    else for (let i = 0; i < 3; i++) g.add(at(mesh(new THREE.ConeGeometry(0.95 - i * 0.25, 0.9, 8), kind === 'snowpine' && i === 2 ? 0xffffff : kind === 'snowpine' ? 0x4f8a6a : 0x3f8f5a), 0, 1.4 + i * 0.55))
  } else if (kind === 'house') {
    const c = pick([0xffb3c1, 0xffe08a, 0xa8e6ff, 0xc9f2b0])
    g.add(at(box(2.2, 1.8, 1.8, c), 0, 0.9))
    const roof = mesh(new THREE.ConeGeometry(1.75, 1.0, 4), pick([0xe8503a, 0x5b6bd5, 0x8a5a3c])); roof.rotation.y = Math.PI / 4; g.add(at(roof, 0, 2.3))
    g.add(at(box(0.5, 0.5, 0.05, 0xfff8dc), -0.5, 1.1, 0.91)); g.add(at(box(0.45, 0.85, 0.05, 0x8a5a3c), 0.5, 0.43, 0.91))
  } else if (kind === 'lamp') {
    g.add(at(cyl(0.05, 0.06, 2.4, 0x3a3a4a, 6), 0, 1.2)); g.add(at(ball(0.18, 0xfff3a8), 0, 2.45))
  } else if (kind === 'hay') {
    const h = cyl(0.5, 0.5, 0.8, 0xf2cf5b, 14); h.rotation.x = Math.PI / 2; g.add(at(h, 0, 0.5))
  } else if (kind === 'fence') {
    for (let i = 0; i < 4; i++) g.add(at(box(0.1, 0.7, 0.1, 0xfff1dc), i * 0.6, 0.35))
    g.add(at(box(2, 0.1, 0.06, 0xfff1dc), 0.9, 0.5)); g.add(at(box(2, 0.1, 0.06, 0xfff1dc), 0.9, 0.25))
  } else if (kind === 'barn') {
    g.add(at(box(2.6, 2, 2, 0xd9423a), 0, 1)); const r = mesh(new THREE.ConeGeometry(2, 1, 4), 0x7a3a2a); r.rotation.y = Math.PI / 4; g.add(at(r, 0, 2.5))
    g.add(at(box(1, 1.2, 0.05, 0xffffff), 0, 0.6, 1.01))
  } else if (kind === 'rock') {
    const r = mesh(new THREE.DodecahedronGeometry(rnd(0.4, 0.8), 0), theme === 'snow' ? 0xdfe9f5 : 0x9a96a8); r.scale.y = 0.7; g.add(at(r, 0, 0.3))
  } else if (kind === 'tower') {
    const h = rnd(4, 9), c = pick([0xf4d6c6, 0xd6c6f4, 0xc6e4f4, 0xf4ecc6])
    g.add(at(box(2.4, h, 2, c), 0, h / 2))
    for (let y = 1; y < h - 0.5; y += 1.2) for (const dx of [-0.6, 0.6]) g.add(at(box(0.5, 0.6, 0.05, 0xfff8dc), dx, y, 1.01))
  } else if (kind === 'flower') {
    for (let i = 0; i < 3; i++) { g.add(at(cyl(0.02, 0.02, 0.4, 0x3a8a2a, 4), i * 0.25, 0.2)); g.add(at(ball(0.1, pick([0xff4f6d, 0xffd23f, 0xff8fb1]), 8), i * 0.25, 0.42)) }
  }
  return g
}

function farHills(theme, x0, x1) {
  const g = new THREE.Group()
  for (const [z, scale, color] of [[-34, 1, theme.far], [-60, 1.8, new THREE.Color(theme.far).lerp(new THREE.Color(theme.skyBottom), 0.45).getHex()]]) {
    const shape = new THREE.Shape(); shape.moveTo(x0 - 60, -30)
    for (let x = x0 - 60; x <= x1 + 60; x += 6) shape.lineTo(x, 4 * scale + Math.sin(x * 0.07 + z) * 3 * scale + Math.sin(x * 0.023) * 4 * scale)
    shape.lineTo(x1 + 60, -30)
    const m = mesh(new THREE.ShapeGeometry(shape), color); m.position.z = z; g.add(m)
  }
  return g
}

export function skyTexture(theme) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256
  const g = c.getContext('2d'), grad = g.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#' + new THREE.Color(theme.skyTop).getHexString()); grad.addColorStop(1, '#' + new THREE.Color(theme.skyBottom).getHexString())
  g.fillStyle = grad; g.fillRect(0, 0, 4, 256)
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx
}

// Builds road `index` into `world` and returns everything the game needs to run it.
export function buildCourse(world, index) {
  const def = COURSES[index], theme = THEMES[def.theme]
  const b = new Builder(); def.build(b)
  const group = new THREE.Group()
  let minY = Infinity, maxX = -Infinity
  for (const c of b.chains) for (const [x, y, wall] of c.pts) { if (!wall) minY = Math.min(minY, y); maxX = Math.max(maxX, x) }
  const ground = world.createBody({ type: 'static' })
  ground.setUserData({ ground: true })
  for (const c of b.chains) {
    if (c.pts.length < 2) continue
    ground.createFixture(new pl.Chain(c.pts.map(([x, y]) => V(x, y)), false), { friction: c.ice ? 0.03 : 0.9 })
    group.add(groundMesh(c.pts, minY - 30, theme.dirt, theme.top, c.ice))
  }
  const groundY = (x) => {
    for (const c of b.chains) {
      const p = c.pts
      for (let i = 1; i < p.length; i++) if (x >= p[i - 1][0] && x <= p[i][0] && p[i][0] > p[i - 1][0]) { const k = (x - p[i - 1][0]) / (p[i][0] - p[i - 1][0]); return p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k }
    }
    return null
  }
  // Scenery behind the road: a near row, a meadow band with a far row on it, and fans by the road.
  for (let x = -14; x < maxX; x += rnd(2.4, 4.6)) {
    const y = groundY(x); if (y === null) continue
    const d = decorPiece(pick(theme.decor), def.theme); d.position.set(x, y, rnd(-5.5, -3)); d.rotation.y = rnd(-0.3, 0.3); group.add(d)
  }
  const meadowY = (x) => { let n = 0, sum = 0; for (let k = -8; k <= 8; k += 2) { const y = groundY(x + k); if (y !== null) { sum += y; n++ } } return n ? sum / n : null }
  const meadow = new THREE.Shape(), mx0 = -30, mx1 = maxX + 30, base = minY - 12
  meadow.moveTo(mx0, base)
  let lastY = groundY(-6) ?? 0
  for (let x = mx0; x <= mx1; x += 2) { const y = meadowY(x); if (y !== null) lastY = y; meadow.lineTo(x, lastY + 0.6 + Math.sin(x * 0.15) * 0.5) }
  meadow.lineTo(mx1, base)
  const mcol = new THREE.Color(theme.top).lerp(new THREE.Color(theme.far), 0.45).getHex()
  const mm = mesh(new THREE.ShapeGeometry(meadow), mcol); mm.position.z = -9; group.add(mm)
  lastY = groundY(-6) ?? 0
  for (let x = -24; x < maxX + 20; x += rnd(2.2, 4.2)) {
    const y = meadowY(x); if (y !== null) lastY = y
    const d = decorPiece(pick(theme.decor), def.theme); d.scale.setScalar(rnd(1.2, 1.6)); d.position.set(x, lastY + 0.4 + Math.sin(x * 0.15) * 0.5, rnd(-12, -9.5)); d.rotation.y = rnd(-0.4, 0.4); group.add(d)
  }
  const fans = []
  for (let x = 4; x < maxX - 4; x += rnd(9, 15)) {
    const y = groundY(x); if (y === null || groundY(x - 1) === null || groundY(x + 1) === null) continue
    const kind = pick(['bear', 'dog', 'bunny', 'cat']), col = pick([0xffe0b0, 0xc98a55, 0xffffff, 0xffc0a0, 0xbfa0ff, 0x9a96a8])
    const f = critter(kind, col, { shirt: pick([0xff4f6d, 0x4fc3ff, 0xffd23f, 0x2ee6a6, 0xff8fb1]) }); f.scale.setScalar(0.55)
    f.position.set(x, y - 0.02, -2.6); f.rotation.y = rnd(-0.5, 0.5); group.add(f)
    const flag = new THREE.Group(); flag.add(at(cyl(0.02, 0.02, 0.9, 0x8a5a3c, 4), 0, 0.45)); flag.add(at(box(0.36, 0.24, 0.02, pick([0xff4f6d, 0xffd23f, 0x4fc3ff])), 0.18, 0.78)); flag.position.set(0.45, 0.9, 0); f.add(flag)
    fans.push({ g: f, flag, y: y - 0.02, t: rnd(0, 6) })
  }
  for (let x = -10; x < maxX; x += rnd(9, 16)) {
    const y = groundY(x); if (y === null) continue
    const d = decorPiece(def.theme === 'city' ? 'flower' : def.theme === 'snow' ? 'rock' : 'flower', def.theme); d.position.set(x, y - 0.05, rnd(2.3, 3.2)); d.scale.setScalar(0.7); group.add(d)
  }
  group.add(farHills(theme, -16, maxX))
  for (let i = 0; i < 8; i++) { const c = new THREE.Group(); for (let k = 0; k < 4; k++) c.add(at(ball(rnd(0.9, 1.6), 0xffffff), k * 1.3, rnd(-0.3, 0.4))); c.position.set(rnd(-10, maxX), rnd(9, 16), rnd(-28, -18)); group.add(c) }

  const course = { index, theme, themeName: def.theme, group, groundY, finishX: b.finishX, startX: -6, startY: groundY(-6), killY: minY - 5, objs: [], endX: maxX }
  for (const o of b.objs) { const made = makeObject(world, o, course); if (made) course.objs.push(made) }
  // Fans hop and wave when the truck goes by.
  if (fans.length) course.objs.push({ update(dt, ctx) {
    const tx = ctx.truckX()
    for (const f of fans) {
      const near = Math.abs(f.g.position.x - tx) < 7
      f.t += dt * (near ? 9 : 2)
      f.g.position.y = f.y + (near ? Math.abs(Math.sin(f.t)) * 0.35 : 0)
      f.flag.rotation.z = Math.sin(f.t * (near ? 1.3 : 0.6)) * (near ? 0.7 : 0.2)
    }
  } })
  return course
}

// ---------------------------------------------------------------- obstacles
function dyn(world, x, y, angle = 0) { return world.createBody({ type: 'dynamic', position: V(x, y), angle }) }
function linkMesh(bodyRef, m) { return { body: bodyRef, mesh: m } }
function syncLinks(links) { for (const l of links) { const p = l.body.getPosition(); l.mesh.position.set(p.x, p.y, l.mesh.position.z); l.mesh.rotation.z = l.body.getAngle() } }

function makeObject(world, o, course) {
  const G = course.group
  const add = (m) => { G.add(m); return m }
  if (o.kind === 'boxes') {
    const links = [], s = 0.55
    let k = 0
    for (let row = 0; k < o.n; row++) for (let i = 0; i < 4 - row && k < o.n; i++, k++) {
      const bx = dyn(world, o.x + i * (s + 0.02) + row * s * 0.5, o.y + s / 2 + row * s)
      bx.createFixture(new pl.Box(s / 2, s / 2), { density: 0.25, friction: 0.6 })
      bx.setUserData({ prop: true })
      const m = add(box(s, s, s, pick([0xd9a066, 0xc98a55, 0xe8b878])))
      m.add(at(box(s + 0.01, 0.07, s + 0.01, 0x8a5a3c), 0, 0)); links.push(linkMesh(bx, m))
    }
    return { span: [o.x - 1, o.x + 3], update: () => syncLinks(links) }
  }
  if (o.kind === 'seesaw') {
    const cx = o.x + o.L / 2, cy = o.y + 0.55
    const pivot = world.createBody({ type: 'static', position: V(cx, cy) })
    const plank = dyn(world, cx, cy, 0.22)
    plank.createFixture(new pl.Box(o.L / 2, 0.11), { density: 0.9, friction: 0.9 })
    plank.setUserData({ prop: true })
    world.createJoint(new pl.RevoluteJoint({ enableLimit: true, lowerAngle: -0.3, upperAngle: 0.3 }, pivot, plank, V(cx, cy)))
    const m = add(box(o.L, 0.22, 2.2, WOOD)); m.add(at(box(o.L, 0.04, 2.21, 0xffd23f), 0, 0.09))
    const tri = add(mesh(new THREE.ConeGeometry(0.6, 0.7, 3), 0x8a8fa8)); tri.position.set(cx, cy - 0.3, 0)
    const links = [linkMesh(plank, m)]
    return { span: [o.x, o.x + o.L], update: () => syncLinks(links) }
  }
  if (o.kind === 'rope') {
    const x0 = o.x, y0 = o.y, x1 = o.x + o.L, y1 = o.y + o.dy, n = Math.round(o.L / 0.75), w = o.L / n
    const anchor = world.createBody({ type: 'static' })
    let prev = anchor
    const links = []
    for (let i = 0; i < n; i++) {
      const px = x0 + w * (i + 0.5), py = y0 + (y1 - y0) * ((i + 0.5) / n) - 0.08
      const p = dyn(world, px, py)
      p.createFixture(new pl.Box(w / 2 - 0.02, 0.08), { density: 1.2, friction: 0.9 })
      p.setUserData({ prop: true })
      world.createJoint(new pl.RevoluteJoint({}, prev, p, V(x0 + w * i, py + 0.0)))
      prev = p
      const m = add(box(w - 0.06, 0.16, 2.2, i % 2 ? 0xc98a55 : WOOD)); links.push(linkMesh(p, m))
    }
    world.createJoint(new pl.RevoluteJoint({}, prev, anchor, V(x1, y1 - 0.08)))
    for (const [px, py] of [[x0, y0], [x1, y1]]) for (const z of [-1.1, 1.1]) add(at(cyl(0.1, 0.12, 1.6, 0x8a5a3c, 8), px, py + 0.5, z))
    return { update: () => syncLinks(links) }
  }
  if (o.kind === 'collapse') {
    const n = Math.round(o.L / 1.0), w = o.L / n, planks = []
    for (let i = 0; i < n; i++) {
      const p = world.createBody({ type: 'static', position: V(o.x + w * (i + 0.5), o.y - 0.1) })
      const state = { touched: false, t: 0, body: p, fell: false }
      p.createFixture(new pl.Box(w / 2 - 0.03, 0.1), { density: 1, friction: 0.9, userData: { plank: state } })
      p.setUserData({ prop: true })
      const m = add(box(w - 0.06, 0.2, 2.2, i % 2 ? 0xa86a3a : 0x9a5f35)); m.position.set(o.x + w * (i + 0.5), o.y - 0.1, 0)
      m.add(at(box(0.05, 0.21, 2.0, 0x5a3a2a), rnd(-0.2, 0.2), 0)); state.mesh = m
      planks.push(state)
    }
    return {
      update(dt, ctx) {
        for (const s of planks) {
          if (s.touched && !s.fell) { s.t += dt; if (s.t > 0.3) { s.fell = true; s.body.setType('dynamic'); s.body.setAngularVelocity(rnd(-2, 2)); ctx.sound('wood', 0.6) } }
          if (s.fell) { const p = s.body.getPosition(); s.mesh.position.set(p.x, p.y, 0); s.mesh.rotation.z = s.body.getAngle() }
        }
      },
    }
  }
  if (o.kind === 'lift') {
    const cx = o.x + o.L / 2, low = o.y - 0.16, high = o.y + o.h - 0.16
    const p = world.createBody({ type: 'kinematic', position: V(cx, low) })
    p.createFixture(new pl.Box(o.L / 2 - 0.05, 0.16), { friction: 1 })
    p.setUserData({ prop: true })
    const m = add(box(o.L - 0.1, 0.32, 2.4, 0xffd23f)); for (let i = 0; i < 5; i++) m.add(at(box(0.3, 0.33, 2.41, DARK), -o.L / 2 + 0.4 + i * 0.8, 0))
    for (const z of [-1.3, 1.3]) for (const dx of [-o.L / 2, o.L / 2]) add(at(box(0.14, o.h + 3, 0.14, 0x8a8fa8), cx + dx, o.y + o.h / 2 - 1.2, z))
    // Wait at the bottom, rise, wait at the top, come back down.
    const cycle = [2.6, 2.4, 1.6, 2.2]
    let phase = 0, t = 0
    return {
      lift: { x0: o.x, x1: o.x + o.L, body: p, low, high },
      update(dt, ctx) {
        t += dt
        if (t > cycle[phase]) { t = 0; phase = (phase + 1) % 4; if (phase === 1 || phase === 3) ctx.sound('creak', 0.5) }
        const y = p.getPosition().y
        const want = phase === 0 ? low : phase === 1 ? low + (high - low) * Math.min(1, t / cycle[1]) : phase === 2 ? high : high - (high - low) * Math.min(1, t / cycle[3])
        p.setLinearVelocity(V(0, (want - y) / Math.max(dt, 1 / 60)))
        m.position.set(cx, y, 0)
      },
      // 0 drive, 1 slow down, 2 stop. Before the lift: come in slowly while it waits at the bottom. On it: stop until the top.
      botWait(x) {
        const y = p.getPosition().y
        if (x > o.x - 9 && x < o.x - 4) return 1
        if (x >= o.x - 4 && x < o.x + 0.6) return phase === 0 && cycle[0] - t > (o.x + 0.6 - x) / 2.5 + 0.3 ? 1 : 2
        if (x >= o.x + 0.6 && x < o.x + o.L - 0.6) return phase === 2 && Math.abs(y - high) < 0.05 ? 0 : 2
        return 0
      },
    }
  }
  if (o.kind === 'wrecker') {
    const ax = o.x + (o.dx || 0), ay = o.y + 7.2, R = 5.4
    const anchor = world.createBody({ type: 'static', position: V(ax, ay) })
    const a0 = 1.0
    const ballB = dyn(world, ax + Math.sin(a0) * R, ay - Math.cos(a0) * R)
    ballB.createFixture(new pl.Circle(0.6), { density: 2.2, friction: 0.3, restitution: 0.2 })
    ballB.setUserData({ prop: true })
    world.createJoint(new pl.DistanceJoint({ frequencyHz: 0, dampingRatio: 0 }, anchor, ballB, V(ax, ay), ballB.getPosition()))
    const bm = add(ball(0.6, 0x4a4f5e, 16)); bm.add(at(box(0.2, 0.2, 0.2, 0x2b1d3a), 0, 0.62))
    const chain = add(cyl(0.05, 0.05, 1, 0x2b1d3a, 6))
    add(at(box(0.5, 0.5, 0.5, 0x2b1d3a), ax, ay, 0))
    add(at(box(0.35, 8.5, 0.35, 0xffb627), ax - 2.4, ay - 4.1, -1.6)); add(at(box(3, 0.35, 0.35, 0xffb627), ax - 1, ay + 0.1, -1.6))
    return {
      update() {
        const p = ballB.getPosition(); bm.position.set(p.x, p.y, 0)
        const mx = (p.x + ax) / 2, my = (p.y + ay) / 2, len = Math.hypot(p.x - ax, p.y - ay)
        chain.position.set(mx, my, 0); chain.scale.y = len; chain.rotation.z = Math.atan2(p.y - ay, p.x - ax) + Math.PI / 2
        // Keep it swinging forever.
        const v = ballB.getLinearVelocity(); const sp = Math.hypot(v.x, v.y)
        if (sp < 6.5 && p.y < ay - R * 0.9) ballB.applyForceToCenter(V(Math.sign(v.x || 1) * 6, 0), true)
      },
    }
  }
  if (o.kind === 'barrels') {
    const live = []
    let timer = 0
    const sx = o.back ? course.finishX + 6 : o.x + o.at, sy = (o.back ? course.groundY(course.finishX + 6) : o.y + o.h) + 0.8
    return {
      update(dt, ctx) {
        timer -= dt
        const tx = ctx.truckX()
        if (timer <= 0 && tx > sx - 34 && tx < sx - 3 && live.length < 4) {
          timer = 2.6
          const r = dyn(world, sx, sy)
          r.createFixture(new pl.Circle(0.36), { density: 0.7, friction: 0.5, restitution: 0.2 })
          r.setLinearVelocity(V(-4, 0)); r.setAngularVelocity(6)
          r.setUserData({ prop: true })
          const m = add(cyl(0.36, 0.36, 0.9, 0xd9423a, 14)); m.rotation.x = Math.PI / 2
          m.add(at(cyl(0.37, 0.37, 0.08, 0x2b1d3a, 14), 0, 0.25)); m.add(at(cyl(0.37, 0.37, 0.08, 0x2b1d3a, 14), 0, -0.25))
          live.push({ body: r, mesh: m, age: 0 })
        }
        for (let i = live.length - 1; i >= 0; i--) {
          const l = live[i]; l.age += dt
          const p = l.body.getPosition(); l.mesh.position.set(p.x, p.y, 0); l.mesh.rotation.y = 0; l.mesh.rotation.z = 0
          l.mesh.rotation.set(Math.PI / 2, l.body.getAngle(), 0)
          if (l.age > 11 || p.y < course.killY) { world.destroyBody(l.body); G.remove(l.mesh); live.splice(i, 1) }
        }
      },
    }
  }
  if (o.kind === 'tramp') {
    const pad = world.createBody({ type: 'static', position: V(o.x + 1.2, o.y + 0.12) })
    pad.createFixture(new pl.Box(1.2, 0.12), { friction: 0.8, userData: { tramp: true } })
    const m = add(box(2.4, 0.24, 2.4, 0xff4f6d)); m.position.set(o.x + 1.2, o.y + 0.12, 0)
    for (let i = 0; i < 4; i++) m.add(at(box(0.32, 0.25, 2.41, 0xffffff), -0.9 + i * 0.6, 0))
    return { span: [o.x, o.x + 2.4], update() {} }
  }
  if (o.kind === 'rocks') {
    let fired = false, since = 0
    const live = []
    return {
      // A careful driver sees the rocks start to fall and stops until they land.
      botWait(x) { return fired && since < 2.4 && x < o.x + 2 ? 2 : 0 },
      update(dt, ctx) {
        if (fired) since += dt
        if (!fired && ctx.truckX() > o.x - 5) {
          fired = true; ctx.sound('boom', 0.4, 0.6); ctx.shake(0.4)
          for (let i = 0; i < 5; i++) {
            const r = dyn(world, o.x + 2.5 + i * 1.5, o.y + 10 + i * 1.2, rnd(0, 3))
            const s = rnd(0.32, 0.5)
            r.createFixture(new pl.Polygon([V(-s, -s * 0.7), V(s * 0.8, -s), V(s, s * 0.5), V(-s * 0.2, s), V(-s, s * 0.4)]), { density: 1.4, friction: 0.6 })
            r.setUserData({ prop: true })
            const m = add(mesh(new THREE.DodecahedronGeometry(s * 1.05, 0), 0x9a96a8)); live.push({ body: r, mesh: m })
          }
        }
        syncLinks(live)
      },
    }
  }
  if (o.kind === 'windmill') {
    const cx = o.x + (o.dx || 0), cy = o.y + 4.4
    const hub = world.createBody({ type: 'kinematic', position: V(cx, cy) })
    hub.setUserData({ prop: true })
    const m = new THREE.Group(); m.position.set(cx, cy, 0.4); add(m)
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2
      hub.createFixture(new pl.Box(1.2, 0.1, V(Math.cos(a) * 1.25, Math.sin(a) * 1.25), a), { friction: 0.3 })
      const blade = box(2.4, 0.2, 0.2, i % 2 ? 0xffffff : 0xff4f6d); blade.position.set(Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0); blade.rotation.z = a; m.add(blade)
    }
    m.add(ball(0.3, 0xffd23f))
    add(at(box(0.6, 4.6, 0.6, 0xf4ecc6), cx, o.y + 2.2, -1.2))
    hub.setAngularVelocity(-0.95)
    return { span: [cx - 2.5, cx + 2.5], update() { m.rotation.z = hub.getAngle() } }
  }
  if (o.kind === 'fan') {
    const fx = o.dir < 0 ? o.x + o.L + 1.2 : o.x - 1.2, fy = o.y + 1.3
    const f = new THREE.Group(); f.position.set(fx, fy, 0); add(f)
    f.add(at(box(0.5, 2.6, 2.2, 0x8a8fa8), 0, 0)); const blades = new THREE.Group(); blades.position.x = -o.dir * 0.3; f.add(blades)
    for (let i = 0; i < 3; i++) { const bl = box(0.06, 1.0, 0.3, 0xffffff); bl.position.y = 0.45; const piv = new THREE.Group(); piv.rotation.x = (i * Math.PI * 2) / 3; piv.add(bl); blades.add(piv) }
    add(at(box(0.3, 1.4, 0.3, 0x5a5f72), fx, o.y + 0.3, -0.6))
    const streaks = []
    for (let i = 0; i < 14; i++) { const s = box(rnd(0.6, 1.4), 0.04, 0.04, 0xffffff); s.material = s.material.clone(); s.material.transparent = true; s.material.opacity = 0.6; s.position.set(o.x + rnd(0, o.L), o.y + rnd(0.6, 2.6), rnd(-1, 1)); add(s); streaks.push(s) }
    return {
      update(dt, ctx) {
        blades.rotation.x += dt * 14
        for (const s of streaks) { s.position.x += o.dir * dt * 9; if (s.position.x < o.x) s.position.x = o.x + o.L; if (s.position.x > o.x + o.L) s.position.x = o.x }
        for (const item of ctx.cargo()) {
          const p = item.body.getPosition()
          if (p.x > o.x && p.x < o.x + o.L) { const m2 = item.body.getMass(); item.body.applyForceToCenter(V(o.dir * m2 * (5 / (1 + m2 * 3)), 0), true) }
        }
      },
    }
  }
  if (o.kind === 'tunnel') {
    const top = o.y + o.h
    const roof = world.createBody({ type: 'static', position: V(o.x + o.L / 2, top + 0.3) })
    roof.createFixture(new pl.Box(o.L / 2, 0.3), { friction: 0.4 })
    const shape = new THREE.Shape(); shape.moveTo(o.x - 1.5, top + 5); shape.lineTo(o.x, top + 0.2); shape.lineTo(o.x, top); shape.lineTo(o.x + o.L, top); shape.lineTo(o.x + o.L, top + 0.2); shape.lineTo(o.x + o.L + 1.5, top + 5)
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 4.4, bevelEnabled: false }); geo.translate(0, 0, -2.2)
    add(mesh(geo, course.themeName === 'city' ? 0xb4a7c6 : 0x9a8a7a))
    const stripe = add(box(o.L, 0.12, 4.45, 0xffd23f)); stripe.position.set(o.x + o.L / 2, top + 0.06, 0)
    return { update() {} }
  }
  if (o.kind === 'finish') {
    const gate = new THREE.Group(); gate.position.set(o.x, o.y, 0); add(gate)
    for (const z of [-1.6, 1.6]) gate.add(at(box(0.2, 3.4, 0.2, 0xffffff), 0, 1.7, z))
    const banner = mesh(new THREE.PlaneGeometry(3.4, 0.8), 0xffffff, { map: checkerTexture(), side: THREE.DoubleSide }); banner.rotation.y = Math.PI / 2; banner.position.set(0, 3.2, 0); gate.add(banner)
    return { update() {} }
  }
  if (o.kind === 'bakery') {
    const g = new THREE.Group(); g.position.set(o.x, course.groundY(o.x), -2.6); add(g)
    g.add(at(box(5, 3.4, 2.4, 0xfff1dc), 0, 1.7)); g.add(at(box(5.3, 0.4, 2.6, 0xff8fb1), 0, 3.5))
    for (let i = 0; i < 6; i++) { const s = box(0.88, 0.5, 0.9, i % 2 ? 0xffffff : 0xff4f6d); s.rotation.x = -0.4; g.add(at(s, -2.2 + i * 0.88, 2.55, 1.5)) }
    const sign = mesh(new THREE.PlaneGeometry(3.4, 0.85), 0xffffff, { map: signTexture('BAKERY', '#ff8fb1', '#ffffff') }); g.add(at(sign, 0, 3.05, 1.22))
    g.add(at(box(1.4, 1.1, 0.05, 0xbfefff), -1.2, 1.3, 1.21)); g.add(at(box(0.9, 1.7, 0.05, 0x8a5a3c), 1.3, 0.85, 1.21))
    const chef = critter('bear', 0xc98a55, { hat: 'chef', shirt: 0xffffff }); chef.position.set(2.6, 0, 1.6); chef.rotation.y = 0.5; g.add(chef)
    course.chef = chef
    return { update() {} }
  }
  if (o.kind === 'brokenBridge') {
    const g = new THREE.Group(); g.position.set(o.x + 10, course.groundY(o.x) - 3, -10); add(g)
    const parts = []
    for (let i = 0; i < 7; i++) { const p = box(2, 0.4, 2, 0xb4a7c6); p.position.set(i * 2, 3, 0); g.add(p); parts.push(p) }
    for (const dx of [0, 12]) g.add(at(box(0.8, 3, 1.6, 0x9a8fb0), dx, 1.5, 0))
    g.add(at(box(16, 0.3, 6, 0x4fc3ff), 6, -0.2, 0))
    course.bridgeParts = parts
    return { update() {} }
  }
  if (o.kind === 'cars') {
    const x0 = o.x - o.back
    for (let i = 0; i < 2; i++) {
      const c = new THREE.Group(); const col = pick([0x4fc3ff, 0xffd23f, 0x9b5de5, 0x2ee6a6])
      c.add(at(box(2.2, 0.7, 1.6, col), 0, 0.55)); c.add(at(box(1.2, 0.55, 1.5, 0xdff4ff), -0.1, 1.15))
      for (const dx of [-0.7, 0.7]) for (const z of [-0.8, 0.8]) { const w = cyl(0.3, 0.3, 0.2, DARK, 12); w.rotation.x = Math.PI / 2; c.add(at(w, dx, 0.3, z)) }
      c.position.set(x0 + 2 + i * 3.4, o.y - 2.6, 0); add(c)
    }
    return { update() {} }
  }
  if (o.kind === 'wedding') {
    const x = o.x, y = course.groundY(x)
    const g = new THREE.Group(); g.position.set(x, y, -1.2); add(g)
    const arch = mesh(new THREE.TorusGeometry(2, 0.22, 8, 24, Math.PI), 0xffffff); arch.position.y = 1.2; g.add(arch)
    for (let i = 0; i < 9; i++) { const a = (i / 8) * Math.PI; g.add(at(ball(0.28, pick([0xff8fb1, 0xffffff, 0xffd23f]), 10), Math.cos(a) * 2, 1.2 + Math.sin(a) * 2, 0.15)) }
    for (const s of [-1, 1]) g.add(at(box(0.3, 1.2, 0.3, 0xffffff), s * 2, 0.6, 0))
    const bride = critter('bunny', 0xffffff, { hat: 'veil', shirt: 0xfff6fb }); bride.position.set(-0.6, 0, 0.4); g.add(bride)
    const groom = critter('cat', 0x9a8a7a, { shirt: 0x2b1d3a, bow: 0xe8203a }); groom.position.set(0.6, 0, 0.4); g.add(groom)
    for (let i = 0; i < 5; i++) { const guest = critter(pick(['bear', 'dog', 'cat', 'bunny']), pick([0xc98a55, 0xffffff, 0xff9f4a, 0x9a8a7a]), { shirt: pick([0x4fc3ff, 0xffd23f, 0x2ee6a6, 0xff8fb1]) }); guest.scale.setScalar(0.8); guest.position.set(3 + i * 1.1, 0, -1 + (i % 2) * 0.6); g.add(guest) }
    course.couple = { bride, groom, x }
    return { update() {} }
  }
  return null
}

let checker = null
function checkerTexture() {
  if (checker) return checker
  const c = document.createElement('canvas'); c.width = 128; c.height = 32
  const g = c.getContext('2d')
  for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#2b1d3a' : '#ffffff'; g.fillRect(i * 8, j * 8, 8, 8) }
  checker = new THREE.CanvasTexture(c); checker.magFilter = THREE.NearestFilter; checker.colorSpace = THREE.SRGBColorSpace
  return checker
}
