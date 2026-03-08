import { useState, useEffect, useCallback } from 'react'
import styles from './App.module.css'

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// restDay: true  → task is excluded every Sunday (your rest day)
// category colors map to CSS vars
const TASKS = [
  { id: 'workout', label: 'Workout (PPL Split)',  icon: '🏋️', cat: 'gym',  restDay: true  },
  { id: 'study',   label: 'Study / School Work',  icon: '📚', cat: 'mind', restDay: false },
  { id: 'read',    label: 'Read for 20 Minutes',  icon: '📖', cat: 'mind', restDay: false },
  { id: 'diet',    label: 'No Junk Food',          icon: '🥗', cat: 'body', restDay: false },
  { id: 'water',   label: 'Drink 3L Water',        icon: '💧', cat: 'body', restDay: false },
  { id: 'sleep',   label: 'Sleep Before 11 PM',   icon: '🌙', cat: 'body', restDay: false },
]

const CAT_COLOR = {
  gym:  { bg: '#D4EDD0', text: '#3E7A38', border: '#A8C5A0' },
  mind: { bg: '#D6DFF5', text: '#3A4E8A', border: '#9AAAE0' },
  body: { bg: '#D0EDE5', text: '#2A6E5A', border: '#8CCFC0' },
}

const STORAGE_KEY = 'premlog-history-v1'

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────
const pad      = n => String(n).padStart(2, '0')
const toKey    = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
const todayKey = ()  => toKey(new Date())
const offset   = (key, days) => {
  const d = new Date(key + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toKey(d)
}
const isSunday = key => new Date(key + 'T00:00:00').getDay() === 0
const fmtLong  = key => new Date(key + 'T00:00:00').toLocaleDateString('en-IN', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
})
const fmtDay   = key => new Date(key + 'T00:00:00').getDate()
const fmtShort = key => new Date(key + 'T00:00:00').toLocaleDateString('en-IN', {
  day: 'numeric', month: 'short'
})

// ─── LOGIC ────────────────────────────────────────────────────────────────────
function activeTasks(key) {
  return TASKS.filter(t => !(t.restDay && isSunday(key)))
}

// Returns: 'complete' | 'compromise' | 'missed' | 'rest'
function dayStatus(key, map = {}) {
  if (isSunday(key) && activeTasks(key).length === 0) return 'rest'
  const tasks = activeTasks(key)
  const done  = tasks.filter(t => map[t.id]).length
  if (done >= tasks.length)     return 'complete'
  if (done >= tasks.length - 1) return 'compromise'
  return 'missed'
}

function calcStreak(history) {
  let streak = 0
  let check  = todayKey()
  const todayGood = ['complete', 'compromise'].includes(dayStatus(check, history[check] || {}))
  if (!todayGood) check = offset(check, -1)
  while (true) {
    const st = dayStatus(check, history[check] || {})
    if (['complete', 'compromise'].includes(st)) { streak++; check = offset(check, -1) }
    else break
  }
  return streak
}

