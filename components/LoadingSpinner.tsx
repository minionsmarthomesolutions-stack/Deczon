'use client'

import styles from './LoadingSpinner.module.css'

interface LoadingSpinnerProps {
  fullScreen?: boolean
  message?: string
}

export default function LoadingSpinner({ fullScreen = false, message }: LoadingSpinnerProps) {
  const content = (
    <div>
      <div className={styles.spinner}>
        <div className={styles.ring} />
        <div className={styles.ringSecondary} />
        <div className={styles.dot} />
      </div>
      {message && <div className={styles.text}>{message}</div>}
    </div>
  )

  if (fullScreen) {
    return <div className={styles.overlay}>{content}</div>
  }

  return <div className={styles.inlineWrapper}>{content}</div>
}


