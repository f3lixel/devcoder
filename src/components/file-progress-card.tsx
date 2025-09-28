import * as React from 'react'
import { Card } from '@/components/ui/card'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { FileProgress, iconForKind, basenameTruncated } from '@/lib/file-events'
import { cn } from '@/lib/utils'

type Props = {
  item: FileProgress
  className?: string
}

export function FileProgressCard({ item, className }: Props) {
  const Icon = iconForKind(item.kind)
  const statusIcon = item.status === 'writing'
    ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
    : item.status === 'done'
      ? <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
      : <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />

  const bytes = typeof item.bytes === 'number' ? item.bytes : undefined
  const prettyBytes = (n: number) => {
    const units = ['B','KB','MB','GB']
    let val = n
    let i = 0
    while (val >= 1024 && i < units.length - 1) { val /= 1024; i++ }
    return `${val.toFixed(val < 10 && i > 0 ? 1 : 0)} ${units[i]}`
  }

  return (
    <Card
      aria-label={`Datei: ${item.path} Status: ${item.status}`}
      className={cn('flex items-center gap-3 rounded-2xl p-3 shadow-sm', className)}
    >
      <div className="flex items-center justify-center rounded-md bg-muted p-2">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate" title={item.path}>
          {basenameTruncated(item.path)}
        </div>
        {bytes !== undefined && item.status !== 'error' && (
          <div className="text-xs text-muted-foreground truncate">{prettyBytes(bytes)} geschrieben</div>
        )}
        {item.status === 'error' && item.message && (
          <div className="text-xs text-muted-foreground truncate" title={item.message}>{item.message}</div>
        )}
      </div>
      <div className="shrink-0">{statusIcon}</div>
    </Card>
  )
}

export default FileProgressCard


