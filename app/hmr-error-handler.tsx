'use client'

import { useEffect } from 'react'

export function HMRErrorHandler() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Suppress HMR removeChild errors and general removeChild errors
    const originalError = window.console.error
    window.console.error = (...args: any[]) => {
      const errorMessage = args[0]?.toString() || ''
      // Suppress removeChild errors (common in HMR and React cleanup)
      if (
        errorMessage.includes('removeChild') ||
        (errorMessage.includes('removeChild') && errorMessage.includes('hotModuleReplacement'))
      ) {
        return // Silently ignore this error
      }
      // Log other errors normally
      originalError.apply(console, args)
    }

    // Handle unhandled errors
    const handleError = (event: ErrorEvent) => {
      if (
        event.message?.includes('removeChild') ||
        (event.message?.includes('removeChild') && event.filename?.includes('hotModuleReplacement'))
      ) {
        event.preventDefault()
        return false
      }
    }

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason?.message || event.reason?.toString() || ''
      if (errorMessage.includes('removeChild')) {
        event.preventDefault()
        return false
      }
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.console.error = originalError
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return null
}

