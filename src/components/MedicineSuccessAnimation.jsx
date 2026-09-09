import { useEffect, useState, useMemo } from 'react'
import './MedicineSuccessAnimation.css'

// Vibrant color palette matching existing app colors and vibrant accents
const COLORS = [
  '#2563eb', // Blue
  '#10b981', // Emerald Green
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#ef4444', // Red
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Bright Blue
  '#a855f7'  // Bright Purple
]

// SVG Particle Icons for medical elements
function CapsuleSvg({ color, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="9" width="14" height="6" rx="3" fill={color} fillOpacity="0.85" transform="rotate(-30 12 12)" />
      <path d="M7 10L14 14" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" transform="rotate(-30 12 12)" />
    </svg>
  )
}

function TabletSvg({ color, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8" fill={color} fillOpacity="0.9" />
      <line x1="12" y1="6" x2="12" y2="18" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.7" />
    </svg>
  )
}

function CrossSvg({ color, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 4H15V9H20V15H15V20H9V15H4V9H9V4Z"
        fill={color}
        fillOpacity="0.85"
      />
    </svg>
  )
}

function SparkleSvg({ color, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
        fill={color}
        fillOpacity="0.9"
      />
    </svg>
  )
}

function PlusSvg({ color, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 5V19M5 12H19" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}

function CircleDotSvg({ color, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6" fill={color} fillOpacity="0.9" />
    </svg>
  )
}

function PillOvalSvg({ color, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="16" rx="8" fill={color} fillOpacity="0.85" />
      <path d="M14 0V16" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.6" />
    </svg>
  )
}

// Particle generator helper
function generateParticles(count = 52) {
  const types = ['capsule', 'tablet', 'cross', 'sparkle', 'plus', 'dot', 'oval']
  const items = []

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)]
    const color = COLORS[Math.floor(Math.random() * COLORS.length)]
    const left = Math.floor(Math.random() * 90) + 5 // 5% to 95%
    const size = Math.floor(Math.random() * 14) + 14 // 14px to 28px
    const duration = (Math.random() * 1.5 + 1.8).toFixed(2) // 1.8s to 3.3s
    const delay = (Math.random() * 0.6).toFixed(2) // 0s to 0.6s
    const drift = Math.floor(Math.random() * 120) - 60 // -60px to 60px
    const rotation = Math.floor(Math.random() * 720) - 360 // -360deg to 360deg

    items.push({
      id: `particle-${i}-${Math.random()}`,
      type,
      color,
      left: `${left}%`,
      size,
      duration: `${duration}s`,
      delay: `${delay}s`,
      drift: `${drift}px`,
      rotation: `${rotation}deg`
    })
  }

  return items
}

export default function MedicineSuccessAnimation({
  active = true,
  onComplete,
  title = '✓ Medicine Added Successfully!',
  subtitle = 'The new medicine has been added to your inventory.'
}) {
  const [visible, setVisible] = useState(active)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)

    const handleChange = (e) => setReducedMotion(e.matches)
    mediaQuery.addEventListener?.('change', handleChange)

    return () => {
      mediaQuery.removeEventListener?.('change', handleChange)
    }
  }, [])

  const particles = useMemo(() => {
    if (reducedMotion) return []
    return generateParticles(52)
  }, [reducedMotion])

  useEffect(() => {
    if (!active) return

    // Auto-cleanup timer (3.5s total time for animation sequence)
    const animDuration = reducedMotion ? 2500 : 3600
    const timer = setTimeout(() => {
      setVisible(false)
      if (onComplete) {
        onComplete()
      }
    }, animDuration)

    return () => clearTimeout(timer)
  }, [active, onComplete, reducedMotion])

  if (!visible && !active) return null

  return (
    <div
      className="med-sprinkle-overlay"
      role="status"
      aria-live="polite"
      aria-label="Medicine added successfully"
    >
      {/* Particle Sprinkle Container */}
      {!reducedMotion && (
        <div className="med-sprinkle-particles-wrap" aria-hidden="true">
          {particles.map((p) => {
            const style = {
              left: p.left,
              animationDuration: p.duration,
              animationDelay: p.delay,
              '--drift': p.drift,
              '--rotation': p.rotation
            }

            return (
              <div key={p.id} className="med-particle" style={style}>
                {p.type === 'capsule' && <CapsuleSvg color={p.color} size={p.size} />}
                {p.type === 'tablet' && <TabletSvg color={p.color} size={p.size} />}
                {p.type === 'cross' && <CrossSvg color={p.color} size={p.size} />}
                {p.type === 'sparkle' && <SparkleSvg color={p.color} size={p.size} />}
                {p.type === 'plus' && <PlusSvg color={p.color} size={p.size} />}
                {p.type === 'dot' && <CircleDotSvg color={p.color} size={p.size} />}
                {p.type === 'oval' && <PillOvalSvg color={p.color} size={p.size} />}
              </div>
            )
          })}
        </div>
      )}

      {/* Floating Glassmorphism Success Banner */}
      <div className="med-success-banner-card">
        <div className="med-success-badge-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className="med-success-banner-content">
          <h3 className="med-success-title">{title}</h3>
          {subtitle && <p className="med-success-subtitle">{subtitle}</p>}
        </div>
      </div>
    </div>
  )
}
