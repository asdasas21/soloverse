interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rect' | 'circle'
  width?: string | number
  height?: string | number
}

export function Skeleton({ className = '', variant = 'rect', width, height }: SkeletonProps) {
  const variantClass = {
    text: 'rounded',
    rect: 'rounded-lg',
    circle: 'rounded-full',
  }[variant]

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={`animate-pulse bg-[#e0dfd7] ${variantClass} ${className}`}
      style={style}
    />
  )
}

/** Card skeleton for loading states */
export function CardSkeleton() {
  return (
    <div className="p-6 rounded-xl border border-[#e0dfd7] bg-white/60 space-y-3">
      <Skeleton variant="text" width="60%" height={20} />
      <Skeleton variant="text" width="100%" height={14} />
      <Skeleton variant="text" width="90%" height={14} />
      <div className="flex gap-2 pt-2">
        <Skeleton width={60} height={24} className="rounded-full" />
        <Skeleton width={80} height={24} className="rounded-full" />
      </div>
    </div>
  )
}
