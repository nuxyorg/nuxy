import React from 'react'



export type ShortcutHintProps = React.HTMLAttributes<HTMLDivElement>

export function ShortcutHint(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.ShortcutHint || (() => null);
  return <Impl {...props} />;
}

export function ShortcutSep(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.ShortcutSep || (() => null);
  return <Impl {...props} />;
}

