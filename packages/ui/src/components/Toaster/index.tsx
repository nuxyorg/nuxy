import React, { useEffect, useState, useCallback } from 'react'

export function Toaster(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Toaster || (() => null);
  return <Impl {...props} />;
}

export { toast } from './store'
export type { ToastOptions } from './store'
