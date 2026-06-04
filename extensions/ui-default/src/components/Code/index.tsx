import React from 'react'
import './index.css'
import { CopyButton } from '../CopyButton'
import { highlight } from '../../utils/highlight'

export interface CodeProps extends React.HTMLAttributes<HTMLElement> {}

export function Code({ children, className, ...props }: CodeProps) {
  return (
    <code className={`nuxy-code ${className || ''}`} {...props}>
      {children}
    </code>
  )
}

export interface CodeBlockProps {
  code: string
  language?: string
  showCopy?: boolean
  className?: string
}

export function CodeBlock({ code, language = 'text', showCopy = true, className }: CodeBlockProps) {
  const lang = language.toLowerCase()
  const shouldHighlight = lang !== 'text' && lang !== 'plain' && lang !== ''
  const tokens = shouldHighlight ? highlight(code, lang) : null

  return (
    <div className={`nuxy-code-block ${className || ''}`}>
      {(language || showCopy) && (
        <div className="nuxy-code-block__header">
          <span className="nuxy-code-block__lang">{language}</span>
          {showCopy && (
            <CopyButton value={code} label="Copy code" className="nuxy-code-block__copy" />
          )}
        </div>
      )}
      <pre className="nuxy-code-block__pre">
        <code>
          {tokens
            ? tokens.map((tok, i) =>
                tok.type === 'plain' ? (
                  tok.text
                ) : (
                  <span key={i} className={`nuxy-hl-${tok.type}`}>
                    {tok.text}
                  </span>
                )
              )
            : code}
        </code>
      </pre>
    </div>
  )
}
