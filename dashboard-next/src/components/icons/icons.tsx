'use client'

import React from 'react'

type IconProps = {
  size?: number
  color?: string
  strokeWidth?: number
  className?: string
  style?: React.CSSProperties
}

function IconBase({
  children,
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.8,
  className,
  style,
  viewBox = '0 0 24 24',
}: IconProps & { children: React.ReactNode; viewBox?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {children}
    </svg>
  )
}

export function IconTimes(p: IconProps) {
  return (
    <IconBase {...p}>
      <circle cx="9" cy="7" r="3" />
      <circle cx="17" cy="11" r="2.5" />
      <circle cx="7" cy="16" r="2.5" />
      <path d="M11.5 8.5L14.5 10" />
      <path d="M10 9.5L8.5 14" />
      <path d="M15 13L9 15.5" />
    </IconBase>
  )
}

export function IconPipeline(p: IconProps) {
  return (
    <IconBase {...p}>
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="5" r="2" />
      <circle cx="19" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
      <path d="M7 12h3M14 12h3M12 7v3M12 14v3" />
    </IconBase>
  )
}

export function IconAgentes(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </IconBase>
  )
}

export function IconProjetos(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </IconBase>
  )
}

export function IconHistorico(p: IconProps) {
  return (
    <IconBase {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </IconBase>
  )
}

export function IconPlus(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M12 5v14M5 12h14" />
    </IconBase>
  )
}

export function IconClose(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M18 6L6 18M6 6l12 12" />
    </IconBase>
  )
}

export function IconCheck(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M20 6L9 17l-5-5" />
    </IconBase>
  )
}

export function IconWarning(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </IconBase>
  )
}

export function IconInfo(p: IconProps) {
  return (
    <IconBase {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </IconBase>
  )
}

export function IconRocket(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </IconBase>
  )
}

export function IconClock(p: IconProps) {
  return (
    <IconBase {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </IconBase>
  )
}

export function IconPause(p: IconProps) {
  return (
    <IconBase {...p}>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </IconBase>
  )
}

export function IconPlay(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M5 3l14 9-14 9V3z" />
    </IconBase>
  )
}

export function IconSearch(p: IconProps) {
  return (
    <IconBase {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </IconBase>
  )
}

export function IconArrowLeft(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </IconBase>
  )
}

export function IconArrowRight(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </IconBase>
  )
}

export function IconChevronDown(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M6 9l6 6 6-6" />
    </IconBase>
  )
}

export function IconChevronLeft(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M15 18l-6-6 6-6" />
    </IconBase>
  )
}

export function IconChevronRight(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M9 18l6-6-6-6" />
    </IconBase>
  )
}

export function IconActivity(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </IconBase>
  )
}

export function IconDiff(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M12 3v18M5 8l-3 4 3 4M19 8l3 4-3 4" />
    </IconBase>
  )
}

export function IconExpand(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </IconBase>
  )
}

export function IconCompress(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M9 3v6H3M21 9h-6V3M3 21l6-6M21 15l-6 6" />
    </IconBase>
  )
}

export function IconBell(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </IconBase>
  )
}

export function IconFile(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </IconBase>
  )
}

export function IconCode(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
    </IconBase>
  )
}

export function IconFolder(p: IconProps) {
  return <IconProjetos {...p} />
}

export function IconRefresh(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </IconBase>
  )
}
