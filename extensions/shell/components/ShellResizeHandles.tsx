const React = window.React

const DIRECTIONS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const
type Direction = (typeof DIRECTIONS)[number]

const HANDLE_STYLES: Record<Direction, React.CSSProperties> = {
  n: { top: 0, left: 0, right: 0, height: 6, cursor: 'ns-resize' },
  s: { bottom: 0, left: 0, right: 0, height: 6, cursor: 'ns-resize' },
  e: { top: 0, bottom: 0, right: 0, width: 6, cursor: 'ew-resize' },
  w: { top: 0, bottom: 0, left: 0, width: 6, cursor: 'ew-resize' },
  ne: { top: 0, right: 0, width: 10, height: 10, cursor: 'nesw-resize' },
  nw: { top: 0, left: 0, width: 10, height: 10, cursor: 'nwse-resize' },
  se: { bottom: 0, right: 0, width: 10, height: 10, cursor: 'nwse-resize' },
  sw: { bottom: 0, left: 0, width: 10, height: 10, cursor: 'nesw-resize' },
}

interface Props {
  onResizeMouseDown: (e: React.MouseEvent<HTMLDivElement>, dir: Direction) => void
}

export function ShellResizeHandles({ onResizeMouseDown }: Props) {
  return (
    <>
      {DIRECTIONS.map((dir) => (
        <div
          key={dir}
          style={{ position: 'absolute', zIndex: 9999, ...HANDLE_STYLES[dir] }}
          onMouseDown={(e) => onResizeMouseDown(e, dir)}
        />
      ))}
    </>
  )
}
