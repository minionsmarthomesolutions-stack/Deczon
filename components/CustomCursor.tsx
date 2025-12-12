'use client'

import { useEffect, useState } from 'react'

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [visible, setVisible] = useState(true)
  const [isMobile, setIsMobile] = useState(true)

  useEffect(() => {
    // Check if mobile on mount
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setVisible(false)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)

    const handleMove = (e: MouseEvent) => {
      if (window.innerWidth >= 768) {
        setPosition({ x: e.clientX, y: e.clientY })
        setVisible(true)
      }
    }

    const handleLeave = () => {
      setVisible(false)
    }

    const handleEnter = () => {
      if (window.innerWidth >= 768) {
        setVisible(true)
      }
    }

    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      // Set initial position
      setPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
      setVisible(true)
      
      window.addEventListener('mousemove', handleMove)
      document.addEventListener('mouseleave', handleLeave)
      document.addEventListener('mouseenter', handleEnter)
    }

    return () => {
      window.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseleave', handleLeave)
      document.removeEventListener('mouseenter', handleEnter)
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  // Don't render on mobile
  if (isMobile) {
    return null
  }

  return (
    <div
      className="custom-cursor"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        opacity: visible ? 1 : 0,
      }}
    />
  )
}


