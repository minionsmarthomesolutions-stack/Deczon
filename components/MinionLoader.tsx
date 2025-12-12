'use client'

import { useState, useEffect } from 'react'
import styles from './MinionLoader.module.css'

interface MinionLoaderProps {
  fullScreen?: boolean
  message?: string
}

export default function MinionLoader({ 
  fullScreen = true, 
  message = "Minion is running... Loading" 
}: MinionLoaderProps) {
  const [imageError, setImageError] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    console.log('MinionLoader mounted, fullScreen:', fullScreen)
    
    // Lock body scroll when fullscreen loader is active
    if (fullScreen) {
      document.body.style.overflow = 'hidden'
      document.body.style.height = '100vh'
      
      return () => {
        document.body.style.overflow = ''
        document.body.style.height = ''
      }
    }
  }, [fullScreen])

  const content = (
    <div className={styles.container}>
      {/* Minion with animations */}
      <div className={styles.minionWrapper}>
        {!imageError ? (
          <img 
            src="/output-onlinegiftools.gif" 
            alt="Running Minion" 
            className={styles.minion}
            onError={(e) => {
              console.error('Failed to load Minion GIF from /output-onlinegiftools.gif', e)
              setImageError(true)
            }}
            onLoad={() => {
              console.log('Minion GIF loaded successfully')
            }}
          />
        ) : (
          <div className={styles.fallback}>
            <div className={styles.fallbackMinion}>🤖</div>
          </div>
        )}
      </div>

      {/* Loading text */}
      <div className={styles.text}>
        {message}
        <span className={styles.dots}></span>
      </div>

      {/* Progress bar */}
      <div className={styles.progressBar}>
        <div className={styles.progressFill} />
      </div>
    </div>
  )

  if (!mounted) {
    return null
  }

  if (fullScreen) {
    return <div className={styles.overlay}>{content}</div>
  }

  return <div className={styles.inlineWrapper}>{content}</div>
}
