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
  t: (key: string, vars?: Record<string, string | number>) => string
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
  t,
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
          <span>{t('footer.extensionsLoaded', { count: tools.length + 1 })}</span>
        )}
      </ShortcutHint>
      <ShortcutHint>
        {selectedIndex >= 0 && listResults.length > 0 && !activeTool ? (
          <>
            <span>{t('footer.pressToRun')}</span>
            {Kbd && <Kbd>↵</Kbd>}
            <span>{t('footer.toRun')}</span>
          </>
        ) : toolActions.length > 0 ? (
          <>
            {Kbd && <Kbd>Ctrl</Kbd>}
            {Kbd && <Kbd>K</Kbd>}
            <span>{t('footer.toActions')}</span>
          </>
        ) : null}
      </ShortcutHint>
    </ShortcutBar>
  )
}
