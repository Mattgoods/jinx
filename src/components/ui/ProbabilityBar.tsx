interface ProbabilityBarProps {
  yesPool: number
  totalPool: number
}

export function ProbabilityBar({ yesPool, totalPool }: ProbabilityBarProps) {
  const yesPercent = totalPool > 0 ? (yesPool / totalPool) * 100 : 50

  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="font-mono font-semibold text-accent-green">YES {yesPercent.toFixed(0)}%</span>
        <span className="font-mono font-semibold text-accent-red">NO {(100 - yesPercent).toFixed(0)}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-accent-red/20">
        <div className="probability-fill h-full rounded-full bg-accent-green shadow-[0_0_8px_rgba(0,231,1,0.3)]" style={{ width: `${yesPercent}%` }} />
      </div>
    </div>
  )
}
