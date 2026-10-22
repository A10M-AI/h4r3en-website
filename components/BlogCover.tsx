import Image from 'next/image'
import { getPostIcon } from '@/lib/blog/icons'
import type { CoverMotif, Post } from '@/lib/blog/types'

// All motifs share a 400×225 (16:9) viewBox centred on (200, 112).
function ring(count: number, rx: number, ry: number, offset = 0) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + offset
    return {
      x: Math.round(200 + Math.cos(angle) * rx),
      y: Math.round(112 + Math.sin(angle) * ry),
    }
  })
}

const innerNodes = ring(8, 70, 50)
const outerNodes = ring(16, 150, 92, -Math.PI / 16)

function NetworkArt() {
  return (
    <>
      <g strokeOpacity="0.35">
        {innerNodes.map((p, i) => (
          <line key={`c${i}`} x1={200} y1={112} x2={p.x} y2={p.y} />
        ))}
        {outerNodes.map((p, i) => {
          const parent = innerNodes[Math.floor(i / 2)]
          return (
            <line key={`o${i}`} x1={parent.x} y1={parent.y} x2={p.x} y2={p.y} />
          )
        })}
      </g>
      <polygon
        points={innerNodes.map((p) => `${p.x},${p.y}`).join(' ')}
        strokeOpacity="0.25"
      />
      <polygon
        points={outerNodes.map((p) => `${p.x},${p.y}`).join(' ')}
        strokeOpacity="0.15"
      />
      <g fill="currentColor" stroke="none">
        {innerNodes.map((p, i) => (
          <circle key={`ic${i}`} cx={p.x} cy={p.y} r="3.5" fillOpacity="0.9" />
        ))}
        {outerNodes.map((p, i) => (
          <circle key={`oc${i}`} cx={p.x} cy={p.y} r="2.5" fillOpacity="0.6" />
        ))}
      </g>
    </>
  )
}

const sources = [49, 91, 133, 175]
const outputs = [67, 112, 157]

function PipelineArt() {
  return (
    <>
      <circle cx="200" cy="112" r="52" strokeOpacity="0.3" strokeDasharray="3 5" />
      {sources.map((y) => (
        <g key={`s${y}`}>
          <rect x="28" y={y - 9} width="60" height="18" rx="4" fill="currentColor" fillOpacity="0.08" strokeOpacity="0.5" />
          <line x1="38" y1={y} x2="66" y2={y} strokeOpacity="0.6" />
          <path d={`M88 ${y} C 135 ${y} 130 112 172 112`} strokeOpacity="0.35" strokeDasharray="4 4" />
          <circle cx="132" cy={y / 2 + 56} r="2" fill="currentColor" stroke="none" fillOpacity="0.8" />
        </g>
      ))}
      {outputs.map((y) => (
        <g key={`t${y}`}>
          <path d={`M228 112 C 270 112 265 ${y} 312 ${y}`} strokeOpacity="0.35" />
          <rect x="312" y={y - 9} width="60" height="18" rx="4" fill="currentColor" fillOpacity="0.12" strokeOpacity="0.6" />
          <line x1="322" y1={y} x2="350" y2={y} strokeOpacity="0.6" />
          <circle cx="362" cy={y} r="2" fill="currentColor" stroke="none" fillOpacity="0.9" />
        </g>
      ))}
    </>
  )
}

const spans = [
  [24, 352],
  [40, 140],
  [56, 72],
  [132, 48],
  [190, 150],
  [206, 64],
  [276, 52],
  [300, 76],
]

const sparkline = Array.from({ length: 23 }, (_, i) => {
  const y = 200 + Math.round(Math.sin(i * 0.9) * 8 + Math.sin(i * 2.3) * 4)
  return `${24 + i * 16},${y}`
}).join(' ')

function TraceArt() {
  return (
    <>
      {spans.map(([x, width], i) => (
        <rect
          key={i}
          x={x}
          y={22 + i * 21}
          width={width}
          height="10"
          rx="3"
          fill="currentColor"
          fillOpacity={i === 0 ? 0.1 : 0.2}
          strokeOpacity="0.5"
        />
      ))}
      <line x1="262" y1="12" x2="262" y2="218" strokeOpacity="0.4" strokeDasharray="3 4" />
      <polyline points={sparkline} strokeOpacity="0.6" />
    </>
  )
}

const motifs: Record<CoverMotif, React.ComponentType> = {
  network: NetworkArt,
  pipeline: PipelineArt,
  trace: TraceArt,
}

interface BlogCoverProps {
  post: Pick<Post, 'title' | 'icon' | 'cover' | 'category'>
  sizes?: string
  /** Include a rounded-* class; the cover has square corners by default. */
  className?: string
}

export default function BlogCover({
  post,
  sizes = '(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw',
  className = '',
}: BlogCoverProps) {
  const { cover, title } = post
  const Icon = getPostIcon(post.icon)
  const Art = motifs[cover.motif] ?? NetworkArt
  const accent = cover.accent

  return (
    <div
      className={`relative aspect-[16/9] overflow-hidden bg-slate-950 ${className}`}
    >
      {cover.image ? (
        <Image
          src={cover.image}
          alt={title}
          fill
          sizes={sizes}
          // External URLs are shown as-is; only uploads go through the optimiser.
          unoptimized={cover.image.startsWith('https://')}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0">
          {/* Base */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:20px_20px]" />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2/3 h-2/3 rounded-full blur-3xl opacity-20"
            style={{ backgroundColor: accent }}
          />

          {/* Motif */}
          <svg
            viewBox="0 0 400 225"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-105"
            style={{ color: accent }}
          >
            <Art />
          </svg>

          {/* Centre icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-14 h-14 rounded-2xl bg-slate-950/80 border backdrop-blur-sm flex items-center justify-center"
              style={{ borderColor: `${accent}66`, boxShadow: `0 10px 30px -6px ${accent}55` }}
            >
              <Icon size={24} style={{ color: accent }} />
            </div>
          </div>

          {/* Label strip */}
          <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-4 py-2.5 bg-gradient-to-t from-slate-950/90 to-transparent">
            <span
              className="font-mono text-[10px] uppercase tracking-[0.2em]"
              style={{ color: `${accent}cc` }}
            >
              {cover.label || post.category}
            </span>
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: accent }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
