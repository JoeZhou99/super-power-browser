export function watchModelIdle({ blocked, warn, timeout, warningMs = 60000, timeoutMs = 120000, phaseMaxMs = 180000 }) {
  let last = Date.now(), phaseStart = last, warned = false
  const touch = () => { const wasWarned = warned; last = Date.now(); warned = false; return wasWarned }
  const timer = setInterval(() => {
    if (blocked()) { touch(); phaseStart = Date.now(); return }
    const elapsed = Date.now() - last
    if (Date.now() - phaseStart >= phaseMaxMs) { clearInterval(timer); timeout('phase'); return }
    if (elapsed >= timeoutMs) { clearInterval(timer); timeout('idle'); return }
    if (elapsed >= warningMs && !warned) { warned = true; warn() }
  }, 1000)
  timer.unref?.()
  return { touch, nextPhase: () => { touch(); phaseStart = Date.now() }, dispose: () => clearInterval(timer) }
}
