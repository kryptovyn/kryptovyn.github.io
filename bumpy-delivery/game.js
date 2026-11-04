// Bumpy Delivery: drive a wobbly bakery truck over 10 roads and get the wedding cake there.
import { THREE, pl, V, clamp, lerp, rnd, pick, mat, mesh, box, ball, cyl, at, critter } from './core.js'
import { TEXT, LANGUAGES } from './text.js'
import { KINDS, CAKE, PICKABLE } from './cargo.js'
import { COURSES, LIMIT, buildCourse, skyTexture } from './courses.js'
import { TRUCKS } from './trucks.js'

const $ = (id) => document.getElementById(id)
const Q = new URLSearchParams(location.search)
const BOT = Q.has('bot')
const wrapAngle = (a) => ((((a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI
const show = (id) => $(id).classList.remove('hide')
const hide = (id) => $(id).classList.add('hide')

const LANG_KEYS = Object.keys(LANGUAGES)
let lang = 'en'
const t = (key) => TEXT[lang][key] ?? TEXT.en[key] ?? key

// ---------------------------------------------------------------- save
const SAVE_KEY = 'bumpy_delivery'
const save = { bestTime: 0, bestCourse: 0, reach: 0, runs: 0, clears: 0, perfect: 0, truck: 'bakery', music: 0.6, sfx: 0.9, shake: 1, lang: '', seenStory: 0 }
let saveTimer = 0
function writeSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const text = JSON.stringify(save)
    if (window.bridge?.storage) window.bridge.storage.set(SAVE_KEY, text).catch(() => {})
    else { try { localStorage.setItem(SAVE_KEY, text) } catch {} }
  }, 300)
}
async function readSave() {
  let text = null
  try {
    if (window.bridge?.storage) text = await window.bridge.storage.get(SAVE_KEY, false)
    else text = localStorage.getItem(SAVE_KEY)
  } catch {}
  if (typeof text !== 'string' || !text) return
  try { Object.assign(save, JSON.parse(text)) } catch {}
  // Old saves kept the number of roads finished; the farthest road reached is one more.
  if (!save.reach && (save.bestCourse || save.runs)) save.reach = Math.min(COURSES.length, save.bestCourse + 1)
}

// ---------------------------------------------------------------- platform
const platform = {
  ready: false, audioOn: true, paused: false, adOpen: false,
  message(name) { try { window.bridge?.platform?.sendMessage(name) } catch {} },
  async init() {
    const bridge = window.bridge
    if (!bridge || window.__noBridge) return
    try {
      bridge.engine = 'javascript'
      await bridge.initialize()
      this.ready = true
      this.audioOn = bridge.platform.isAudioEnabled !== false
      const events = bridge.EVENT_NAME
      bridge.platform.on(events.AUDIO_STATE_CHANGED, (on) => { this.audioOn = on; applyVolume() })
      bridge.platform.on(events.PAUSE_STATE_CHANGED, (on) => { this.paused = on; applyVolume(); if (on) pauseGame() })
      bridge.advertisement.on(events.INTERSTITIAL_STATE_CHANGED, (s) => this.onAd(s))
      bridge.advertisement.on(events.REWARDED_STATE_CHANGED, (s) => this.onReward(s))
    } catch (error) { console.warn('bridge', error) }
  },
  onAd(state) {
    if (state === 'opened') { this.adOpen = true; applyVolume() }
    if (state === 'closed' || state === 'failed') { this.adOpen = false; applyVolume() }
  },
  rewardDone: null, rewarded: false,
  onReward(state) {
    if (state === 'opened') { this.adOpen = true; applyVolume() }
    if (state === 'rewarded') this.rewarded = true
    if (state === 'closed' || state === 'failed') {
      this.adOpen = false; applyVolume()
      const done = this.rewardDone; this.rewardDone = null
      done?.(this.rewarded); this.rewarded = false
    }
  },
  // At most one full-screen ad per 3 minutes; a rewarded ad the player chose also resets the clock.
  lastAd: Date.now(),
  interstitial() {
    if (Date.now() - this.lastAd < 180000) return
    this.lastAd = Date.now()
    try { if (this.ready) window.bridge.advertisement.showInterstitial() } catch {}
  },
  rewardedAd(done) {
    if (!this.ready && BOT && Q.has('adok')) { done(true); return } // test: pretend the ad was watched
    if (!this.ready) { done(false); return }
    this.rewardDone = done; this.rewarded = false; this.lastAd = Date.now()
    try { window.bridge.advertisement.showRewarded() } catch { this.rewardDone = null; done(false) }
  },
}

// ---------------------------------------------------------------- sound
const SOUNDS = ['click', 'thud', 'smash', 'soft', 'land', 'boom', 'wood', 'win', 'lose', 'finish', 'coin', 'creak', 'deny']
const audio = {
  ctx: null, buffers: {}, musicGain: null, sfxGain: null, master: null, source: null, current: '', wanted: '', motor: null, last: {},
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return }
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    this.ctx = new Ctx()
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination)
    this.musicGain = this.ctx.createGain(); this.musicGain.connect(this.master)
    this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master)
    // A small engine: two detuned saws through a low-pass; pitch follows the wheels.
    const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 480
    this.motor = this.ctx.createGain(); this.motor.gain.value = 0
    this.oscs = [0, 9].map((cents) => { const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 50; o.detune.value = cents * 10; o.connect(filter); o.start(); return o })
    filter.connect(this.motor); this.motor.connect(this.sfxGain)
    applyVolume()
    for (const n of SOUNDS) this.load(n)
    this.load('lobby').then(() => this.music(this.wanted))
    this.load('drive').then(() => this.music(this.wanted))
  },
  async load(name) {
    try {
      const data = await (await fetch(`audio/${name}.ogg`)).arrayBuffer()
      this.buffers[name] = await this.ctx.decodeAudioData(data)
    } catch (error) { console.warn('sound', name, error) }
  },
  play(name, volume = 1, rate = 1) {
    if (!this.ctx || !this.buffers[name]) return
    const now = performance.now()
    if (now - (this.last[name] || 0) < 70) return
    this.last[name] = now
    const source = this.ctx.createBufferSource(); source.buffer = this.buffers[name]; source.playbackRate.value = rate
    const gain = this.ctx.createGain(); gain.gain.value = volume
    source.connect(gain); gain.connect(this.sfxGain); source.start()
  },
  engine(level, pitch) {
    if (!this.motor) return
    this.motor.gain.setTargetAtTime(level * 0.06, this.ctx.currentTime, 0.06)
    for (const o of this.oscs) o.frequency.setTargetAtTime(pitch, this.ctx.currentTime, 0.08)
  },
  music(name) {
    this.wanted = name
    if (!this.ctx || !this.buffers[name] || this.current === name) return
    this.source?.stop()
    const source = this.ctx.createBufferSource(); source.buffer = this.buffers[name]; source.loop = true
    source.connect(this.musicGain); source.start(); this.source = source; this.current = name
  },
}
function applyVolume() {
  if (!audio.ctx) return
  const silent = !platform.audioOn || platform.adOpen || platform.paused || document.hidden
  audio.master.gain.value = silent ? 0 : 1
  audio.musicGain.gain.value = save.music * 0.45
  audio.sfxGain.gain.value = save.sfx
}
document.addEventListener('visibilitychange', () => { applyVolume(); if (document.hidden) pauseGame() })
const buzz = (ms) => { if (save.shake && navigator.userActivation?.hasBeenActive) try { navigator.vibrate?.(ms) } catch {} }

// ---------------------------------------------------------------- scene
const canvas = $('view')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
renderer.outputColorSpace = THREE.SRGBColorSpace
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 300)
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a99, 1.7))
const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(-6, 14, 10); scene.add(sun)

