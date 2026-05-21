    const getZoom = () => {
      const z = document.documentElement.style.zoom
      if (!z) return 1
      if (z.endsWith('%')) return parseFloat(z) / 100
      return parseFloat(z) || 1
    }

    const handleResizeMouseDown = (e, direction) => {
      e.preventDefault()
      e.stopPropagation()
      isDragging.current = true
      setIsDraggingState(true)
      hasDragged.current = true

      const zoom = getZoom()
      const startClientX = e.clientX
      const startClientY = e.clientY
      const startWidth = containerRef.current.offsetWidth
      const startHeight = containerRef.current.offsetHeight
      const startX = position.x
      const startY = position.y

      const onMouseMove = (moveEvent) => {
        if (!isDragging.current) return
        const deltaX = (moveEvent.clientX - startClientX) / zoom
        const deltaY = (moveEvent.clientY - startClientY) / zoom

        let newWidth = startWidth
        let newHeight = startHeight
        let newX = startX
        let newY = startY

        if (direction.includes('e')) newWidth = startWidth + deltaX
        if (direction.includes('w')) {
          newWidth = startWidth - deltaX
          newX = startX + deltaX
        }
        if (direction.includes('s')) newHeight = startHeight + deltaY
        if (direction.includes('n')) {
          newHeight = startHeight - deltaY
          newY = startY + deltaY
        }

        if (newWidth < 300) {
          if (direction.includes('w')) newX -= (300 - newWidth)
          newWidth = 300
        }
        if (newHeight < 100) {
          if (direction.includes('n')) newY -= (100 - newHeight)
          newHeight = 100
        }

        setSize({ width: newWidth, height: newHeight })
        if (newX !== startX || newY !== startY) {
          setPosition({ x: newX, y: newY })
        }
      }

      const onMouseUp = () => {
        isDragging.current = false
        setIsDraggingState(false)
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    }
