import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { animate, stagger, utils } from 'animejs'

// -- Tokens ----------------------------------------------------------------
//
// Durations mirror the 150/200ms rhythm already used by Tailwind transition
// utilities elsewhere in this app (AppointmentDrawer, Doctors.jsx filter
// panel) so anime.js-driven motion doesn't introduce a second pace.
//
// NOTE: anime.js v4 renamed easing strings from v3's 'easeOutQuad' style to
// short-form 'outQuad'. All eases below use v4 naming.

export const DURATION = {
  fast: 150,
  base: 220,
  slow: 320,
}

export const EASE = {
  standard: 'outQuad',
  decelerate: 'outCubic',
  accelerate: 'inQuad',
}

// Default "fade up" entrance - carries forward the visual signature of the
// retired .animate-fadeIn CSS class (index.css) as a single source of truth.
export const FADE_UP = {
  opacity: [0, 1],
  translateY: [6, 0],
  duration: DURATION.base,
  ease: EASE.decelerate,
}

// -- Reduced motion ----------------------------------------------------------

function getPrefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function prefersReducedMotion() {
  return getPrefersReducedMotion()
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(getPrefersReducedMotion)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return reduced
}

// Applies the "to" value of every [from, to] tuple in `params` instantly,
// skipping non-tween keys (duration/delay/ease/...). Used to jump straight
// to an animation's end state under prefers-reduced-motion.
function applyEndState(target, params) {
  const endValues = {}
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) endValues[key] = value[value.length - 1]
  }
  if (Object.keys(endValues).length > 0) utils.set(target, endValues)
}

// -- useAnimeOnMount ----------------------------------------------------------
//
// Plays an entrance animation on the referenced element whenever a value in
// `deps` changes (or once, on mount, if deps is left empty). Every animation
// this app plays should route through this hook (or useAnimeOnIntersect /
// staggerIn below) rather than calling animate() directly, so the
// reduced-motion check and cleanup are never reimplemented per component.
//
// buildParams is called fresh on every run so it can close over current
// props/state; return null/undefined to skip animating that run.

export function useAnimeOnMount(ref, buildParams, deps = []) {
  const instanceRef = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const params = buildParams()
    if (!params) return

    if (getPrefersReducedMotion()) {
      applyEndState(el, params)
      return
    }

    instanceRef.current = animate(el, params)

    return () => {
      instanceRef.current?.pause()
      instanceRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

// -- useAnimeOnIntersect ----------------------------------------------------
//
// Same as useAnimeOnMount, but gated behind an IntersectionObserver so
// below-the-fold entrances don't fire until scrolled into view. Fires once
// then disconnects.

export function useAnimeOnIntersect(ref, buildParams, options = {}) {
  const { threshold = 0.2, rootMargin = '0px' } = options
  const firedRef = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el || firedRef.current) return

    const params = buildParams()
    if (!params) return

    if (getPrefersReducedMotion()) {
      applyEndState(el, params)
      firedRef.current = true
      return
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !firedRef.current) {
          firedRef.current = true
          animate(el, params)
          observer.unobserve(el)
        }
      }
    }, { threshold, rootMargin })

    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

// -- staggerIn / useStaggerOnChange -------------------------------------------
//
// Staggered list/grid entrance. Items are matched with itemSelector inside
// containerRef's element (convention: mark each item with a plain
// `data-motion-item` attribute rather than relying on a specific className,
// so this stays reusable across unrelated components).

export function staggerIn(containerRef, itemSelector, opts = {}) {
  const {
    translateY = 10,
    duration = DURATION.base,
    ease = EASE.decelerate,
    staggerDelay = 30,
  } = opts

  const container = containerRef.current
  if (!container) return

  const items = container.querySelectorAll(itemSelector)
  if (items.length === 0) return

  if (getPrefersReducedMotion()) {
    utils.set(items, { opacity: 1, translateY: 0 })
    return
  }

  animate(items, {
    opacity: [0, 1],
    translateY: [translateY, 0],
    duration,
    ease,
    delay: stagger(staggerDelay),
  })
}