// ---------------------------------------------------------------- physics world
let world = null, course = null
const events = [], hits = []
const wm = new pl.WorldManifold()
function newWorld() {
  world = new pl.World({ gravity: V(0, -10) })
  // Impact speed: how fast two things close in along the contact normal, measured before the solver.
  world.on('pre-solve', (contact) => {
    const A = contact.getFixtureA().getBody(), B = contact.getFixtureB().getBody()
    const ua = A.getUserData(), ub = B.getUserData()
    if (!(ua?.item || ub?.item || ua?.part === 'chassis' || ub?.part === 'chassis')) return
    if (!contact.getManifold().pointCount) return
    contact.getWorldManifold(wm)
    const pt = wm.points[0], n = wm.normal
    const va = A.getLinearVelocityFromWorldPoint(pt), vb = B.getLinearVelocityFromWorldPoint(pt)
    const dv = -((vb.x - va.x) * n.x + (vb.y - va.y) * n.y)
    if (dv < 1.6) return
    // Each side feels the speed change of an inelastic hit: a light thing barely hurts a heavy one.
    const mass = (b) => (b.isDynamic() ? b.getMass() : 1e6)
    const ma = mass(A), mb = mass(B)
    for (const [u, o, m, mo] of [[ua, ub, ma, mb], [ub, ua, mb, ma]]) {
      const felt = (dv * mo) / (m + mo)
      if (u?.item && felt > 1.6) events.push({ kind: 'hit', item: u.item, dv: felt, by: o?.item ? o.item.entry.id : o?.part || (o?.prop ? 'prop' : 'ground') })
      else if (u?.part === 'chassis' && !o?.item) events.push({ kind: 'land', dv: felt })
    }
  })
  world.on('begin-contact', (contact) => {
    const fa = contact.getFixtureA(), fb = contact.getFixtureB()
    for (const [f, o] of [[fa, fb], [fb, fa]]) {
      const u = f.getUserData(), other = o.getBody().getUserData()
      if (!u || !other) continue
      if (u.tramp && (other.part || other.item)) events.push({ kind: 'tramp' })
      if (u.plank && (other.part || other.item)) u.plank.touched = true
    }
  })
  events.length = 0
}
function disposeGroup(g) {
  g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material?.map) { o.material.map.dispose(); o.material.dispose() } })
}

// ---------------------------------------------------------------- truck
const TRUCK = { ...TRUCKS[0] }
let truckDef = TRUCKS[0]
function setTruck(id) { truckDef = TRUCKS.find((d) => d.id === id) || TRUCKS[0]; Object.assign(TRUCK, truckDef) }
const truckOpen = (d) => !d.unlock || (d.unlock.reach && save.reach >= d.unlock.reach) || (d.unlock.clears && save.clears >= d.unlock.clears) || (d.unlock.perfect && save.perfect >= d.unlock.perfect)
const BED = { x0: -1.3, x1: 0.5, floor: 0.1 }
const truck = { chassis: null, wheels: [], joints: [], group: null, wheelMeshes: [] }
function truckMesh(def) {
  const g = new THREE.Group()
  const cream = def.trim, pink = def.body, red = def.rail
  g.add(at(box(2.8, 0.22, 1.3, cream), 0, 0))
  g.add(at(box(2.82, 0.24, 1.32, pink), 0, -0.2))
  for (const z of [-0.62, 0.62]) g.add(at(box(1.84, 0.22, 0.06, red), -0.4, 0.2, z))
  g.add(at(box(0.12, 0.6, 1.3, red), -1.36, 0.38))
  const cab = new THREE.Group(); cab.position.set(0.95, 0.5, 0); g.add(cab)
  cab.add(box(0.9, 0.84, 1.28, pink)); cab.add(at(box(0.92, 0.12, 1.3, cream), 0, 0.42))
  cab.add(at(box(0.5, 0.36, 1.3, 0xbfefff), 0.08, 0.12)); cab.add(at(box(0.06, 0.34, 1.0, 0xbfefff), 0.46, 0.12))
  const dog = critter(def.driver, def.driver === 'bear' ? 0xc98a55 : def.driver === 'cat' ? 0xffb36b : 0xffe0b0, { cap: def.cap }); dog.scale.setScalar(0.42); dog.position.set(0.02, -0.38, 0); dog.rotation.y = Math.PI / 2; cab.add(dog)
  g.add(at(box(0.1, 0.12, 0.3, 0xfff3a8), 1.42, 0.02, 0.45)); g.add(at(box(0.1, 0.12, 0.3, 0xfff3a8), 1.42, 0.02, -0.45))
  // Roof extras so each truck reads at a glance.
  if (def.extra === 'cone') { const c = mesh(new THREE.ConeGeometry(0.2, 0.5, 10), 0xe0a060); c.rotation.z = Math.PI; cab.add(at(c, 0, 0.72)); cab.add(at(ball(0.24, 0xff8fb1), 0, 1.0)); cab.add(at(ball(0.07, 0xff4f6d, 8), 0, 1.24)) }
  if (def.extra === 'siren') { cab.add(at(box(0.5, 0.1, 0.5, 0xffffff), 0, 0.52)); cab.add(at(ball(0.13, 0xff2a2a, 10), -0.12, 0.64)); cab.add(at(ball(0.13, 0x4fa8ff, 10), 0.12, 0.64)) }
  if (def.extra === 'bottle') { cab.add(at(cyl(0.16, 0.18, 0.5, 0xffffff, 12), 0, 0.73)); cab.add(at(cyl(0.09, 0.1, 0.12, 0xffffff, 10), 0, 1.03)); cab.add(at(cyl(0.11, 0.11, 0.06, 0x4fc3ff, 10), 0, 1.11)) }
  if (def.extra === 'crown') { cab.add(at(cyl(0.26, 0.24, 0.16, 0xffd23f, 10), 0, 0.56)); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; cab.add(at(mesh(new THREE.ConeGeometry(0.06, 0.18, 4), 0xffd23f), Math.cos(a) * 0.22, 0.72, Math.sin(a) * 0.22)) } cab.add(at(ball(0.06, 0xff4f6d, 8), 0, 0.8, 0.25)) }
  if (def.extra === 'flames') for (const z of [-0.67, 0.67]) for (let i = 0; i < 3; i++) g.add(at(box(0.36, 0.08, 0.02, i % 2 ? 0xffd23f : 0xff7a1a), -0.9 + i * 0.5, -0.2, z))
  scene.add(g)
  const wheels = []
  for (let i = 0; i < 2; i++) {
    const w = new THREE.Group()
    const tyre = cyl(def.wheelR, def.wheelR, def.id === 'monster' ? 0.56 : 0.36, 0x2b1d3a, 18); tyre.rotation.x = Math.PI / 2; w.add(tyre)
    const hub = cyl(def.wheelR * 0.48, def.wheelR * 0.48, def.id === 'monster' ? 0.58 : 0.38, def.id === 'gold' ? 0xffffff : 0xffd23f, 10); hub.rotation.x = Math.PI / 2; w.add(hub)
    w.add(at(box(0.36, 0.06, 0.39, 0xffffff), 0, 0))
    scene.add(w); wheels.push(w)
  }
  return { g, wheels }
}
function makeTruck(x, y) {
  const c = world.createBody({ type: 'dynamic', position: V(x, y), angularDamping: 0.25 })
  c.createFixture(new pl.Box(1.4, 0.1, V(0, 0)), { density: TRUCK.density, friction: 0.7 })
  c.createFixture(new pl.Box(1.4, 0.12, V(0, -0.22)), { density: TRUCK.density, friction: 0.6 })
  c.createFixture(new pl.Box(0.06, 0.3, V(-1.36, 0.38)), { density: 1, friction: 0.7 })
  c.createFixture(new pl.Box(0.45, 0.42, V(0.95, 0.5)), { density: 1.4, friction: 0.6 })
  c.setUserData({ part: 'chassis' })
  truck.chassis = c; truck.wheels = []; truck.joints = []
  for (const wx of [-0.98, 0.98]) {
    const w = world.createBody({ type: 'dynamic', position: V(x + wx, y - 0.36), angularDamping: 0.1 })
    w.createFixture(new pl.Circle(TRUCK.wheelR), { density: 1.6, friction: 1.4, restitution: 0.05 })
    w.setUserData({ part: 'wheel' })
    const j = world.createJoint(new pl.WheelJoint({ motorSpeed: 0, maxMotorTorque: TRUCK.torque, enableMotor: true, frequencyHz: TRUCK.hz, dampingRatio: TRUCK.damp }, c, w, w.getPosition(), V(0, 1)))
    truck.wheels.push(w); truck.joints.push(j)
  }
  if (truck.groupId !== truckDef.id) {
    if (truck.group) { scene.remove(truck.group); truck.wheelMeshes.forEach((w) => scene.remove(w)) }
    const m = truckMesh(truckDef); truck.group = m.g; truck.wheelMeshes = m.wheels; truck.groupId = truckDef.id
  }
}
const touching = (b) => { for (let ce = b.getContactList(); ce; ce = ce.next) if (ce.contact.isTouching()) return true; return false }
function syncTruck() {
  const p = truck.chassis.getPosition()
  truck.group.position.set(p.x, p.y, 0); truck.group.rotation.z = truck.chassis.getAngle()
  truck.wheels.forEach((w, i) => { const q = w.getPosition(); truck.wheelMeshes[i].position.set(q.x, q.y, 0); truck.wheelMeshes[i].rotation.z = w.getAngle() })
}

