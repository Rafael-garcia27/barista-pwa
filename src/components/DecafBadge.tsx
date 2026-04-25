interface DecafBadgeProps {
  size?: 'sm' | 'md'
}

export function DecafBadge({ size = 'sm' }: DecafBadgeProps) {
  if (size === 'md') {
    return (
      <span className="inline-flex items-center rounded border border-gray-400 bg-gray-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-gray-500">
        Decaf
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded border border-gray-400 bg-gray-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-gray-500">
      Decaf
    </span>
  )
}
