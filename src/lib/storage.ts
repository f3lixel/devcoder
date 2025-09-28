export type StorageTarget = {
  variant: 'A' | 'B'
  bucket: string
  basePath: string // for B: `${projectId}/`; for A: ''
}

export function resolveStorageTarget(projectId: string): StorageTarget {
  const v = (process.env.NEXT_PUBLIC_STORAGE_VARIANT || 'B').toUpperCase()
  if (v === 'A') return { variant: 'A', bucket: `project-${projectId}`, basePath: '' }
  return { variant: 'B', bucket: 'projects', basePath: `${projectId}/` }
}