// ---------------------------------------------------------------- cargo
// run.items: [{ id, alive }]; live: the item bodies of this road.
let live = []
const debris = []
function spawnItem(entry, lx, ly) {
  const kind = KINDS[entry.id]
  const wp = truck.chassis.getWorldPoint(V(lx, ly))
  const made = kind.make(world, wp.x, wp.y)
  const item = { entry, kind, body: made.body, group: made.group, tiers: made.tiers, out: 0, cool: 0, hopT: rnd(1.5, 3), alive: true }
  made.body.setUserData({ item })
  if (item.tiers) while (item.tiers.length > run.cakeTiers) { const top = item.tiers.pop(); made.body.destroyFixture(top.fixture); made.group.remove(top.group) }
  scene.add(made.group)
  live.push(item)
  return item
}
// Cake in the middle of the bed, the rest left and right, stacked when there are more than two.
function loadCargo(drop = 0) {
  const entries = run.items.filter((e) => e.alive)
  const cake = entries.find((e) => e.id === CAKE), rest = entries.filter((e) => e.id !== CAKE)
  if (cake) spawnItem(cake, -0.4, BED.floor + 0.01 + drop)
  const xs = [-1.02, 0.26], stack = [BED.floor + 0.01, BED.floor + 0.01]
  rest.forEach((e, i) => {
    const side = i % 2
    // A new parcel drops into the bed from above at the start of the road.
    const fresh = e.id === run.newCargo
    const it = spawnItem(e, xs[side], stack[side] + drop + (fresh ? 3.2 : 0))
    if (fresh) it.body.setAngularVelocity(rnd(-5, 5))
    stack[side] += KINDS[e.id].h + 0.03
  })
}
function cargoBodies() { return live.filter((i) => i.alive) }
function removeItem(item, keep = 2.5) {
  item.alive = false
  debris.push({ body: item.body, mesh: item.group, t: keep })
}

// ---------------------------------------------------------------- effects
const parts = []
const partGeo = new THREE.BoxGeometry(0.09, 0.09, 0.09)
function burst(x, y, colors, n = 18, speed = 5, up = 3) {
  for (let i = 0; i < n; i++) {
    if (parts.length > 260) break
    const m = new THREE.Mesh(partGeo, mat(pick(colors))); m.position.set(x, y, rnd(-0.3, 0.3)); scene.add(m)
    const a = rnd(0, Math.PI * 2), s = rnd(0.3, 1) * speed
    parts.push({ m, vx: Math.cos(a) * s, vy: Math.sin(a) * s + up, vz: rnd(-2, 2), life: rnd(0.7, 1.4), spin: rnd(-12, 12) })
  }
}
function updateParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.life -= dt
    p.vy -= 12 * dt; p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt; p.m.rotation.x += p.spin * dt; p.m.rotation.y += p.spin * dt
    if (p.life <= 0) { scene.remove(p.m); parts.splice(i, 1) }
  }
}
let shakeT = 0
const shake = (s) => { shakeT = Math.max(shakeT, s) }
function banner(text, good = false) {
  const b = $('banner'); b.textContent = text; b.classList.toggle('good', good)
  b.classList.remove('on'); void b.offsetWidth; b.classList.add('on')
}
function pop(text, id, x, y) {
  const v = new THREE.Vector3(x, y, 0).project(camera)
  const el = document.createElement('div'); el.className = 'pop'
  el.style.left = clamp((v.x * 0.5 + 0.5) * 100, 12, 88) + '%'; el.style.top = clamp((-v.y * 0.5 + 0.5) * 100, 18, 70) + '%'
  el.innerHTML = (id ? `<img src="${thumbs[id] || ''}" alt="">` : '') + `<span>${text}</span>`
  $('pops').appendChild(el); setTimeout(() => el.remove(), 1300)
}

// ---------------------------------------------------------------- run
const game = { state: 'load', time: 0 }
const run = { course: 0, time: 0, items: [], cakeTiers: 3, continued: false, phase: 'idle', phaseT: 0, flipT: 0, stuckT: 0, reason: '', story: null, lastCourse: 0 }
const input = { gas: false, back: false, keys: new Set(), pressed: false }

function pickItems() {
  const pool = [...PICKABLE].sort(() => Math.random() - 0.5)
  return [{ id: CAKE, alive: true }, ...pool.slice(0, 4).map((id) => ({ id, alive: true }))]
}
function clearCourse() {
  for (const i of live) scene.remove(i.group)
  for (const d of debris) scene.remove(d.mesh)
  live = []; debris.length = 0
  if (course) { scene.remove(course.group); disposeGroup(course.group) }
  course = null
}
function loadCourse(index, { story = false, at = null } = {}) {
  clearCourse()
  newWorld()
  run.course = index
  course = buildCourse(world, index)
  scene.add(course.group)
  scene.background?.dispose?.(); scene.background = skyTexture(course.theme)
  const sx = at ?? course.startX
  makeTruck(sx, course.groundY(sx) + 0.85 + (TRUCK.wheelR - 0.42))
  run.safeX = sx; run.safeY = course.groundY(sx) + 0.85
  syncTruck()
  if (!story) loadCargo()
  run.flipT = 0; run.stuckT = 0; air.t = 0; air.spin = 0; air.check = 0
  snapCamera()
  sync()
}
function startRun() {
  if (!truckOpen(truckDef) && !BOT) { audio.play('deny', 0.7); return }
  run.openAtStart = TRUCKS.filter(truckOpen).map((d) => d.id)
  const first = Q.has('c') ? clamp(+Q.get('c'), 0, COURSES.length - 1) : 0
  audio.unlock()
  hide('title'); hide('result'); hide('panel'); hide('pause'); show('hud')
  Object.assign(run, { course: 0, time: 0, items: pickItems(), cakeTiers: 3, continued: false, reason: '', lastCourse: 0 })
  game.state = 'play'
  audio.music('drive')
  platform.message('gameplay_started')
  const tell = first === 0 && (!save.seenStory || Q.has('story'))
  loadCourse(first, { story: tell })
  if (tell) {
    run.phase = 'story'
    playStory([
      { who: 'chef', key: 's1a', cam: 'bakery' },
      { who: 'chef', key: 's1b', cam: 'bakery', act: () => { spawnItem(run.items[0], -0.4, BED.floor + 1.2); audio.play('soft', 0.8) } },
      { who: 'chef', key: 's1c', cam: 'truck', act: () => dropRest() },
      { who: 'driver', key: 's1d', cam: 'truck' },
    ], () => { save.seenStory = 1; writeSave(); beginDrive() })
  } else beginDrive()
  sync()
}
function dropRest() {
  const rest = run.items.filter((e) => e.id !== CAKE)
  const xs = [-1.02, 0.26, -1.02, 0.26]
  rest.forEach((e, i) => setTimeout(() => { if (run.phase === 'story' && course?.index === 0) { spawnItem(e, xs[i], BED.floor + 1.4 + (i > 1 ? 0.7 : 0)); audio.play('thud', 0.7, 0.9 + i * 0.1); shake(0.15) } }, i * 260))
}
function beginDrive() {
  run.phase = 'ready'; run.phaseT = 0; run.fresh = true
  // A skipped scene can leave part of the cargo unloaded: load it again in one go.
  if (live.filter((i) => i.alive).length < run.items.filter((e) => e.alive).length) { for (const i of live) { scene.remove(i.group); world.destroyBody(i.body) } live = []; loadCargo() }
  hide('story')
  $('holdTip').textContent = run.course === 0 && !save.runs ? t('hold') : ''
}
// A slip-up costs a few metres, not the whole road: start again a bit behind the last spot
// where both wheels were on solid ground (never on a bridge, lift, seesaw or trampoline).
function respawnX() {
  const blocked = (x) => course.groundY(x) === null || course.groundY(x - 1.5) === null || course.groundY(x + 1.5) === null || course.objs.some((o) => o.span && x > o.span[0] - 2 && x < o.span[1] + 2)
  let x = Math.max(course.startX, run.safeX - 3)
  while (x > course.startX && blocked(x)) x -= 0.5
  return Math.max(course.startX, x)
}
// After a watched ad the run goes on past the spot that ended it: over the gap it fell into,
// or just ahead of where the cake broke, so the ad buys real progress.
function continueX() {
  const blocked = (x) => course.groundY(x) === null || course.groundY(x - 1.5) === null || course.groundY(x + 1.5) === null || course.objs.some((o) => o.span && x > o.span[0] - 2 && x < o.span[1] + 2)
  const end = course.finishX - 3
  let x = Math.max(course.startX, run.failX + 2)
  while (x < end && blocked(x)) x += 0.5
  return x < end ? x : end
}
function restartCourse(fromStart = false) {
  loadCourse(run.course, { at: fromStart ? null : respawnX() })
  run.phase = 'ready'; run.phaseT = 0
}
// A new road brings one new parcel for a lost one, so the bed never stays empty for long.
function refillCargo() {
  const slot = run.items.findIndex((e) => e.id !== CAKE && !e.alive)
  if (slot < 0) return
  const have = new Set(run.items.map((e) => e.id))
  run.items[slot] = { id: pick(PICKABLE.filter((id) => !have.has(id))), alive: true }
  run.newCargo = run.items[slot].id
}
function announceCargo() {
  if (!run.newCargo) return
  const it = live.find((i) => i.alive && i.entry.id === run.newCargo); run.newCargo = null
  if (!it) return
  run.phaseT = Math.min(run.phaseT, -0.6) // wait for it to land before GO
  const p = it.body.getPosition()
  pop(t('newCargo'), it.entry.id, p.x, p.y + 0.6); audio.play('coin', 0.7, 1.4)
  setTimeout(() => { if (it.alive) { audio.play('thud', 0.8, 1.1); shake(0.15) } }, 780)
}
function nextCourse() {
  const n = run.course + 1
  run.lastCourse = n
  refillCargo()
  if (!Q.has('c')) { save.reach = Math.max(save.reach, n + 1); writeSave() }
  if (n === 5 && (!save.seenMid || Q.has('story'))) {
    loadCourse(5)
    run.phase = 'story'
    playStory([
      { who: 'radio', key: 's2a', cam: 'bridge', act: collapseBridge },
      { who: 'driver', key: 's2b', cam: 'truck' },
    ], () => { save.seenMid = 1; writeSave(); beginDrive(); announceCargo() })
    return
  }
  loadCourse(n)
  run.phase = 'ready'; run.phaseT = 0; run.fresh = true
  announceCargo()
}
let bridgeFall = 0
function collapseBridge() { bridgeFall = 0.001; audio.play('boom', 0.7, 0.7); audio.play('wood', 0.8); shake(0.5) }

