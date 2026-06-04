const React = window.React

interface Props {
  ToolComponent: React.ComponentType<{ query: string; extensionId?: string }>
  activeTool: string
  query: string
  t: (key: string) => string
}

export function ShellToolView({ ToolComponent, activeTool, query, t }: Props) {
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
          {t('loading')}
        </div>
      }
    >
      <div className="nuxy-shell-tool-wrapper">
        <ToolComponent query={query} extensionId={activeTool} />
      </div>
    </React.Suspense>
  )
}
