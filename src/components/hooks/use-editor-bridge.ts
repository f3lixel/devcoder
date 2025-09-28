import { useCallback } from 'react'

export type EditorBridge = {
	openFile: (path: string) => void
	setValue: (path: string, content: string) => void
}

export function useEditorBridge(options: {
	onOpenFile?: (path: string) => void
	onWriteFile?: (path: string, content: string) => void
} = {}): EditorBridge {
	const openFile = useCallback((path: string) => {
		options.onOpenFile?.(path)
	}, [options])

	const setValue = useCallback((path: string, content: string) => {
		options.onWriteFile?.(path, content)
		// Hinweis: In unserem Sandbox-Setup wird writeFile -> onFilesChange -> Editor aktualisiert
	}, [options])

	return { openFile, setValue }
}