function courseClear() {
  run.phase = 'clear'; run.phaseT = 0
  audio.play('finish', 0.9); buzz(40)
  const p = truck.chassis.getPosition()
  burst(course.finishX, p.y + 2.5, [0xff4f6d, 0xffd23f, 0x4fc3ff, 0x2ee6a6, 0xffffff], 40, 6, 4)
  if (run.course === COURSES.length - 1) { run.phase = 'arrive'; banner(t('clearAll'), true); return }
  banner(t('clear'), true)
}
function oops(lostTier, why = 'oops') {
  if (run.phase !== 'drive') return
  run.phase = 'oops'; run.phaseT = 0
  audio.play('deny', 0.8); buzz(80); shake(0.3)
  banner(t(why))
  if (lostTier) loseTier(live.find((i) => i.tiers), true)
}
// In a pit: no ground under the truck and well below where it last stood.
function onStructure() {
  for (const b of [...truck.wheels, truck.chassis]) for (let ce = b.getContactList(); ce; ce = ce.next) {
    if (!ce.contact.isTouching()) continue
    const u = ce.other.getUserData()
    if (u?.prop) return true
  }
  return false
}
function inPit() {
  const p = truck.chassis.getPosition()
  if (p.y < course.killY) return true
  if (course.groundY(p.x) !== null) return false
  // Standing on a bridge plank, a lift or a seesaw is not a fall, however low the bridge sags.
  if (onStructure()) return false
  // Compare with the far side too, so a jump to a lower landing is not taken for a fall.
  let ahead = null
  for (let x = p.x; x < p.x + 16 && ahead === null; x += 0.5) ahead = course.groundY(x)
  return p.y < Math.min(run.safeY - 0.85, ahead ?? Infinity) - 1.6
}
// Falling into a pit takes the whole truck down: the cake does not survive that.
function fellInPit() {
  const cake = run.items.find((e) => e.id === CAKE)
  cake.alive = false; run.cakeTiers = 0
  audio.play('smash', 0.9); buzz(120); shake(0.5)
  sync()
  fail('fell')
}
function loseTier(cake, quiet) {
  if (!cake || !cake.tiers?.length) return
  const top = cake.tiers.pop()
  run.cakeTiers = cake.tiers.length
  if (game.state === 'sim') (sim.lost ||= []).push(Math.round(truck.chassis.getPosition().x) + (sim.why ? ':' + sim.why : ''))
  const wp = cake.body.getWorldPoint(V(0, 0.1 + cake.tiers.length * 0.2))
  cake.body.destroyFixture(top.fixture)
  cake.group.remove(top.group)
  // The tier flies off as a piece of debris.
  const d = world.createBody({ type: 'dynamic', position: wp, angle: cake.body.getAngle() })
  d.createFixture(new pl.Box(top.r, 0.1), { density: 0.6, friction: 0.6 })
  const v = cake.body.getLinearVelocity(); d.setLinearVelocity(V(v.x * 0.5 - 1.5, v.y + 4)); d.setAngularVelocity(rnd(-6, 6))
  top.group.position.set(0, -0.1, 0); const holder = new THREE.Group(); holder.add(top.group); scene.add(holder)
  debris.push({ body: d, mesh: holder, t: 3 })
  burst(wp.x, wp.y, [0xffffff, 0xff8fb1, 0xfff6ea], 22, 4, 3)
  audio.play('smash', 0.7, 1.2); audio.play('soft', 1)
  if (!quiet) { banner(t('tier')); buzz(60) }
  pop(t('tier'), CAKE, wp.x, wp.y)
  cake.cool = 0.45
  sync()
  if (!cake.tiers.length) { cake.entry.alive = false; removeItem(cake, 1); fail('cake') }
}
function smash(item, word = 'broke') {
  const p = item.body.getPosition()
  item.entry.alive = false
  scene.remove(item.group); world.destroyBody(item.body); item.alive = false
  burst(p.x, p.y, itemColors(item), 26, 5, 2)
  audio.play('smash', 0.9); buzz(50)
  pop(t(word), item.entry.id, p.x, p.y + 0.4)
  sync()
}
function explode(item) {
  const p = item.body.getPosition().clone()
  smash(item, 'boom')
  audio.play('boom', 1); shake(0.7); banner(t('boom'))
  burst(p.x, p.y, [0xff4f6d, 0xffd23f, 0xff9f1c, 0xffffff], 50, 9, 3)
  for (const other of [...cargoBodies(), { body: truck.chassis }]) {
    const q = other.body.getPosition(), dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy)
    if (d > 2.6 || d < 0.01) continue
    const k = (1 - d / 2.6) * other.body.getMass() * 7
    other.body.applyLinearImpulse(V((dx / d) * k, (dy / d) * k + k * 0.4), q, true)
  }
}
function itemColors(item) {
  const c = []
  item.group.traverse((o) => { if (o.material?.color && c.length < 4) c.push(o.material.color.getHex()) })
  return c.length ? c : [0xffffff]
}
function lose(item) {
  if (item.tiers) { if (inPit()) fellInPit(); else oops(true); return }
  item.entry.alive = false
  const p = item.body.getPosition()
  removeItem(item)
  audio.play('soft', 0.8, 0.8); buzz(40)
  pop(t('lost'), item.entry.id, p.x, p.y + 0.5)
  sync()
}
function fail(reason) {
  if (run.phase === 'fail' || run.phase === 'done') return
  run.phase = 'fail'; run.phaseT = 0; run.reason = reason
  run.failX = truck.chassis ? truck.chassis.getPosition().x : course.startX
  audio.play('lose', 0.9); audio.engine(0, 50)
  banner(reason === 'time' ? t('timeUp') : reason === 'fell' ? t('fell') : t('cakeGone'))
  if (game.state === 'sim') return
  setTimeout(() => {
    if (run.phase !== 'fail') return
    playStory([{ who: reason === 'time' ? 'bride' : 'chef', key: reason === 'time' ? 'f2' : 'f1', cam: 'truck' }], () => showResult(false))
  }, 1100)
}

