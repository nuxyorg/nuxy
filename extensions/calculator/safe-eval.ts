/**
 * Safe arithmetic evaluator for calculator provider (no eval).
 * Supports + - * / ( ) and decimals.
 */
export function safeEvalMath(input: string): number {
  const expr = input.replace(/\s+/g, '')
  if (!expr || !/^[0-9+\-*/().]+$/.test(expr)) return NaN

  let i = 0

  function parseExpression(): number {
    let value = parseTerm()
    while (i < expr.length && (expr[i] === '+' || expr[i] === '-')) {
      const op = expr[i++]
      const right = parseTerm()
      value = op === '+' ? value + right : value - right
    }
    return value
  }

  function parseTerm(): number {
    let value = parseFactor()
    while (i < expr.length && (expr[i] === '*' || expr[i] === '/')) {
      const op = expr[i++]
      const right = parseFactor()
      if (op === '/' && right === 0) return NaN
      value = op === '*' ? value * right : value / right
    }
    return value
  }

  function parseFactor(): number {
    if (expr[i] === '(') {
      i++
      const value = parseExpression()
      if (expr[i] !== ')') return NaN
      i++
      return value
    }
    if (expr[i] === '-') {
      i++
      return -parseFactor()
    }
    if (expr[i] === '+') {
      i++
      return parseFactor()
    }
    const start = i
    while (i < expr.length && /[0-9.]/.test(expr[i])) i++
    if (start === i) return NaN
    const num = Number(expr.slice(start, i))
    return Number.isFinite(num) ? num : NaN
  }

  const result = parseExpression()
  if (i !== expr.length) return NaN
  return result
}
