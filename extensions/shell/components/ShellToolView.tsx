const React = window.React

interface Props {
  ToolComponent: React.ComponentType<{ query: string; extensionId?: string }>
  activeTool: string
  query: string
}

export function ShellToolView({ ToolComponent, activeTool, query }: Props) {
  return (
    <React.Suspense
      fallback={
        <div
          className="nuxy-loading-state"
          style={{
            flex: 1,
            minHeight: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.7,
            fontSize: 'var(--font-sm)',
          }}
        >
          Loading…
        </div>
      }
    >
      <div className="nuxy-shell-tool-wrapper">
        <ToolComponent query={query} extensionId={activeTool} />
      </div>
    </React.Suspense>
  )
}
