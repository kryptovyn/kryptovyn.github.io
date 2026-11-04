// Cargo: 19 things to carry. Each has a toy-like look, a physics body and a habit.
// breakV: impact speed change (m/s) that breaks it. special: what it does on its own.
import { THREE, pl, V, mesh, box, ball, cyl, at } from './core.js'

function body(world, x, y, opts = {}) {
  return world.createBody({ type: 'dynamic', position: V(x, y), angle: opts.angle || 0, angularDamping: opts.angDamp ?? 0.4, linearDamping: opts.damp ?? 0.05, gravityScale: opts.gravity ?? 1, bullet: !!opts.bullet })
}
const fx = (b, shape, density, friction = 0.6, restitution = 0.1) => b.createFixture(shape, { density, friction, restitution })
const boxShape = (w, h, cx = 0, cy = 0) => new pl.Box(w / 2, h / 2, V(cx, cy), 0)

// x, y: the bottom centre where the item should sit.
export const KINDS = {
  cake: {
    w: 0.74, h: 0.6, breakV: 4.6, tiers: 3,
    make(world, x, y) {
      const b = body(world, x, y)
      const group = new THREE.Group()
      const sizes = [0.37, 0.29, 0.21], tiers = []
      sizes.forEach((r, i) => {
        const f = fx(b, boxShape(r * 2, 0.2, 0, 0.1 + i * 0.2), 0.9, 0.75, 0.05)
        const g = new THREE.Group()
        g.add(at(cyl(r, r, 0.19, 0xfff6ea, 24), 0, 0.095))
        g.add(at(cyl(r + 0.012, r + 0.012, 0.05, 0xff8fb1, 24), 0, 0.17))
        for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.add(at(ball(0.03, 0xffffff, 8), Math.cos(a) * r, 0.02, Math.sin(a) * r)) }
        if (i === 2) { g.add(at(ball(0.07, 0xe8203a, 10), 0, 0.27)); g.add(at(cyl(0.008, 0.008, 0.1, 0x3a8a2a, 4), 0.02, 0.35)) }
        g.position.y = i * 0.2
        group.add(g)
        tiers.push({ fixture: f, group: g, r })
      })
      return { body: b, group, tiers }
    },
  },
  watermelon: {
    w: 0.5, h: 0.5, breakV: 8,
    make(world, x, y) {
      const b = body(world, x, y + 0.25); fx(b, new pl.Circle(0.25), 1.4, 0.5, 0.25)
      const g = new THREE.Group(); const m = ball(0.25, 0x3fae3a, 18); m.scale.set(1.12, 1, 1); g.add(m)
      for (let k = 0; k < 4; k++) { const s = mesh(new THREE.TorusGeometry(0.248, 0.018, 6, 24), 0x1f6b22); s.rotation.y = (k / 4) * Math.PI; s.scale.set(1.12, 1, 1); g.add(s) }
      return { body: b, group: g }
    },
  },
  eggs: {
    w: 0.5, h: 0.2, breakV: 3.8,
    make(world, x, y) {
      const b = body(world, x, y + 0.1); fx(b, boxShape(0.5, 0.2), 0.5)
      const g = new THREE.Group(); g.add(at(box(0.5, 0.12, 0.34, 0xc9a36b), 0, -0.04))
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const e = ball(0.065, 0xfff8ec, 10); e.scale.y = 1.25; g.add(at(e, -0.16 + i * 0.16, 0.06, -0.08 + j * 0.16)) }
      return { body: b, group: g }
    },
  },
  fireworks: {
    w: 0.26, h: 0.5, breakV: 5, special: 'explode',
    make(world, x, y) {
      const b = body(world, x, y + 0.25); fx(b, boxShape(0.26, 0.5), 0.6)
      const g = new THREE.Group(); g.add(box(0.26, 0.5, 0.26, 0xe8203a))
      g.add(at(box(0.27, 0.06, 0.27, 0xffd23f), 0, 0.1)); g.add(at(box(0.27, 0.06, 0.27, 0xffd23f), 0, -0.12))
      for (const dx of [-0.07, 0, 0.07]) g.add(at(cyl(0.025, 0.025, 0.22, dx ? 0x4fc3ff : 0xff9f1c, 6), dx, 0.35))
      return { body: b, group: g }
    },
  },
  jelly: {
    w: 0.36, h: 0.3,
    make(world, x, y) {
      const b = body(world, x, y + 0.15); fx(b, boxShape(0.36, 0.3), 0.5, 0.4, 0.85)
      const g = new THREE.Group(); const j = mesh(new THREE.BoxGeometry(0.36, 0.3, 0.32), 0x5bea6f, { transparent: true, opacity: 0.82 }); g.add(j)
      g.add(at(ball(0.05, 0xff4f6d, 8), 0, 0.17)); g.userData.wobble = j
      return { body: b, group: g }
    },
  },
  fishbowl: {
    w: 0.44, h: 0.44, breakV: 4.4,
    make(world, x, y) {
      const b = body(world, x, y + 0.22); fx(b, new pl.Circle(0.22), 0.9, 0.5, 0.1)
      const g = new THREE.Group()
      g.add(mesh(new THREE.SphereGeometry(0.22, 18, 14), 0xbfefff, { transparent: true, opacity: 0.45 }))
      const water = ball(0.19, 0x4fc3ff); water.material = water.material.clone(); water.material.transparent = true; water.material.opacity = 0.55; water.scale.y = 0.8; at(water, 0, -0.03); g.add(water)
      const fish = ball(0.06, 0xff9f1c, 10); fish.scale.set(1.5, 1, 0.7); g.add(at(fish, 0.02, -0.02)); g.add(at(mesh(new THREE.ConeGeometry(0.05, 0.08, 4), 0xff9f1c), -0.1, -0.02))
      g.children[g.children.length - 1].rotation.z = Math.PI / 2
      return { body: b, group: g }
    },
  },
  piano: {
    w: 0.52, h: 0.62,
    make(world, x, y) {
      const b = body(world, x, y + 0.31); fx(b, boxShape(0.52, 0.62), 2.4, 0.5, 0.05)
      const g = new THREE.Group(); g.add(at(box(0.52, 0.62, 0.36, 0x2b1d3a), 0, 0))
      g.add(at(box(0.5, 0.05, 0.16, 0xffffff), 0, -0.02, 0.24))
      for (let k = 0; k < 5; k++) g.add(at(box(0.035, 0.03, 0.08, 0x111111), -0.18 + k * 0.09, 0.01, 0.22))
      g.add(at(box(0.44, 0.2, 0.01, 0x4a3a5a), 0, 0.17, 0.185))
      return { body: b, group: g }
    },
  },
  balloons: {
    w: 0.2, h: 0.18, special: 'float',
    make(world, x, y) {
      const b = body(world, x, y + 0.09, { gravity: 0.12, damp: 0.9, angDamp: 2 }); fx(b, boxShape(0.2, 0.18), 0.6, 0.6, 0.2)
      const g = new THREE.Group(); g.add(box(0.2, 0.18, 0.2, 0xffd23f))
      const colors = [0xff4f6d, 0x4fc3ff, 0x9b5de5]
      colors.forEach((c, i) => {
        const dx = (i - 1) * 0.18, top = 0.85 + (i === 1 ? 0.12 : 0)
        const bl = ball(0.17, c, 14); bl.scale.y = 1.2; g.add(at(bl, dx, top))
        const s = cyl(0.006, 0.006, top - 0.1, 0xffffff, 4); s.position.set(dx / 2, (top + 0.09) / 2, 0); s.rotation.z = -dx * 0.5; g.add(s)
      })
      return { body: b, group: g }
    },
  },
  chicken: {
    w: 0.3, h: 0.32, special: 'hop',
    make(world, x, y) {
      const b = body(world, x, y + 0.16); fx(b, boxShape(0.3, 0.32), 0.5, 0.7, 0.2)
      const g = new THREE.Group(); const bd = ball(0.17, 0xffffff); bd.scale.set(1.1, 0.95, 0.9); g.add(bd)
      g.add(at(ball(0.1, 0xffffff), 0.1, 0.15)); g.add(at(box(0.04, 0.08, 0.03, 0xe8203a), 0.1, 0.27))
      const beak = mesh(new THREE.ConeGeometry(0.035, 0.08, 4), 0xffb627); beak.rotation.z = -Math.PI / 2; g.add(at(beak, 0.22, 0.14))
      g.add(at(ball(0.02, 0x2b1d3a, 6), 0.16, 0.18, 0.07))
      for (const dz of [-0.05, 0.05]) g.add(at(cyl(0.012, 0.012, 0.08, 0xffb627, 4), 0, -0.17, dz))
      return { body: b, group: g }
    },
  },
  ice: {
    w: 0.4, h: 0.4, breakV: 7,
    make(world, x, y) {
      const b = body(world, x, y + 0.2); fx(b, boxShape(0.4, 0.4), 0.9, 0.01, 0.05)
      const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), 0xaee9ff, { transparent: true, opacity: 0.8 }))
      g.add(at(box(0.08, 0.2, 0.01, 0xffffff), -0.08, 0.04, 0.205))
      return { body: b, group: g }
    },
  },
  bowling: {
    w: 0.34, h: 0.34,
    make(world, x, y) {
      const b = body(world, x, y + 0.17); fx(b, new pl.Circle(0.17), 3.2, 0.4, 0.1)
      const g = new THREE.Group(); g.add(ball(0.17, 0x3a4ba8, 16))
      for (const [dx, dy] of [[0.04, 0.08], [-0.04, 0.09], [0, 0.03]]) g.add(at(ball(0.025, 0x111133, 6), dx, dy, 0.15))
      return { body: b, group: g }
    },
  },
  pizza: {
    w: 0.5, h: 0.18,
    make(world, x, y) {
      const b = body(world, x, y + 0.09); fx(b, boxShape(0.5, 0.18), 0.4)
      const g = new THREE.Group()
      for (let i = 0; i < 3; i++) { const p = box(0.48, 0.055, 0.46, 0xe9c48a); p.rotation.y = (i - 1) * 0.08; g.add(at(p, (i - 1) * 0.015, -0.06 + i * 0.06)) }
      g.add(at(box(0.24, 0.005, 0.16, 0xe8203a), 0, 0.093))
      return { body: b, group: g }
    },
  },
  vase: {
    w: 0.28, h: 0.56, breakV: 4.2,
    make(world, x, y) {
      const b = body(world, x, y + 0.28)
      fx(b, new pl.Polygon([V(-0.1, -0.28), V(0.1, -0.28), V(0.14, 0.08), V(0.07, 0.28), V(-0.07, 0.28), V(-0.14, 0.08)]), 0.7)
      const pts = [[0.001, -0.28], [0.1, -0.28], [0.14, 0.05], [0.12, 0.15], [0.06, 0.24], [0.08, 0.28], [0.001, 0.28]].map(([a, c]) => new THREE.Vector2(a, c))
      const g = new THREE.Group(); g.add(mesh(new THREE.LatheGeometry(pts, 18), 0x3a7bd5))
      g.add(at(cyl(0.141, 0.141, 0.05, 0xffffff, 18), 0, 0.03))
      return { body: b, group: g }
    },
  },
  tv: {
    w: 0.5, h: 0.4, breakV: 4.8,
    make(world, x, y) {
      const b = body(world, x, y + 0.2); fx(b, boxShape(0.5, 0.4), 0.8)
      const g = new THREE.Group(); g.add(box(0.5, 0.4, 0.36, 0x9c8a7a)); g.add(at(box(0.36, 0.28, 0.02, 0x2b3a4a), -0.04, 0, 0.18))
      g.add(at(ball(0.025, 0xffd23f, 6), 0.19, 0.08, 0.185)); g.add(at(ball(0.025, 0xffd23f, 6), 0.19, -0.02, 0.185))
      for (const s of [-1, 1]) { const a = cyl(0.008, 0.008, 0.26, 0x555555, 4); a.rotation.z = s * 0.5; g.add(at(a, s * 0.06, 0.31)) }
      return { body: b, group: g }
    },
  },
  snowman: {
    w: 0.4, h: 0.56, breakV: 5.2,
    make(world, x, y) {
      const b = body(world, x, y + 0.2); fx(b, new pl.Circle(V(0, 0), 0.2), 0.6); fx(b, new pl.Circle(V(0, 0.3), 0.14), 0.6)
      const g = new THREE.Group(); g.add(ball(0.2, 0xffffff)); g.add(at(ball(0.14, 0xffffff), 0, 0.3))
      const nose = mesh(new THREE.ConeGeometry(0.03, 0.13, 6), 0xff9f1c); nose.rotation.x = Math.PI / 2; g.add(at(nose, 0, 0.3, 0.17))
      g.add(at(cyl(0.1, 0.1, 0.12, 0x2b1d3a), 0, 0.47)); g.add(at(cyl(0.15, 0.15, 0.02, 0x2b1d3a), 0, 0.41))
      g.add(at(box(0.3, 0.04, 0.3, 0xe8203a), 0, 0.17))
      return { body: b, group: g }
    },
  },
  duck: {
    w: 0.32, h: 0.32,
    make(world, x, y) {
      const b = body(world, x, y + 0.16); fx(b, new pl.Circle(0.16), 0.25, 0.5, 0.75)
      const g = new THREE.Group(); const d = ball(0.16, 0xffd23f); d.scale.set(1.2, 0.85, 1); g.add(d)
      g.add(at(ball(0.1, 0xffd23f), 0.08, 0.15)); const bk = box(0.09, 0.03, 0.08, 0xff7a1c); g.add(at(bk, 0.19, 0.14))
      g.add(at(ball(0.018, 0x2b1d3a, 6), 0.13, 0.19, 0.07))
      return { body: b, group: g }
    },
  },
  cat: {
    w: 0.42, h: 0.26, special: 'startle',
    make(world, x, y) {
      const b = body(world, x, y + 0.13); fx(b, boxShape(0.42, 0.26), 0.7, 0.8, 0.1)
      const g = new THREE.Group(); const l = ball(0.2, 0xff9f4a); l.scale.set(1.1, 0.65, 0.8); g.add(l)
      g.add(at(ball(0.12, 0xff9f4a), 0.17, 0.08))
      for (const dz of [-0.06, 0.06]) { const e = mesh(new THREE.ConeGeometry(0.04, 0.08, 4), 0xff9f4a); g.add(at(e, 0.17, 0.2, dz)) }
      const tail = cyl(0.03, 0.03, 0.26, 0xff9f4a, 6); tail.rotation.z = 1.2; g.add(at(tail, -0.25, 0.02))
      g.add(at(box(0.05, 0.008, 0.01, 0x2b1d3a), 0.24, 0.1, 0.06)); g.add(at(box(0.05, 0.008, 0.01, 0x2b1d3a), 0.24, 0.1, -0.06))
      g.userData.cat = true
      return { body: b, group: g }
    },
  },
  trophy: {
    w: 0.32, h: 0.46,
    make(world, x, y) {
      const b = body(world, x, y + 0.23)
      fx(b, new pl.Polygon([V(-0.12, -0.23), V(0.12, -0.23), V(0.06, -0.08), V(0.16, 0.23), V(-0.16, 0.23), V(-0.06, -0.08)]), 2)
      const g = new THREE.Group(); const gold = 0xffc21a
      g.add(at(box(0.24, 0.06, 0.2, 0x7a4a2a), 0, -0.2)); g.add(at(cyl(0.035, 0.05, 0.14, gold, 10), 0, -0.1))
      g.add(at(cyl(0.16, 0.06, 0.24, gold, 18), 0, 0.1))
      for (const s of [-1, 1]) { const h = mesh(new THREE.TorusGeometry(0.06, 0.016, 6, 12, Math.PI), gold); h.rotation.z = s * Math.PI / 2; g.add(at(h, s * 0.16, 0.12)) }
      return { body: b, group: g }
    },
  },
  toilet: {
    w: 0.4, h: 0.5,
    make(world, x, y) {
      const b = body(world, x, y + 0.25); fx(b, boxShape(0.4, 0.5), 1.4)
      const g = new THREE.Group()
      g.add(at(cyl(0.12, 0.09, 0.2, 0xffffff, 14), 0.04, -0.15)); g.add(at(cyl(0.16, 0.13, 0.08, 0xffffff, 16), 0.04, -0.03))
      g.add(at(box(0.1, 0.34, 0.3, 0xffffff), -0.15, 0.08)); g.add(at(box(0.04, 0.02, 0.08, 0xb0b8c8), -0.13, 0.26, 0.12))
      const lid = cyl(0.16, 0.16, 0.025, 0xdfe7f0, 16); lid.rotation.z = 1.2; g.add(at(lid, -0.06, 0.12))
      return { body: b, group: g }
    },
  },
}
for (const [id, k] of Object.entries(KINDS)) k.id = id
export const CAKE = 'cake'
export const PICKABLE = Object.keys(KINDS).filter((k) => k !== CAKE)
