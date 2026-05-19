const React = window.React

export default function MyExtensionView({ query }) {
  return React.createElement(
    'div',
    { style: { padding: 16 } },
    React.createElement('p', null, 'My extension — query: ', query || '(empty)')
  )
}
