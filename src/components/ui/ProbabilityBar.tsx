interface ProbabilityBarProps {
  yesPool: number
  totalPool: number
}

export function ProbabilityBar({ yesPool, totalPool }: ProbabilityBarProps) {
  const yesPercent = totalPool > 0 ? (yesPool / totalPool) * 100 : 50

  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-mono font-medium text-accent-green">YES {yesPercent.toFixed(0)}%</span>
        <span className="font-mono font-medium text-accent-red">NO {(100 - yesPercent).toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-accent-red/20">
        <div className="probability-fill h-full rounded-full bg-accent-green" style={{ width: `${yesPercent}%` }} />
      </div>
    </div>
  )
}