// ---------------------------------------------------------------- story
function playStory(lines, done) {
  let i = -1, timer = 0
  const next = () => {
    i++
    if (i >= lines.length) { hide('story'); $('hud').classList.remove('story'); run.story = null; done(); return }
    const l = lines[i]
    $('who').textContent = t(l.who); $('line').textContent = t(l.key)
    const bubble = document.querySelector('.bubble'); bubble.style.animation = 'none'; void bubble.offsetWidth; bubble.style.animation = ''
    run.storyCam = l.cam
    l.act?.()
    audio.play('click', 0.4, 1.3)
    timer = BOT ? 0.9 : 3.2
  }
  run.story = { tick(dt) { timer -= dt; if (timer <= 0) next() }, next, skip() { i = lines.length - 1; next() } }
  $('skipBtn').textContent = t('skip')
  show('story'); $('hud').classList.add('story'); next()
}

// ---------------------------------------------------------------- result
function showResult(won) {
  run.phase = 'done'; game.state = 'result'
  audio.engine(0, 50); audio.music('lobby')
  platform.message('gameplay_stopped')
  save.runs++
  let fresh = false
  // A run started from a later road (?c= test link) never counts as a record.
  if (won && !Q.has('c') && run.cakeTiers >= 3) save.perfect = (save.perfect || 0) + 1
  if (won && !Q.has('c')) { save.clears++; if (!save.bestTime || run.time < save.bestTime) { save.bestTime = run.time; fresh = true } }
  if (!Q.has('c')) save.reach = Math.max(save.reach, won ? COURSES.length : run.course + 1)
  writeSave()
  hide('hud'); hide('story'); show('result')
  $('resTitle').textContent = won ? t('clearAll') : run.reason === 'time' ? t('timeUp') : t('cakeGone')
  $('resCake').innerHTML = `<img src="${cakeThumb(won ? run.cakeTiers : 0)}" alt="">`
  $('resItems').innerHTML = run.items.filter((e) => e.id !== CAKE).map((e) => `<span class="${e.alive ? '' : 'gone'}"><img src="${thumbs[e.id]}" alt=""></span>`).join('')
  $('resTimeL').textContent = won ? t('time') : t('course'); $('resTime').textContent = won ? fmt(run.time) : `${run.course + 1} / ${COURSES.length}`
  $('resBestL').textContent = save.bestTime ? t('best') : t('farthest'); $('resBest').textContent = save.bestTime ? fmt(save.bestTime) : `${save.reach} / ${COURSES.length}`
  $('resNew').textContent = t('newBest'); $('resNew').classList.toggle('hide', !fresh)
  const opened = TRUCKS.filter((d) => truckOpen(d) && !(run.openAtStart || []).includes(d.id))
  $('resUnlock').textContent = opened.length ? `${t('newTruck')} ${opened.map((d) => t('truck_' + d.id)).join(', ')}` : ''
  $('resUnlock').classList.toggle('hide', !opened.length)
  run.openAtStart = TRUCKS.filter(truckOpen).map((d) => d.id)
  if (opened.length) { setTimeout(() => audio.play('win', 0.7, 1.2), 400); garage.i = TRUCKS.indexOf(opened[opened.length - 1]); save.truck = opened[opened.length - 1].id; setTruck(save.truck) }
  const canCont = !won && !run.continued
  $('contBtn').classList.toggle('hide', !canCont)
  $('contBtn').textContent = run.reason === 'time' ? t('cont2') : t('cont1')
  $('againBtn').textContent = t('again'); $('homeBtn').textContent = t('home')
  if (won) { audio.play('win', 0.9); burst(truck.chassis.getPosition().x + 6, truck.chassis.getPosition().y + 3, [0xff4f6d, 0xffd23f, 0x4fc3ff, 0xffffff, 0xff8fb1], 80, 8, 5) }
  if (save.runs >= 2) platform.interstitial()
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}.${Math.floor((s % 1) * 10)}`
function goHome() {
  game.state = 'title'
  hide('result'); hide('hud'); hide('pause'); hide('panel'); hide('story')
  run.phase = 'idle'; run.items = pickItems(); run.cakeTiers = 3
  loadCourse(0)
  show('title'); audio.music('lobby'); audio.engine(0, 50)
  sync()
}

// ---------------------------------------------------------------- update
const STEP = 1 / 60
let acc = 0
function updatePlay(dt) {
  const ph = run.phase
  run.phaseT += dt
  if (run.story) run.story.tick(dt)
  if (['ready', 'drive', 'oops'].includes(ph)) run.time += dt
  if (ph === 'ready' && run.phaseT > 0.9) { run.phase = 'drive'; run.phaseT = 0; if (run.fresh) banner(t('go'), true); run.fresh = false; audio.play('coin', 0.6, 1.2) }
  if (ph === 'oops' && run.phaseT > 1.0) restartCourse()
  if (ph === 'clear' && run.phaseT > 1.6) nextCourse()
  if (ph === 'arrive' && run.phaseT > 1.4) {
    run.phase = 'end'
    const tiers = run.cakeTiers
    playStory([{ who: 'bride', key: tiers >= 3 ? 's3a' : tiers === 2 ? 's3b' : 's3c', cam: 'couple', act: () => { audio.play('win', 0.8); burst(course.couple.x, course.groundY(course.couple.x) + 3, [0xff4f6d, 0xffd23f, 0x4fc3ff, 0xffffff, 0xff8fb1], 70, 7, 5) } }], () => showResult(true))
  }
  if (ph === 'drive' && LIMIT - run.time <= 0) fail('time')

  drive(dt)
  acc += dt
  let steps = 0
  while (acc >= STEP && steps < 4) { world.step(STEP, 8, 3); acc -= STEP; steps++; handleEvents() }
  if (steps === 4) acc = 0
  for (const o of course.objs) o.update(dt, objCtx)
  updateCargo(dt)
  updateDebris(dt)
  syncTruck()
  if (run.phase === 'drive') watchTruck(dt)
  if (bridgeFall > 0 && course.bridgeParts) { bridgeFall += dt; course.bridgeParts.forEach((p, i) => { if (i > 1 && i < 6) { const k = Math.max(0, bridgeFall - (i - 2) * 0.15); p.position.y = 3 - k * k * 6; p.rotation.z = k * (i % 2 ? 1.5 : -1.2) } }); if (bridgeFall > 3) bridgeFall = 0 }
}
const objCtx = { truckX: () => truck.chassis.getPosition().x, cargo: () => cargoBodies(), sound: (n, v, r) => audio.play(n, v, r), shake }
function drive(dt) {
  if (sim.policy) simInput(sim.policy)
  else if (BOT && Q.get('pol')) simInput(POLICIES.find((p) => p.name === Q.get('pol')))
  else if (BOT) botInput()
  const can = run.phase === 'drive' || run.phase === 'clear'
  const gas = can && (input.gas || input.keys.has('ArrowRight') || input.keys.has('KeyD') || input.keys.has('KeyW') || input.keys.has('ArrowUp'))
  const back = can && (input.back || input.keys.has('ArrowLeft') || input.keys.has('KeyA') || input.keys.has('KeyS') || input.keys.has('ArrowDown'))
  const arriving = run.phase === 'arrive' || run.phase === 'end' || run.phase === 'done'
  const dir = arriving ? 0 : gas && !back ? 1 : back && !gas ? -1 : 0
  for (const j of truck.joints) {
    if (arriving) { j.setMotorSpeed(0); j.setMaxMotorTorque(5) }
    else if (dir) { j.setMotorSpeed(-dir * TRUCK.speed); j.setMaxMotorTorque(TRUCK.torque) }
    else { j.setMotorSpeed(0); j.setMaxMotorTorque(1.2) }
  }
  const air = !truck.wheels.some(touching)
  if (dir && air) truck.chassis.applyTorque(dir * TRUCK.air, true)
  $('gasBtn').classList.toggle('on', gas); $('backBtn').classList.toggle('on', back)
  if (gas && $('holdTip').textContent) $('holdTip').textContent = ''
  const spin = Math.abs(truck.wheels[0].getAngularVelocity())
  audio.engine(game.state === 'play' && !arriving ? 0.45 + (dir ? 0.55 : 0) : 0, 46 + spin * 3.2)
}
function handleEvents() {
  for (const e of events) {
    if (e.kind === 'hit') {
      const item = e.item
      if (!item.alive || item.cool > 0 || run.phase !== 'drive') continue
      if (BOT) hits.push([run.course, item.entry.id, Math.round(e.dv * 10) / 10])
      if (e.dv > 2.6) audio.play('soft', clamp(e.dv / 8, 0.2, 0.8), rnd(0.9, 1.2))
      if (item.kind.special === 'startle' && e.dv > 2.4) { item.body.applyLinearImpulse(V(rnd(-0.6, 0.6) * item.body.getMass(), 3 * item.body.getMass()), item.body.getPosition(), true); item.cool = 0.6; continue }
      const bv = item.kind.breakV
      if (!bv || e.dv < bv) continue
      if (item.tiers) { sim.why = `${e.by || ''}${e.dv.toFixed(1)}`; loseTier(item); sim.why = '' }
      else if (item.kind.special === 'explode') explode(item)
      else smash(item)
    } else if (e.kind === 'land') {
      audio.play('land', clamp(e.dv / 9, 0.25, 0.9), rnd(0.9, 1.1)); if (e.dv > 5) { shake(0.2); buzz(25) }
    } else if (e.kind === 'tramp') {
      // The bounce itself never hurts the cargo; only the landing counts.
      for (const i of cargoBodies()) i.cool = Math.max(i.cool, 0.35)
      sim.tramp = (sim.tramp || 0) + 1; { const v = truck.chassis.getLinearVelocity(), q = truck.chassis.getPosition(); sim.tv = `${v.x.toFixed(1)},${v.y.toFixed(1)}@${q.x.toFixed(1)},${q.y.toFixed(1)} t${run.phaseT.toFixed(2)}` }
      for (const b of [truck.chassis, ...truck.wheels, ...cargoBodies().map((i) => i.body)]) { const v = b.getLinearVelocity(); if (v.y < 4.5) b.setLinearVelocity(V(v.x, 5.6)) }
      audio.play('boom', 0.5, 1.6); shake(0.2)
    }
  }
  events.length = 0
}
let gameClock = 0
function updateCargo(dt) {
  gameClock += dt
  for (const item of live) {
    if (!item.alive) continue
    item.cool -= dt
    const p = item.body.getPosition()
    item.group.position.set(p.x, p.y, 0); item.group.rotation.z = item.body.getAngle()
    if (item.group.userData.wobble) { const s = 1 + Math.sin(gameClock * 11) * 0.06; item.group.userData.wobble.scale.set(1 / s, s, 1 / s) }
    if (run.phase === 'drive' && item.kind.special === 'hop') {
      item.hopT -= dt
      if (item.hopT <= 0) { item.hopT = rnd(1.8, 3.6); const m = item.body.getMass(); item.body.applyLinearImpulse(V(rnd(-0.5, 0.5) * m, 2.4 * m), p, true); audio.play('click', 0.3, 1.8) }
    }
    if (run.phase !== 'drive') { item.out = 0; continue }
    const lp = truck.chassis.getLocalPoint(p)
    const inBed = lp.x > -1.75 && lp.x < 0.8 && lp.y > -0.4 && lp.y < 3.4
    item.out = inBed ? 0 : item.out + dt
    if (item.out > 1.1 || p.y < course.killY) lose(item)
  }
}
function updateDebris(dt) {
  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i]; d.t -= dt
    const p = d.body.getPosition(); d.mesh.position.set(p.x, p.y, 0); d.mesh.rotation.z = d.body.getAngle()
    if (d.t <= 0) { scene.remove(d.mesh); world.destroyBody(d.body); debris.splice(i, 1) }
  }
}
function watchTruck(dt) {
  const c = truck.chassis, p = c.getPosition(), a = wrapAngle(c.getAngle())
  if (p.x > course.finishX) { courseClear(); return }
  run.flipT = Math.abs(a) > 1.9 ? run.flipT + dt : 0
  const v = c.getLinearVelocity()
  run.stuckT = Math.hypot(v.x, v.y) < 0.25 && (input.gas || input.back) ? run.stuckT + dt : 0
  if (inPit()) { fellInPit(); return }
  airPraise(dt)
  if (run.flipT > 1.2 || run.stuckT > 5) oops(false, run.flipT > 1.2 ? 'flipped' : 'stuck')
  else if (Math.abs(a) < 0.5 && truck.wheels.every(touching) && course.groundY(p.x) !== null && Math.abs(course.groundY(p.x) - p.y) < 1.4) { if (p.x > run.safeX) { run.safeX = p.x; run.safeY = p.y } }
}
// Air time and flips are praised on landing, but only when the cake came through it whole.
const air = { t: 0, spin: 0, check: 0, what: '', tiers: 0 }
function airPraise(dt) {
  const c = truck.chassis, flying = !truck.wheels.some(touching)
  if (flying) { air.t += dt; air.spin += c.getAngularVelocity() * dt; return }
  if (air.t > 0.5) {
    const flips = Math.abs(air.spin) > Math.PI * 1.6
    air.what = flips ? 'flip' : air.t > 1.1 ? 'bigAir' : 'niceLand'
    air.check = 0.45; air.tiers = run.cakeTiers
  }
  air.t = 0; air.spin = 0
  if (air.check > 0 && (air.check -= dt) <= 0) {
    const ok = run.cakeTiers === air.tiers && run.cakeTiers > 0 && Math.abs(wrapAngle(c.getAngle())) < 0.6
    if (ok && game.state === 'play') {
      const p = c.getPosition()
      pop(t(air.what), null, p.x, p.y + 1.8)
      audio.play('coin', 0.8, air.what === 'niceLand' ? 1.1 : 1.35); buzz(20)
      burst(p.x - 0.4, p.y + 1, air.what === 'niceLand' ? [0xffd23f, 0xffffff] : [0xff4f6d, 0xffd23f, 0x4fc3ff, 0x2ee6a6, 0xffffff], air.what === 'niceLand' ? 14 : 34, 4, 3)
      if (air.what !== 'niceLand') shake(0.15)
    }
  }
}
function botInput() {
  input.gas = false; input.back = false
  if (run.phase !== 'drive') return
  const c = truck.chassis, a = wrapAngle(c.getAngle()), x = c.getPosition().x, v = c.getLinearVelocity()
  const air = !truck.wheels.some(touching)
  // ?bot&human: just hold ▶ like a first-time player.
  if (Q.has('human')) { input.gas = true; return }
  if (air) { if (a > 0.3) input.back = true; else if (a < -0.3) input.gas = true; return }
  input.gas = a < 0.55 && v.x < 7.5
  for (const o of course.objs) {
    const w = o.botWait?.(x) || 0
    if (w === 1) { input.gas = v.x < 2.6; input.back = v.x > 3.4 }
    if (w === 2) { input.gas = false; input.back = v.x > 0.3 }
  }
}

// ---------------------------------------------------------------- camera
const view = { x: 0, y: 0, d: 30, lx: 0, ly: 0 }
function cameraGoal() {
  const aspect = window.innerWidth / Math.max(1, window.innerHeight)
  const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  const fit = (w, h) => Math.max(h, w / aspect) / 2 / tanH
  if (!truck.chassis) return { x: 0, y: 2, d: fit(14, 12), lx: 0, ly: 2 }
  const p = truck.chassis.getPosition(), v = truck.chassis.getLinearVelocity()
  const cam = game.state === 'play' && run.story ? run.storyCam : game.state === 'title' ? 'title' : 'drive'
  if (cam === 'bakery') return { x: -6.5, y: course.startY + 2.2, d: fit(9, 9), lx: -6.5, ly: course.startY + 1.6 }
  if (cam === 'bridge') return { x: 18, y: course.startY + 1, d: fit(22, 14), lx: 20, ly: course.startY }
  if (cam === 'couple' && course.couple) { const cy = course.groundY(course.couple.x); return { x: course.couple.x - 1, y: cy + 2.2, d: fit(10, 9), lx: course.couple.x - 1, ly: cy + 1.4 } }
  if (cam === 'title') { const up = aspect > 1 ? 1.7 : 0; return { x: -7.2, y: course.startY + 2.4 - up, d: fit(9.5, 12), lx: -7.2, ly: course.startY + 2.1 - up } }
  if (cam === 'truck') return { x: p.x - 1, y: p.y + 1.4, d: fit(8.5, 9), lx: p.x - 1, ly: p.y + 0.9 }
  const ahead = clamp(v.x * 0.3, -1.2, 2.6) + 1.3
  const speedZoom = clamp(Math.hypot(v.x, v.y) / 9, 0, 1)
  return { x: p.x + ahead, y: p.y + 1.7, d: fit(7.6 + speedZoom * 2.2, 9.5 + speedZoom * 2), lx: p.x + ahead, ly: p.y + 1.3 }
}
function snapCamera() { Object.assign(view, cameraGoal()); placeCamera(0) }
function placeCamera(dt) {
  const g = cameraGoal(), k = dt ? 1 - Math.exp(-dt * 4.5) : 1
  for (const key of ['x', 'y', 'd', 'lx', 'ly']) view[key] = lerp(view[key], g[key], k)
  shakeT = Math.max(0, shakeT - dt)
  const s = save.shake ? shakeT * 0.6 : 0
  camera.position.set(view.x + rnd(-s, s), view.y + rnd(-s, s) + view.d * 0.06, view.d)
  camera.lookAt(view.lx, view.ly, 0)
}

// ---------------------------------------------------------------- garage
const garage = { i: 0 }
function lockText(d) { const u = d.unlock; return (u.reach ? t('lockReach') : u.clears ? t('lockClears') : t('lockPerfect')).replace('{n}', u.reach || u.clears || u.perfect) }
function showGarage() {
  const d = TRUCKS[garage.i], open = truckOpen(d)
  $('truckName').innerHTML = `<b>${t('truck_' + d.id)}</b><small>${open ? `${garage.i + 1} / ${TRUCKS.length}` : `${t('locked')} · ${lockText(d)}`}</small>`
  $('truckName').classList.toggle('locked', !open)
  $('playBtn').classList.toggle('off', !open)
}
function pickTruck(step) {
  if (game.state !== 'title') return
  garage.i = (garage.i + step + TRUCKS.length) % TRUCKS.length
  const d = TRUCKS[garage.i]
  setTruck(d.id)
  if (truckOpen(d)) { save.truck = d.id; writeSave() }
  loadCourse(0)
  audio.play('click', 0.6, 1.1)
}

// ---------------------------------------------------------------- hud
function sync() {
  $('playBtn').textContent = t('play')
  $('tagline').textContent = t('tagline')
  $('bestBox').textContent = save.bestTime ? `${t('best')} ${fmt(save.bestTime)}` : save.reach ? `${t('farthest')} ${save.reach} / ${COURSES.length}` : ''
  showGarage()
  $('pauseTitle').textContent = t('paused'); $('resumeBtn').textContent = t('resume'); $('quitBtn').textContent = t('quit')
  $('panelClose').textContent = t('close')
  if (game.state !== 'play') return
  $('courseText').textContent = `${t('course')} ${run.course + 1} / ${COURSES.length}`
  $('cargo').innerHTML = run.items.map((e) => e.id === CAKE
    ? `<span class="${run.cakeTiers ? '' : 'gone'}"><img src="${cakeThumb(run.cakeTiers)}" alt=""><i>${run.cakeTiers}</i></span>`
    : `<span class="${e.alive ? '' : 'gone'}"><img src="${thumbs[e.id] || ''}" alt=""></span>`).join('')
}
let lastClock = ''
function syncClock() {
  const left = Math.max(0, LIMIT - run.time)
  const text = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`
  if (text !== lastClock) { $('clock').textContent = text; lastClock = text; $('clock').classList.toggle('low', left < 30) }
}