function calcBest(history) {
  const days = Object.keys(history).sort()
  let max = 0, cur = 0, prev = null
  for (const d of days) {
    const ok = ['complete', 'compromise'].includes(dayStatus(d, history[d] || {}))
    if (ok) {
      cur = (prev && offset(prev, 1) === d) ? cur + 1 : 1
      max = Math.max(max, cur)
      prev = d
    } else { cur = 0; prev = null }
  }
  return max
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function LeafIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M14 4C14 4 6 9 6 17a8 8 0 0016 0C22 9 14 4 14 4z" fill="#A8C5A0" opacity="0.8"/>
      <path d="M14 10C14 10 10 14 10 18a4 4 0 008 0C18 14 14 10 14 10z" fill="#7FA876" opacity="0.6"/>
      <line x1="14" y1="26" x2="14" y2="14" stroke="#7FA876" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function CheckIcon({ color = '#fff' }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12">
      <path d="M2 6l3 3 5-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

function CalCell({ dateKey, history, today }) {
  const rest = isSunday(dateKey)
  const map  = history[dateKey] || {}
  const st   = dayStatus(dateKey, map)
  const isT  = dateKey === today
  const dayNum = fmtDay(dateKey)

  let bg, border, color, boxShadow = 'none', title = fmtShort(dateKey)

  if (isT) {
    const good = ['complete','compromise'].includes(st)
    bg     = good ? '#A8C5A0' : 'transparent'
    border = good ? 'none' : '1.5px solid #A8C5A0'
    color  = good ? '#fff' : '#A8C5A0'
    boxShadow = good ? '0 2px 8px rgba(168,197,160,0.4)' : 'none'
    title += ' (today)'
  } else if (st === 'complete') {
    bg = '#A8C5A0'; border = 'none'; color = '#fff'
    boxShadow = '0 1px 6px rgba(168,197,160,0.35)'
  } else if (st === 'compromise') {
    bg = '#C4A55A'; border = 'none'; color = '#fff'
    boxShadow = '0 1px 6px rgba(196,165,90,0.35)'
  } else if (rest) {
    bg = '#EDE7DC'; border = '1px solid rgba(0,0,0,0.04)'; color = '#C8BEB4'
  } else {
    bg = '#E8E2D8'; border = '1px solid rgba(0,0,0,0.05)'; color = '#C0B8B0'
  }

  return (
    <div
      title={title}
      style={{
        aspectRatio: '1',
        borderRadius: 6,
        background: bg,
        border,
        boxShadow,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 9,
        fontWeight: 700,
        color,
        transition: 'transform 0.12s',
        cursor: 'default',
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.25)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {dayNum}
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [history, setHistory] = useState({})
  const [loaded,  setLoaded]  = useState(false)
  const [burst,   setBurst]   = useState(false)

  const today    = todayKey()
  const todayMap = history[today] || {}
  const tasks    = activeTasks(today)
  const rest     = isSunday(today)
  const doneCnt  = tasks.filter(t => todayMap[t.id]).length
  const todaySt  = dayStatus(today, todayMap)
  const dayGood  = ['complete', 'compromise'].includes(todaySt)
  const streak   = loaded ? calcStreak(history) : 0
  const best     = loaded ? calcBest(history)   : 0
  const totalDays = Object.keys(history).filter(
    d => ['complete', 'compromise'].includes(dayStatus(d, history[d] || {}))
  ).length
  const pct = tasks.length ? (doneCnt / tasks.length) * 100 : 0
  const compromiseUsed = doneCnt === tasks.length - 1

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setHistory(JSON.parse(raw))
    } catch {}
    setLoaded(true)
  }, [])

  const save = useCallback(h => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(h)) } catch {}
  }, [])

  const toggle = id => {
    const cur  = history[today] || {}
    const upd  = { ...cur, [id]: !cur[id] }
    const newH = { ...history, [today]: upd }
    const wasGood = ['complete','compromise'].includes(dayStatus(today, cur))
    const nowGood = ['complete','compromise'].includes(dayStatus(today, upd))
    if (!wasGood && nowGood) { setBurst(true); setTimeout(() => setBurst(false), 900) }
    setHistory(newH)
    save(newH)
  }

  // 35-day calendar
  const calDays = Array.from({ length: 35 }, (_, i) => offset(today, -(34 - i)))
  const weekLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  if (!loaded) return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F5F0E8', fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ color: '#A8C5A0', letterSpacing: 4, fontSize: 12, textTransform: 'uppercase' }}>
        Loading...
      </div>
    </div>
  )

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#F5F0E8',
      fontFamily: "'DM Sans', sans-serif",
      color: '#2C2620',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes fadeUp   { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        @keyframes popIn    { from { opacity:0; transform:scale(0.6) } to { opacity:1; transform:scale(1) } }
        @keyframes shimmer  { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes softPulse{ 0%,100%{box-shadow:0 4px 20px rgba(168,197,160,0.2)} 50%{box-shadow:0 4px 32px rgba(168,197,160,0.45)} }
      `}</style>

      {/* ══════════════ SIDEBAR ══════════════ */}
      <aside style={{
        width: 310,
        flexShrink: 0,
        background: '#EDE7DC',
        borderRight: '1px solid rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        padding: '36px 24px 28px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle texture overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `radial-gradient(circle at 20% 10%, rgba(168,197,160,0.12) 0%, transparent 60%),
                            radial-gradient(circle at 80% 90%, rgba(196,165,90,0.08) 0%, transparent 50%)`,
        }}/>

        {/* Logo */}
        <div style={{ marginBottom: 36, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LeafIcon />
            <div>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1,
              }}>
                PREM<span style={{ color: '#A8C5A0' }}>.LOG</span>
              </div>
              <div style={{ fontSize: 10, color: '#B0A89C', marginTop: 2, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Discipline Tracker
              </div>
            </div>
          </div>
        </div>

        {/* Streak card */}
        <div style={{
          background: burst
            ? 'linear-gradient(140deg, #D4EDD0, #E8F5E4)'
            : 'linear-gradient(140deg, #EAE3D6, #E2DAC8)',
          border: `1px solid ${burst ? 'rgba(168,197,160,0.6)' : 'rgba(0,0,0,0.06)'}`,
          borderRadius: 18,
          padding: '24px 22px',
          marginBottom: 12,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: burst ? '0 4px 24px rgba(168,197,160,0.35)' : '0 2px 12px rgba(44,38,32,0.07)',
          transition: 'all 0.4s ease',
        }}>
          {/* Ghost number bg */}
          <div style={{
            position: 'absolute', right: -8, bottom: -20,
            fontFamily: "'Playfair Display', serif",
            fontSize: 100, fontWeight: 800, lineHeight: 1,
            color: 'rgba(168,197,160,0.12)', pointerEvents: 'none', userSelect: 'none',
          }}>{streak}</div>

          <div style={{ fontSize: 10, color: '#B0A89C', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            Current Streak
          </div>

          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 60, fontWeight: 800, lineHeight: 1,
            color: streak > 0 ? '#7FA876' : '#C0B8B0',
            animation: burst ? 'popIn 0.4s ease' : 'none',
          }}>
            {streak}
          </div>

          <div style={{ fontSize: 13, color: '#B0A89C', marginTop: 8, fontStyle: 'italic' }}>
            {streak === 0
              ? 'Begin your streak today.'
              : streak === 1
              ? 'One day in — keep it going.'
              : `${streak} days of discipline.`}
          </div>

          {rest && (
            <div style={{
              marginTop: 14,
              background: 'rgba(154,170,224,0.12)',
              border: '1px solid rgba(154,170,224,0.25)',
              borderRadius: 8, padding: '7px 12px',
              fontSize: 11, color: '#6A7AB5',
            }}>
              Sunday rest — workout excluded automatically
            </div>
          )}
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 26 }}>
          {[
            { label: 'Best Streak', value: best,      sub: 'days',  accent: '#C4A55A' },
            { label: 'Total Days',  value: totalDays, sub: 'done',  accent: '#A8C5A0' },
          ].map((s, i) => (
            <div key={i} style={{
              background: '#EAE3D6',
              border: '1px solid rgba(0,0,0,0.05)',
              borderRadius: 14, padding: '16px 14px',
              boxShadow: '0 1px 6px rgba(44,38,32,0.06)',
              animation: `fadeUp 0.5s ${i * 0.08 + 0.1}s ease both`,
            }}>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 30, fontWeight: 700, lineHeight: 1,
                color: s.accent,
              }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#B0A89C', marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Heatmap */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: '#B0A89C', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            35-Day History
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 5 }}>
            {weekLabels.map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 8, color: '#C0B8B0', fontWeight: 700 }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {calDays.map(d => (
              <CalCell key={d} dateKey={d} history={history} today={today} />
            ))}
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            {[['#A8C5A0','Complete'],['#C4A55A','1 Skip'],['#EDE7DC','Rest']].map(([c,l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: '#B0A89C' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: c, border: '1px solid rgba(0,0,0,0.06)' }}/>
                {l}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ══════════════ MAIN PANEL ══════════════ */}
      <main style={{
        flex: 1, padding: '44px 52px',
        overflowY: 'auto', display: 'flex', flexDirection: 'column',
        maxHeight: '100vh',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', marginBottom: 40,
          animation: 'fadeUp 0.4s ease both',
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#B0A89C', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              {fmtLong(today)}
            </div>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05,
              color: '#2C2620',
            }}>
              {rest
                ? <>Rest &amp; <span style={{ color: '#9AAAE0' }}>Recover</span></>
                : dayGood
                ? <><span style={{ color: '#7FA876' }}>Day Complete</span> ✦</>
                : <>Lock In,<br /><span style={{ color: '#A8C5A0' }}>Prem</span></>
              }
            </h1>
          </div>

          {/* Compromise badge */}
          <div style={{
            animation: 'fadeUp 0.4s 0.08s ease both',
            background: doneCnt === tasks.length
              ? 'linear-gradient(135deg, #D4EDD0, #DCF2D8)'
              : compromiseUsed
              ? 'linear-gradient(135deg, #F0E8D0, #F5EDD8)'
              : '#EAE3D6',
            border: `1px solid ${doneCnt === tasks.length ? 'rgba(168,197,160,0.4)' : compromiseUsed ? 'rgba(196,165,90,0.3)' : 'rgba(0,0,0,0.06)'}`,
            borderRadius: 16, padding: '18px 22px', minWidth: 175,
            boxShadow: '0 2px 12px rgba(44,38,32,0.07)',
          }}>
            <div style={{ fontSize: 10, color: '#B0A89C', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>
              Daily Skip
            </div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 20, fontWeight: 700,
              color: doneCnt === tasks.length ? '#7FA876' : compromiseUsed ? '#C4A55A' : '#2C2620',
            }}>
              {doneCnt === tasks.length
                ? 'Not Used ✓'
                : compromiseUsed
                ? 'Used ⚠️'
                : '1 Available'}
            </div>
            <div style={{ fontSize: 11, color: '#B0A89C', marginTop: 4 }}>
              {doneCnt === tasks.length
                ? 'perfect day'
                : compromiseUsed
                ? 'streak still safe'
                : 'you can skip 1 task'}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 32, animation: 'fadeUp 0.4s 0.05s ease both' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: '#B0A89C', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Today's Progress
            </span>
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: dayGood ? '#7FA876' : pct > 50 ? '#C4A55A' : '#D4A5A0',
            }}>
              {doneCnt} / {tasks.length} tasks
            </span>
          </div>
          <div style={{
            background: '#E2DAC8', borderRadius: 99, height: 5,
            overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
          }}>
            <div style={{
              height: '100%', borderRadius: 99,
              width: `${pct}%`,
              background: dayGood
                ? 'linear-gradient(90deg, #A8C5A0, #7FA876)'
                : 'linear-gradient(90deg, #C4A55A, #DFC080)',
              transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
              boxShadow: dayGood ? '0 0 6px rgba(168,197,160,0.5)' : '0 0 6px rgba(196,165,90,0.4)',
            }}/>
          </div>
        </div>

        {/* Task list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
          {TASKS.map((task, i) => {
            const excluded = task.restDay && rest
            const done     = !!todayMap[task.id]
            const cc       = CAT_COLOR[task.cat]

            return (
              <div
                key={task.id}
                onClick={() => !excluded && toggle(task.id)}
                style={{
                  animation: `fadeUp 0.45s ${i * 0.055 + 0.12}s ease both`,
                  background: excluded
                    ? '#EAE3D6'
                    : done
                    ? `linear-gradient(135deg, ${cc.bg}, #EAE3D6)`
                    : '#EAE3D6',
                  border: `1px solid ${excluded ? 'rgba(0,0,0,0.04)' : done ? cc.border : 'rgba(0,0,0,0.07)'}`,
                  borderLeft: `3px solid ${excluded ? 'rgba(0,0,0,0.04)' : done ? cc.border : 'rgba(0,0,0,0.08)'}`,
                  borderRadius: 14, padding: '17px 22px 17px 18px',
                  display: 'flex', alignItems: 'center', gap: 16,
                  opacity: excluded ? 0.45 : 1,
                  cursor: excluded ? 'default' : 'pointer',
                  userSelect: 'none',
                  boxShadow: done
                    ? `0 2px 10px rgba(${task.cat === 'gym' ? '168,197,160' : task.cat === 'mind' ? '154,170,224' : '140,207,192'},0.2)`
                    : '0 1px 4px rgba(44,38,32,0.06)',
                  transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.15s',
                }}
                onMouseEnter={e => !excluded && (e.currentTarget.style.transform = 'translateX(3px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateX(0)')}
              >
                {/* Checkbox */}
                {!excluded && (
                  <div style={{
                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                    border: done ? 'none' : '1.5px solid rgba(0,0,0,0.15)',
                    background: done ? cc.border : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: done ? `0 2px 8px ${cc.border}66` : 'none',
                    transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                  }}>
                    {done && <CheckIcon color="#fff" />}
                  </div>
                )}

                {/* Emoji */}
                <div style={{
                  fontSize: 22, lineHeight: 1, flexShrink: 0,
                  filter: excluded ? 'grayscale(1) opacity(0.5)' : 'none',
                }}>
                  {task.icon}
                </div>

                {/* Label */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 15, fontWeight: done ? 500 : 400,
                    letterSpacing: '-0.01em',
                    color: done ? '#2C2620' : excluded ? '#B0A89C' : '#5A504A',
                    textDecoration: 'none',
                  }}>
                    {task.label}

                    {task.restDay && !excluded && (
                      <span style={{
                        marginLeft: 10, fontSize: 10, color: '#9AAAE0',
                        background: 'rgba(154,170,224,0.12)',
                        padding: '2px 8px', borderRadius: 99,
                      }}>
                        Mon–Sat
                      </span>
                    )}
                    {excluded && (
                      <span style={{
                        marginLeft: 10, fontSize: 10, color: '#C0B8B0',
                        background: 'rgba(0,0,0,0.04)',
                        padding: '2px 8px', borderRadius: 99,
                      }}>
                        Rest Day
                      </span>
                    )}
                  </div>
                </div>

                {/* Category pill */}
                <div style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: cc.text, background: cc.bg,
                  padding: '4px 11px', borderRadius: 99, flexShrink: 0,
                  opacity: excluded ? 0.4 : 1,
                  border: `1px solid ${cc.border}66`,
                }}>
                  {task.cat}
                </div>

                {/* Done marker */}
                {done && (
                  <div style={{
                    color: cc.border, fontSize: 16, flexShrink: 0,
                    animation: 'shimmer 2s infinite',
                  }}>
                    ✦
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Rules footer */}
        <div style={{
          marginTop: 30,
          background: '#EAE3D6',
          border: '1px solid rgba(0,0,0,0.05)',
          borderRadius: 14, padding: '14px 24px',
          display: 'flex', gap: 0, flexWrap: 'wrap',
          boxShadow: '0 1px 6px rgba(44,38,32,0.05)',
        }}>
          {[
            { icon: '✦', text: 'All tasks done → streak +1', c: '#7FA876' },
            { icon: '◈', text: 'Skip 1 task → still safe',   c: '#C4A55A' },
            { icon: '✕', text: 'Skip 2+ → streak resets',    c: '#D4A5A0' },
            { icon: '○', text: 'Sunday → workout excluded',   c: '#9AAAE0' },
          ].map(({ icon, text, c }, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 11, color: '#B0A89C',
              flex: '1 1 0', padding: '3px 0',
              borderRight: i < 3 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              paddingRight: 20, paddingLeft: i > 0 ? 20 : 0,
            }}>
              <span style={{ fontSize: 13, color: c, flexShrink: 0 }}>{icon}</span>
              {text}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
