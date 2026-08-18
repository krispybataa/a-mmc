import { useState, useEffect, useRef } from 'react'

// -- AnimatedModal ---------------------------------------------------------
//
// Shared shell for centered modal dialogs: fades the backdrop and
// scales+fades the panel in on mount, and plays the same transition in
// reverse before actually unmounting - mirroring the pattern
// AppointmentDrawer already uses for its own open/close. Several modals
// (reschedule, add-clinician, add-secretary, link-clinician) previously had
// zero transition classes at all and popped in/out instantly; this
// consolidates the fix into one place instead of repeating the same
// open-state + rAF + transition-class plumbing in each of them.
//
// Props:
//   onClose               - () => void, called once the close transition finishes
//   align                 - 'center' (default) | 'start' - matches each
//                            modal's original backdrop alignment (some use
//                            items-start + overflow-y-auto for tall forms)
//   closeOnBackdropClick  - bool, defaults false - only enable for modals
//                            that already had this behavior, to avoid
//                            changing existing UX in modals that didn't
//   panelClassName        - className applied to the panel element
//   children              - ReactNode, or (close) => ReactNode if the
//                            modal's own Cancel/X buttons should trigger the
//                            animated close instead of calling onClose directly

export default function AnimatedModal({
  onClose,
  align = 'center',
  closeOnBackdropClick = false,
  panelClassName = '',
  children,
}) {
  const [open, setOpen] = useState(false)
  const closingRef = useRef(false)

  useEffect(() => {
    closingRef.current = false
    const id = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(id)
  }, [])

  function close() {
    if (closingRef.current) return
    closingRef.current = true
    setOpen(false)
    setTimeout(onClose, 200)
  }

  return (
    <div
      className={[
        'fixed inset-0 z-50 bg-black/50 flex p-4',
        align === 'start' ? 'items-start justify-center overflow-y-auto' : 'items-center justify-center',
        'transition-opacity duration-200',
        open ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
      onClick={closeOnBackdropClick ? (e) => { if (e.target === e.currentTarget) close() } : undefined}
    >
      <div
        className={[
          'transition-all duration-200',
          open ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
          panelClassName,
        ].join(' ')}
        onClick={e => e.stopPropagation()}
      >
        {typeof children === 'function' ? children(close) : children}
      </div>
    </div>
  )
}
