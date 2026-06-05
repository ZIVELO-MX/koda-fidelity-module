"use client"

import Link from "next/link"

export function SmoothNavLink({
  href,
  children,
  className,
}: {
  href: string
  children: React.ReactNode
  className?: string
}) {
  const handleClick = (e: React.MouseEvent) => {
    if (!href.startsWith("#")) return
    e.preventDefault()
    const id = href.replace("#", "")
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
      el.focus({ preventScroll: true })
    }
  }

  return (
    <Link href={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  )
}
