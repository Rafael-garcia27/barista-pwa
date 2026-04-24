interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm ${className}`}>
      {children}
    </div>
  )
}
