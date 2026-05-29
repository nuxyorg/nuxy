const React = window.React

interface Props {
  query: string
}

export default function MyExtensionView({ query }: Props) {
  return React.createElement(
    'div',
    { style: { padding: 'var(--space-4)' } },
    React.createElement('p', null, 'My extension — query: ', query || '(empty)')
  )
}
