// Trucks to unlock. Each one drives differently; controls stay the same (forward / back).
// unlock: reach = farthest road reached, clears = deliveries, perfect = deliveries with the whole cake.
export const TRUCKS = [
  { id: 'bakery', unlock: null, speed: 20, torque: 15, air: 9, hz: 4.2, damp: 0.72, wheelR: 0.42, density: 3.2, body: 0xff8fb1, trim: 0xfff1dc, rail: 0xff4f6d, driver: 'dog', cap: 0xff4f6d },
  { id: 'icecream', unlock: { reach: 3 }, speed: 20.5, torque: 16, air: 9, hz: 3.4, damp: 0.9, wheelR: 0.42, density: 3.2, body: 0xa8e6ff, trim: 0xffffff, rail: 0xff8fb1, driver: 'bunny', extra: 'cone' },
  { id: 'monster', unlock: { reach: 5 }, speed: 19, torque: 22, air: 11, hz: 4.2, damp: 0.72, wheelR: 0.45, density: 3.2, body: 0x7ed957, trim: 0x2b1d3a, rail: 0xffd23f, driver: 'bear', extra: 'flames' },
  { id: 'fire', unlock: { clears: 1 }, speed: 23, torque: 20, air: 9, hz: 4.2, damp: 0.78, wheelR: 0.42, density: 4.2, body: 0xff4f4f, trim: 0xffd23f, rail: 0xffffff, driver: 'dog', cap: 0xffd23f, extra: 'siren' },
  { id: 'milk', unlock: { clears: 3 }, speed: 23.5, torque: 13, air: 14, hz: 4.2, damp: 0.8, wheelR: 0.38, density: 2.7, body: 0xffffff, trim: 0x4fc3ff, rail: 0x4fc3ff, driver: 'cat', extra: 'bottle' },
  { id: 'gold', unlock: { perfect: 1 }, speed: 22, torque: 18, air: 11, hz: 4.0, damp: 0.82, wheelR: 0.44, density: 3.4, body: 0xffd23f, trim: 0xfff3a8, rail: 0xff9f1c, driver: 'bear', extra: 'crown' },
]
