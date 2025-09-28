import * as React from 'react'
import { FileProgress } from '@/lib/file-events'
import { FileProgressCard } from '@/components/file-progress-card'

type Props = {
  files: FileProgress[]
  className?: string
}

export function FileProgressShelf({ files, className }: Props) {
  const ordered = React.useMemo(() => {
    const rank: Record<string, number> = { writing: 0, error: 1, done: 2 }
    return [...files]
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)) // newest first
      .sort((a, b) => (rank[a.status] - rank[b.status]))
  }, [files])

  if (!ordered || ordered.length === 0) return null

  return (
    <div className={"space-y-2 " + (className || '')} aria-live="polite" aria-atomic="false" role="region">
      <div className="text-xs text-muted-foreground">Dateien in Arbeit</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2">
        {ordered.map(fp => (
          <FileProgressCard key={fp.path} item={fp} />
        ))}
      </div>
    </div>
  )
}

export default FileProgressShelf