// ---------------------------------------------------------------- thumbnails
const thumbs = {}, cakeThumbs = []
function makeThumbs() {
  const size = 96
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
  r.setSize(size, size, false); r.outputColorSpace = THREE.SRGBColorSpace
  const s = new THREE.Scene(); s.add(new THREE.HemisphereLight(0xffffff, 0x8a7a99, 1.8)); const l = new THREE.DirectionalLight(0xffffff, 1.4); l.position.set(-2, 4, 5); s.add(l)
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50)
  const tw = new pl.World()
  const shoot = (group) => {
    s.add(group)
    group.rotation.set(0.25, -0.5, 0)
    const bb = new THREE.Box3().setFromObject(group), c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3())
    const d = Math.max(sz.x, sz.y, sz.z) * 2.3 + 0.2
    cam.position.set(c.x, c.y + d * 0.1, c.z + d); cam.lookAt(c)
    r.render(s, cam)
    s.remove(group)
    return r.domElement.toDataURL()
  }
  for (const [id, k] of Object.entries(KINDS)) if (id !== CAKE) thumbs[id] = shoot(k.make(tw, 0, 0).group)
  for (let n = 0; n <= 3; n++) {
    const made = KINDS.cake.make(tw, 0, 0)
    while (made.tiers.length > Math.max(1, n)) made.group.remove(made.tiers.pop().group)
    if (n === 0) made.group.traverse((o) => { if (o.material) o.material = mat(0x9a8a7a) })
    cakeThumbs[n] = shoot(made.group)
  }
  thumbs[CAKE] = cakeThumbs[3]
  r.dispose()
}
const cakeThumb = (n) => cakeThumbs[clamp(n, 0, 3)]

