import { useState, useRef } from 'react'
import { motion } from 'motion/react'
import { ChevronRight, Check, X } from 'lucide-react'
import type { DesignConfig, DesignComponent } from '@/data/scenarioEngine'

interface PlacedComponent {
  id: string
  compId: string
  name: string
  icon: string
  x: number
  y: number
}
interface Connection {
  from: string
  to: string
}

/**
 * 设计画板 — 拖拽组件构建架构
 * 不是对话：是实际的架构设计操作
 */
export default function DesignCanvas({
  config,
  onSubmit,
}: {
  config: DesignConfig
  onSubmit: (placedComponents: PlacedComponent[], connections: Connection[]) => void
}) {
  const [placed, setPlaced] = useState<PlacedComponent[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [draggingFrom, setDraggingFrom] = useState<string | null>(null)
  const [draggedComp, setDraggedComp] = useState<DesignComponent | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const categoryColors: Record<string, string> = {
    compute: '#c96442',
    storage: '#4a8c6f',
    network: '#6366f1',
    queue: '#d97706',
    cache: '#8b6fc0',
    security: '#dc2626',
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!draggedComp || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const newComp: PlacedComponent = {
      id: `${draggedComp.id}-${Date.now()}`,
      compId: draggedComp.id,
      name: draggedComp.name,
      icon: draggedComp.icon,
      x: Math.max(0, x - 40),
      y: Math.max(0, y - 20),
    }
    setPlaced([...placed, newComp])
    setDraggedComp(null)
  }

  const handleCompClick = (id: string) => {
    if (draggingFrom === null) {
      setDraggingFrom(id)
    } else if (draggingFrom === id) {
      setDraggingFrom(null)
    } else {
      // 创建连接
      const exists = connections.some((c) => c.from === draggingFrom && c.to === id)
      if (!exists) {
        setConnections([...connections, { from: draggingFrom, to: id }])
      }
      setDraggingFrom(null)
    }
  }

  const removeComp = (id: string) => {
    setPlaced(placed.filter((p) => p.id !== id))
    setConnections(connections.filter((c) => c.from !== id && c.to !== id))
  }

  const getCompById = (id: string) => placed.find((p) => p.id === id)

  return (
    <div className="max-w-4xl mx-auto">
      {/* 提示 */}
      <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}>
        <p className="text-sm font-medium mb-2" style={{ color: '#141413' }}>{config.prompt}</p>
        <div className="flex flex-wrap gap-2">
          {config.constraints.map((c, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-4" style={{ height: '450px' }}>
        {/* 组件库 */}
        <div className="w-44 flex-shrink-0 overflow-y-auto rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(232,230,220,0.8)' }}>
          <span className="text-[10px] font-semibold uppercase mb-2 block" style={{ color: '#87867f' }}>组件库</span>
          <div className="space-y-1.5">
            {config.components.map((comp) => {
              const isUsed = placed.some((p) => p.compId === comp.id)
              return (
                <div
                  key={comp.id}
                  draggable={!isUsed}
                  onDragStart={() => setDraggedComp(comp)}
                  className="flex items-center gap-2 p-2 rounded-lg cursor-grab transition-all"
                  style={{
                    background: isUsed ? 'rgba(232,230,220,0.3)' : 'rgba(255,255,255,0.5)',
                    border: '1px solid rgba(232,230,220,0.6)',
                    opacity: isUsed ? 0.4 : 1,
                  }}
                >
                  <i className={`bi ${comp.icon}`} style={{ fontSize: '12px', color: categoryColors[comp.category] }} />
                  <span className="text-[11px]" style={{ color: '#5e5d59' }}>{comp.name}</span>
                  {isUsed && <Check size={10} style={{ color: '#4a8c6f' }} className="ml-auto" />}
                </div>
              )
            })}
          </div>
        </div>

        {/* 画板 */}
        <div
          ref={canvasRef}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex-1 relative rounded-xl overflow-hidden"
          style={{
            background: 'rgba(250,249,245,0.5)',
            border: '2px dashed rgba(232,230,220,0.8)',
            backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.03) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          {/* SVG 连线层 */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
            {connections.map((conn, i) => {
              const from = getCompById(conn.from)
              const to = getCompById(conn.to)
              if (!from || !to) return null
              return (
                <line
                  key={i}
                  x1={from.x + 50}
                  y1={from.y + 18}
                  x2={to.x + 50}
                  y2={to.y + 18}
                  stroke="#c96442"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  markerEnd="url(#arrowhead)"
                />
              )
            })}
            <defs>
              <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                <polygon points="0 0, 6 2, 0 4" fill="#c96442" />
              </marker>
            </defs>
          </svg>

          {/* 已放置的组件 */}
          {placed.map((p) => {
            const comp = config.components.find((c) => c.id === p.compId)
            const color = comp ? categoryColors[comp.category] : '#87867f'
            return (
              <motion.div
                key={p.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute group"
                style={{ left: p.x, top: p.y, zIndex: 2 }}
              >
                <div
                  onClick={() => handleCompClick(p.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer transition-all"
                  style={{
                    background: draggingFrom === p.id ? `${color}20` : 'rgba(255,255,255,0.9)',
                    border: `1.5px solid ${draggingFrom === p.id ? color : `${color}40`}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  <i className={`bi ${p.icon}`} style={{ fontSize: '12px', color }} />
                  <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: '#141413' }}>{p.name}</span>
                  {draggingFrom === null && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeComp(p.id) }}
                      className="opacity-0 group-hover:opacity-100 ml-1"
                    >
                      <X size={10} style={{ color: '#87867f' }} />
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}

          {/* 空状态 */}
          {placed.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs" style={{ color: '#c4c3bd' }}>从左侧拖拽组件到画板</span>
            </div>
          )}

          {/* 连线提示 */}
          {draggingFrom && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px]" style={{ background: '#c96442', color: '#fff' }}>
              点击另一个组件创建连接
            </div>
          )}
        </div>
      </div>

      {/* 提交按钮 */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs" style={{ color: '#87867f' }}>
          {placed.length} 个组件 · {connections.length} 条连接
        </span>
        <button
          onClick={() => onSubmit(placed, connections)}
          disabled={placed.length === 0}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 flex items-center gap-2"
          style={{ background: placed.length > 0 ? 'linear-gradient(135deg, #c96442, #d97757)' : '#c4c3bd' }}
        >
          提交架构设计 <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
