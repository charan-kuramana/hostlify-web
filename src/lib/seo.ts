import { useEffect } from 'react'

interface Seo {
  title: string
  description?: string
  image?: string | null
  /** schema.org object rendered as JSON-LD (e.g. a Hostel / LodgingBusiness) */
  jsonLd?: Record<string, unknown> | null
}

function setMeta(attr: 'name' | 'property', key: string, value?: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!value) { el?.remove(); return }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = value
}

/**
 * Sets title, description, canonical link, Open Graph tags and JSON-LD for public pages.
 * Google renders JavaScript, so these are picked up when the page is crawled; links shared on
 * WhatsApp get a title too. Restores the previous title on unmount.
 */
export function useSeo({ title, description, image, jsonLd }: Seo) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = title
    setMeta('name', 'description', description)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:image', image ?? undefined)

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = window.location.origin + window.location.pathname + window.location.search

    let script: HTMLScriptElement | null = null
    if (jsonLd) {
      script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.seo = 'page'
      script.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(script)
    }
    return () => {
      document.title = prevTitle
      script?.remove()
      canonical?.remove()
      for (const k of ['og:title', 'og:description', 'og:type', 'og:image']) setMeta('property', k, null)
    }
  }, [title, description, image, jsonLd])
}