// ---------------------------------------------------------------- menus
function pauseGame() {
  if (game.state !== 'play') return
  game.state = 'pause'; show('pause'); audio.engine(0, 50)
  platform.message('gameplay_stopped')
}
function resumeGame() {
  if (game.state !== 'pause') return
  game.state = 'play'; hide('pause'); last = performance.now()
  platform.message('gameplay_started')
}
function openSettings() {
  hide('title'); show('panel')
  $('panelTitle').textContent = t('settings')
  const host = $('panelBody'); host.innerHTML = ''
  const row = (label, el) => { const d = document.createElement('label'); d.className = 'opt'; d.textContent = label; d.appendChild(el); host.appendChild(d) }
  const slider = (keyName) => { const s = document.createElement('input'); s.type = 'range'; s.min = 0; s.max = 1; s.step = 0.05; s.value = save[keyName]; s.oninput = () => { save[keyName] = +s.value; applyVolume(); writeSave() }; return s }
  row(t('music'), slider('music')); row(t('sfx'), slider('sfx'))
  const toggle = document.createElement('button'); toggle.className = 'sub'; toggle.textContent = save.shake ? t('on') : t('off')
  toggle.onclick = () => { save.shake = save.shake ? 0 : 1; writeSave(); toggle.textContent = save.shake ? t('on') : t('off') }
  row(t('shake'), toggle)
  const langBtn = document.createElement('button'); langBtn.className = 'sub'; langBtn.textContent = LANGUAGES[lang]
  langBtn.onclick = () => { lang = LANG_KEYS[(LANG_KEYS.indexOf(lang) + 1) % LANG_KEYS.length]; save.lang = lang; writeSave(); sync(); openSettings() }
  row(t('language'), langBtn)
  if (document.fullscreenEnabled) {
    const fs = document.createElement('button'); fs.className = 'sub'; fs.textContent = document.fullscreenElement ? t('on') : t('off')
    fs.onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen() } catch {} ; fs.textContent = document.fullscreenElement ? t('on') : t('off') }
    row(t('fullscreen'), fs)
  }
  sync()
}

