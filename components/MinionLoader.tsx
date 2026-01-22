'use client'

import React from 'react'
import styles from './MinionLoader.module.css'

interface MinionLoaderProps {
    fullScreen?: boolean
    message?: string
}

export default function MinionLoader({ fullScreen = true, message = 'Loading' }: MinionLoaderProps) {
    const content = (
        <div className={styles.container}>
            <div className={styles.minionWrapper}>
                <img
                    src="/images/minion-running.gif"
                    alt="Loading..."
                    className={styles.minion}
                    onError={(e) => {
                        // Fallback if GIF fails to load
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                            const fallback = document.createElement('div')
                            fallback.className = styles.fallbackMinion
                            fallback.textContent = '⏳'
                            parent.appendChild(fallback)
                        }
                    }}
                />
            </div>
            <div className={styles.progressBar}>
                <div className={styles.progressFill}></div>
            </div>
            <div className={styles.text}>
                {message}
                <span className={styles.dots}></span>
            </div>
        </div>
    )

    if (fullScreen) {
        return <div className={styles.overlay}>{content}</div>
    }

    return <div className={styles.inlineWrapper}>{content}</div>
}
