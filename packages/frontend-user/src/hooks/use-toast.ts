import { useState, useCallback } from 'react'

export interface Toast {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((toast: Toast) => {
    // Simple console implementation for now
    // In production, you'd want to use a proper toast library like sonner or react-hot-toast
    if (toast.variant === 'destructive') {
      console.error(`[Toast] ${toast.title}: ${toast.description}`)
    } else {
      console.log(`[Toast] ${toast.title}: ${toast.description}`)
    }

    setToasts((prev) => [...prev, toast])

    // Auto-remove after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t !== toast))
    }, 3000)
  }, [])

  return { toast, toasts }
}
