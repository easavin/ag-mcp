'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

const logos = [
  { src: '/assets/logos/johndeere-logo.png', alt: 'John Deere', width: 120, height: 48 },
  { src: '/assets/logos/climate-logo.png', alt: 'Climate FieldView', width: 120, height: 48 },
  { src: '/assets/logos/auravant-logo.png', alt: 'Auravant', width: 120, height: 48 },
  { src: '/assets/logos/claas-logo.png', alt: 'Claas', width: 120, height: 48 },
  { src: '/assets/logos/usda-logo.png', alt: 'USDA', width: 120, height: 48 },
  { src: '/assets/logos/ec-logo.png', alt: 'European Commission', width: 120, height: 48 },
  { src: '/assets/logos/weather-logo.svg', alt: 'Weather Data', width: 120, height: 48 },
]

export default function ScrollingLogos() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return
    
    let animationId: number
    let currentOffset = 0
    const speed = 1

    const animate = () => {
      currentOffset += speed
      
      // Fine-tuned width calculation to eliminate the tiny jump
      // Much smaller adjustment to find the right loop point
      const oneSetWidth = 780 // Significantly reduced from 800px
      
      // Use modulo for seamless loop
      const displayOffset = currentOffset % oneSetWidth
      
      setOffset(displayOffset)
      animationId = requestAnimationFrame(animate)
    }
    
    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        width: '600px',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '20px',
          transform: `translateX(-${offset}px)`,
          willChange: 'transform',
        }}
      >
        {/* First set of logos */}
        {logos.map((logo, index) => (
          <div key={`first-${index}`} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Image
              src={logo.src}
              alt={logo.alt}
              width={logo.width}
              height={logo.height}
              style={{ objectFit: 'contain' }}
              unoptimized
            />
          </div>
        ))}
        
        {/* Duplicate set for seamless loop */}
        {logos.map((logo, index) => (
          <div key={`second-${index}`} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Image
              src={logo.src}
              alt={logo.alt}
              width={logo.width}
              height={logo.height}
              style={{ objectFit: 'contain' }}
              unoptimized
            />
          </div>
        ))}
      </div>
    </div>
  )
} 