// Re-runs staggerIn whenever `signature` changes (e.g. a joined list of ids)
// rather than on every render, since array identity changes every render.
export function useStaggerOnChange(containerRef, itemSelector, signature, opts) {
  useEffect(() => {
    staggerIn(containerRef, itemSelector, opts)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])
}

// -- useStepTransition ---------------------------------------------------------
//
// Convenience wrapper around useAnimeOnMount for multi-step wizards: fades +
// slides the referenced step-content wrapper whenever `step` changes. Used
// by GuidedSearch, BookAppointment, and Register so the same wizard
// transition isn't reimplemented three times. Deliberately not
// direction-aware (forward vs. back both use the same subtle upward slide)
// to keep the motion simple rather than tracking previous-step state for a
// difference most users won't consciously register.

export function useStepTransition(ref, step) {
  useAnimeOnMount(ref, () => ({
    opacity: [0, 1],
    translateY: [8, 0],
    duration: DURATION.base,
    ease: EASE.decelerate,
  }), [step])
}

// -- popIn -----------------------------------------------------------------
//
// One-off scale+fade pop for a single element that just appeared in
// response to a user action (e.g. a step-indicator checkmark). Unlike
// staggerIn, this is for exactly one element, called imperatively (e.g.
// from an effect that only fires on forward progress through a wizard).

export function popIn(el, opts = {}) {
  if (!el) return
  const { duration = DURATION.fast, ease = EASE.decelerate } = opts

  if (getPrefersReducedMotion()) {
    utils.set(el, { opacity: 1, scale: 1 })
    return
  }

  animate(el, {
    opacity: [0, 1],
    scale: [0.5, 1],
    duration,
    ease,
  })
}

// -- useFlipTransition ---------------------------------------------------------
//
// Smooths over a layout-driven resize/reposition (e.g. a width class that
// toggles, causing a sibling to appear) using the FLIP technique: instead of
// animating the layout property itself (which this app deliberately avoids -
// see DURATION/EASE note above), it measures the element's box just before
// and just after the layout-triggering change, then plays the *visual*
// difference back as a translate+scale transform from the old box to the
// new one. Only ever touches `transform`, never width/height/top/left.
//
// Usage: call the returned `capture()` synchronously, before the state
// update that will change the element's layout (e.g. at the top of a click
// handler, before setState) - not after. Pass the same value(s) that drive
// the layout change as `deps`, exactly as you would to useEffect.
//
//   const captureRect = useFlipTransition(panelRef, [!!expanded])
//   function onToggle() {
//     captureRect()
//     setExpanded(v => !v)
//   }

export function useFlipTransition(ref, deps) {
  const prevRectRef = useRef(null)

  function capture() {
    prevRectRef.current = ref.current?.getBoundingClientRect() ?? null
  }

  useLayoutEffect(() => {
    const el = ref.current
    const prevRect = prevRectRef.current
    prevRectRef.current = null
    if (!el || !prevRect) return
    if (getPrefersReducedMotion()) return

    const newRect = el.getBoundingClientRect()
    const deltaX = prevRect.left - newRect.left
    const deltaY = prevRect.top - newRect.top
    const scaleX = newRect.width  === 0 ? 1 : prevRect.width  / newRect.width
    const scaleY = newRect.height === 0 ? 1 : prevRect.height / newRect.height

    // Nothing actually changed (e.g. this breakpoint's width class is the
    // same in both states) - skip rather than play a no-op animation.
    const unchanged =
      Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1 &&
      Math.abs(scaleX - 1) < 0.01 && Math.abs(scaleY - 1) < 0.01
    if (unchanged) return

    el.style.transformOrigin = 'top left'
    utils.set(el, { translateX: deltaX, translateY: deltaY, scaleX, scaleY })
    animate(el, {
      translateX: [deltaX, 0],
      translateY: [deltaY, 0],
      scaleX: [scaleX, 1],
      scaleY: [scaleY, 1],
      duration: DURATION.base,
      ease: EASE.decelerate,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return capture
}
