'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'

const logos = [
  { src: '/assets/logos/johndeere-logo.png', alt: 'John Deere', width: 40, height: 16 },
  { src: '/assets/logos/climate-logo.png', alt: 'Climate FieldView', width: 40, height: 16 },
  { src: '/assets/logos/auravant-logo.png', alt: 'Auravant', width: 40, height: 16 },
  { src: '/assets/logos/claas-logo.png', alt: 'Claas', width: 40, height: 16 },
  { src: '/assets/logos/usda-logo.png', alt: 'USDA', width: 40, height: 16 },
  { src: '/assets/logos/ec-logo.png', alt: 'European Commission', width: 40, height: 16 },
  { src: '/assets/logos/weather-logo.svg', alt: 'Weather Data', width: 40, height: 16 },
]

interface ScrollingLogosProps {
  speed?: number
  className?: string
}

export default function ScrollingLogos({ speed = 1, className = '' }: ScrollingLogosProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  const [containerWidth, setContainerWidth] = useState(600)
  const [logoSetWidth, setLogoSetWidth] = useState(780)
  const [isVisible, setIsVisible] = useState(false)

  // Calculate dynamic widths based on container size
  const updateDimensions = useCallback(() => {
    if (!containerRef.current || !innerRef.current) return
    
    const containerRect = containerRef.current.getBoundingClientRect()
    const newContainerWidth = containerRect.width
    
    // Calculate the width of one set of logos (logo width + gap)
    const logoWidth = 40
    const gap = 72
    const singleLogoWidth = logoWidth + gap
    const calculatedSetWidth = logos.length * singleLogoWidth
    
    setContainerWidth(newContainerWidth)
    setLogoSetWidth(calculatedSetWidth)
  }, [])

  // Intersection Observer for performance optimization
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      { threshold: 0.1 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // Resize observer for responsive behavior
  useEffect(() => {
    const resizeObserver = new ResizeObserver(updateDimensions)
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    updateDimensions()

    return () => resizeObserver.disconnect()
  }, [updateDimensions])

  // Animation loop - only runs when visible
  useEffect(() => {
    if (!isVisible) return
    
    let animationId: number
    let currentOffset = 0

    const animate = () => {
      currentOffset += speed
      
      // Use modulo for seamless loop
      const displayOffset = currentOffset % logoSetWidth
      
      setOffset(displayOffset)
      animationId = requestAnimationFrame(animate)
    }
    
    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [speed, logoSetWidth, isVisible])

  return (
    <div
      ref={containerRef}
      className={`scrolling-logos-container ${className}`}
      style={{
        width: '100%',
        maxWidth: '100vw',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        margin: '0 auto',
        padding: '0 1rem', // Add padding to prevent edge cutoff
      }}
    >
      <div
        ref={innerRef}
        className="scrolling-logos-inner"
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '72px',
          transform: `translateX(-${offset}px)`,
          willChange: 'transform',
          // Ensure smooth hardware acceleration
          backfaceVisibility: 'hidden',
          perspective: '1000px',
        }}
      >
        {/* First set of logos */}
        {logos.map((logo, index) => (
          <div 
            key={`first-${index}`} 
            className="logo-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              minWidth: '40px', // Ensure consistent sizing
            }}
          >
            <Image
              src={logo.src}
              alt={logo.alt}
              width={logo.width}
              height={logo.height}
              style={{ 
                objectFit: 'contain',
                maxWidth: '100%',
                height: 'auto',
              }}
              unoptimized
              loading="lazy"
            />
          </div>
        ))}
        
        {/* Duplicate set for seamless loop */}
        {logos.map((logo, index) => (
          <div 
            key={`second-${index}`} 
            className="logo-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              minWidth: '40px',
            }}
          >
            <Image
              src={logo.src}
              alt={logo.alt}
              width={logo.width}
              height={logo.height}
              style={{ 
                objectFit: 'contain',
                maxWidth: '100%',
                height: 'auto',
              }}
              unoptimized
              loading="lazy"
            />
          </div>
        ))}
      </div>

      <style jsx>{`
        .scrolling-logos-container {
          /* Prevent overflow issues on mobile */
          box-sizing: border-box;
        }
        
        .logo-item {
          /* Add subtle transitions for better visual quality */
          transition: opacity 0.2s ease;
        }
        
        .logo-item:hover {
          opacity: 0.8;
        }
        
        /* Mobile optimizations */
        @media (max-width: 640px) {
          .scrolling-logos-container {
            padding: 0 0.5rem;
          }
          
          .scrolling-logos-inner {
            gap: 60px !important;
          }
          
          .logo-item {
            min-width: 35px !important;
          }
        }
        
        /* Tablet optimizations */
        @media (max-width: 1024px) {
          .scrolling-logos-inner {
            gap: 66px !important;
          }
          
          .logo-item {
            min-width: 38px !important;
          }
        }
        
        /* Reduce motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          .scrolling-logos-inner {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  )
}