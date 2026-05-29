import React, { useRef, useState, useEffect, useLayoutEffect } from 'react'



export interface SelectOption {
  value: string
  label: string
}



export interface SelectBoxProps {
  options: SelectOption[]
  value?: string
  open: boolean
  focusedIndex: number
  onSelect: (value: string) => void
  onClose: () => void
  onOpen?: (startIndex: number) => void
  placeholder?: string
  searchable?: boolean
}

export function SelectBox(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.SelectBox || (() => null);
  return <Impl {...props} />;
}

