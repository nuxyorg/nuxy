const React = window.React

import type { KeyAction, CommandPaletteAction } from '../types.ts'

interface Props {
  tools: { id: string }[]
  activeTool: string | null
  selectedIndex: number
  listResults: unknown[]
  keyActionHints: KeyAction[]
  toolActions: CommandPaletteAction[]
  footerHints: React.ReactNode | null
  ShortcutBar: React.ComponentType<React.HTMLAttributes<HTMLElement>>
  ShortcutHint: React.ComponentType<React.HTMLAttributes<HTMLElement>>
  ShortcutSep?: React.ComponentType
  Kbd?: React.ComponentType<React.HTMLAttributes<HTMLElement>>
}

export function ShellShortcutBar({
  tools,
  activeTool,
  selectedIndex,
  listResults,
  keyActionHints,
  toolActions,
  footerHints,
  ShortcutBar,
  ShortcutHint,
  ShortcutSep,
  Kbd,
}: Props) {
  return (
    <ShortcutBar style={{ justifyContent: 'space-between' }}>
      <ShortcutHint>
        {footerHints || (activeTool && keyActionHints.length > 0) ? (
          <>
            {footerHints}
            {activeTool &&
              keyActionHints.map((a, i) => (
                <React.Fragment key={a.key + (a.modifiers || []).join('')}>
                  {(i > 0 || footerHints) && ShortcutSep && <ShortcutSep />}
                  <span className="nuxy-shortcut-action" onClick={() => a.handler()}>
                    {Kbd &&
                      (Array.isArray(a.hint) ? (
                        a.hint.map((k, ki) => <Kbd key={ki}>{k}</Kbd>)
                      ) : (
                        <Kbd>{a.hint}</Kbd>
                      ))}
                    <span>{a.label}</span>
                  </span>
                </React.Fragment>
              ))}
          </>
        ) : (
          <span>{tools.length + 1} extensions loaded</span>
        )}
      </ShortcutHint>
      <ShortcutHint>
        {selectedIndex >= 0 && listResults.length > 0 && !activeTool ? (
          <>
            <span>Press</span>
            {Kbd && <Kbd>Enter</Kbd>}
            <span>to run</span>
          </>
        ) : toolActions.length > 0 ? (
          <>
            {Kbd && <Kbd>Ctrl</Kbd>}
            {Kbd && <Kbd>K</Kbd>}
            <span>to actions</span>
          </>
        ) : null}
      </ShortcutHint>
    </ShortcutBar>
  )
}
