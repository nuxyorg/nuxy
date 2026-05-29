import React from 'react'



export function Input(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Input || (() => null);
  return <Impl {...props} />;
}

