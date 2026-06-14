import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type ToastVariant = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, variant }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  const variantStyles: Record<ToastVariant, string> = {
    success: 'bg-[#4a8c6f] text-white',
    error: 'bg-[#c96442] text-white',
    info: 'bg-[#3d3d38] text-[#f5f4ed]',
  }

  const variantIcons: Record<ToastVariant, string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {createPortal(
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg max-w-sm animate-[slideIn_0.2s_ease-out] ${variantStyles[toast.variant]}`}
            >
              <span className="text-sm font-medium">{variantIcons[toast.variant]}</span>
              <span className="text-sm">{toast.message}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}