// ---------------------------------------------------------------- input
const tap = (id, fn) => $(id).addEventListener('click', () => { audio.unlock(); audio.play('click', 0.5); fn() })
tap('playBtn', startRun)
tap('truckPrev', () => pickTruck(-1))
tap('truckNext', () => pickTruck(1))
tap('setBtn', openSettings)
tap('panelClose', () => { hide('panel'); if (game.state === 'title') show('title') })
tap('againBtn', startRun)
tap('homeBtn', goHome)
tap('pauseBtn', pauseGame)
tap('resumeBtn', resumeGame)
tap('quitBtn', () => { hide('pause'); game.state = 'play'; fail('cake') })
tap('skipBtn', () => run.story?.skip())
$('story').addEventListener('click', (e) => { if (e.target.id !== 'skipBtn') run.story?.next() })
tap('contBtn', () => platform.rewardedAd((ok) => {
  if (!ok) return
  run.continued = true
  if (run.reason === 'time') run.time = Math.max(0, run.time - 60)
  else { run.cakeTiers = 1; const cake = run.items.find((e) => e.id === CAKE); cake.alive = true }
  run.reason = ''
  game.state = 'play'; hide('result'); show('hud'); audio.music('drive'); platform.message('gameplay_started')
  loadCourse(run.course, { at: continueX() })
  run.phase = 'ready'; run.phaseT = 0; run.safeX = truck.chassis.getPosition().x
  sync()
}))
for (const [id, keyName] of [['gasBtn', 'gas'], ['backBtn', 'back']]) {
  const el = $(id)
  const on = (e) => { e.preventDefault(); audio.unlock(); input[keyName] = true; el.setPointerCapture?.(e.pointerId) }
  const off = () => { input[keyName] = false }
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off)
}
window.addEventListener('keydown', (e) => {
  input.keys.add(e.code)
  if (e.code === 'KeyP') { if (game.state === 'play') pauseGame(); else if (game.state === 'pause') resumeGame() }
  if ((e.code === 'Space' || e.code === 'Enter') && run.story) { e.preventDefault(); run.story.next() }
})
window.addEventListener('keyup', (e) => input.keys.delete(e.code))
window.addEventListener('blur', () => { input.keys.clear(); input.gas = input.back = false })
window.addEventListener('pointerdown', () => audio.unlock())

function resize() {
  const w = window.innerWidth, h = window.innerHeight
  renderer.setSize(w, h, false)
  camera.aspect = w / h; camera.updateProjectionMatrix()
}
window.addEventListener('resize', resize)

// ---------------------------------------------------------------- loop
let last = performance.now()
function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min(0.05, (now - last) / 1000); last = now
  if (game.state === 'play') { updatePlay(dt); syncClock() }
  else if (game.state === 'title' || game.state === 'result') {
    acc += dt
    while (acc >= STEP) { world.step(STEP, 8, 3); acc -= STEP; events.length = 0 }
    for (const o of course.objs) o.update(dt, objCtx)
    updateCargo(dt); updateDebris(dt); syncTruck(); drive(dt)
  }
  updateParts(dt)
  if (course?.chef) course.chef.rotation.z = Math.sin(now / 300) * 0.06
  if (course?.couple) { course.couple.bride.position.y = Math.abs(Math.sin(now / 260)) * 0.15; course.couple.groom.position.y = Math.abs(Math.sin(now / 260 + 1)) * 0.15 }
  placeCamera(dt)
  renderer.render(scene, camera)
}

async function boot() {
  const bar = $('loadbar'); bar.style.width = '30%'
  await platform.init()
  bar.style.width = '60%'
  await readSave()
  { const d = TRUCKS.find((x) => x.id === (Q.get('truck') || save.truck)); if (d && (truckOpen(d) || BOT)) { setTruck(d.id); garage.i = TRUCKS.indexOf(d) } }
  const want = Q.get('lang') || save.lang || (platform.ready ? window.bridge.platform.language : navigator.language) || 'en'
  lang = LANG_KEYS.includes(Q.get('lang')) ? Q.get('lang') : LANG_KEYS.includes(save.lang) ? save.lang : (LANG_KEYS.find((k) => String(want).toLowerCase().startsWith(k)) || 'en')
  makeThumbs()
  resize()
  run.items = pickItems()
  loadCourse(0)
  game.state = 'title'
  sync()
  bar.style.width = '100%'
  requestAnimationFrame((n) => { last = n; frame(n) })
  requestAnimationFrame(() => {
    hide('loading'); platform.message('game_ready')
    if (BOT) startRun()
    else { show('title'); audio.music('lobby') }
  })
}
boot()
// ---------------------------------------------------------------- pass test
// Difficulty is about throttle control: a road should be cleared by careful forward/back driving,
// and holding forward alone should not be enough on the later roads. simAll() drives every road
// with several driving styles, without drawing, and reports what each style achieved.
const sim = { policy: null }
function simInput(pol) {
  const c = truck.chassis, a = wrapAngle(c.getAngle()), v = c.getLinearVelocity(), x = c.getPosition().x
  input.gas = input.back = false
  if (pol.hold) { input.gas = true; return }
  const air = !truck.wheels.some(touching)
  if (air) { if (a > 0.22) input.back = true; else if (a < -0.22) input.gas = true; return }
  // Smart styles: full speed when a gap is coming up (a jump), slow everywhere else.
  let want = pol.v
  if (pol.slow) { want = pol.slow; for (let dx = 2; dx < 16; dx += 0.5) if (course.groundY(x + dx) === null) { want = pol.fast; break } }
  input.gas = v.x < want && a < 0.6
  input.back = v.x > want + 1.2
  for (const o of course.objs) {
    const w = o.botWait?.(x) || 0
    if (w === 1) { input.gas = v.x < 2.6; input.back = v.x > 3.4 }
    if (w === 2) { input.gas = false; input.back = v.x > 0.3 }
  }
}
const POLICIES = [{ name: 'hold', hold: true }, ...[3.5, 5, 6.5, 7.25, 8, 9.5].map((v) => ({ name: `v${v}`, v })), { name: 'smart4', slow: 4, fast: 9.5 }, { name: 'smart5', slow: 5, fast: 8.5 }, { name: 'smart6', slow: 6, fast: 9.5 }]
function simCourse(index, pol, ids) {
  run.items = ids.map((id) => ({ id, alive: true })); run.cakeTiers = 3; run.time = 0; run.continued = false
  game.state = 'sim'; sim.policy = pol
  loadCourse(index); run.phase = 'drive'; run.phaseT = 0
  let t = 0, oopsN = 0, out = 'timeout'
  while (t < 60) {
    run.phaseT += STEP; run.time += STEP
    if (run.phase === 'oops' && run.phaseT > 1) { restartCourse(); oopsN++ }
    if (run.phase === 'ready') run.phase = 'drive'
    drive(STEP)
    world.step(STEP, 8, 3); handleEvents()
    for (const o of course.objs) o.update(STEP, objCtx)
    updateCargo(STEP); updateDebris(STEP)
    if (run.phase === 'drive') watchTruck(STEP)
    if (run.phase === 'clear' || run.phase === 'arrive') { out = 'clear'; break }
    if (run.phase === 'fail') { out = run.reason; break }
    t += STEP
  }
  sim.policy = null; input.gas = input.back = false
  run.phase = 'idle'
  const tp = truck.chassis.getPosition()
  const tr = sim.tramp || 0; sim.tramp = 0; const lostAt = (sim.lost || []).join(' '); sim.lost = []
  return { at: `${Math.round(tp.x)},${Math.round(tp.y)} tr${tr} ${sim.tv}`, lostAt, course: index + 1, style: pol.name, out, time: Math.round(t * 10) / 10, cake: run.cakeTiers, items: run.items.filter((e) => e.alive && e.id !== CAKE).length, oops: oopsN }
}
async function simAll(ids = [CAKE, 'eggs', 'vase', 'watermelon', 'balloons'], only = null, truckId = 'bakery') {
  const rows = [], keep = truckDef.id
  setTruck(truckId)
  for (let i = 0; i < COURSES.length; i++) {
    if (only && !only.includes(i + 1)) continue
    for (const pol of POLICIES) { rows.push(simCourse(i, pol, ids)); await new Promise((r) => setTimeout(r, 0)) }
  }
  game.state = 'title'; run.items = pickItems(); run.cakeTiers = 3; setTruck(keep); loadCourse(0)
  return rows
}
if (BOT || Q.has('debug')) window.__bd = { hits, thumbs, game, run, save, truck, get course() { return course }, get live() { return live }, startRun, loadCourse, simAll }
