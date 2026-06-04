export type TokenType = 'keyword' | 'string' | 'comment' | 'number' | 'operator' | 'plain'
export type Token = { type: TokenType; text: string }

function kw(...words: string[]): Set<string> {
  return new Set(words)
}

const KW: Record<string, Set<string>> = {}

KW.js = KW.javascript = kw(
  'const',
  'let',
  'var',
  'function',
  'return',
  'if',
  'else',
  'for',
  'while',
  'class',
  'import',
  'export',
  'from',
  'async',
  'await',
  'new',
  'this',
  'typeof',
  'instanceof',
  'try',
  'catch',
  'finally',
  'throw',
  'true',
  'false',
  'null',
  'undefined',
  'void',
  'in',
  'of',
  'do',
  'switch',
  'case',
  'break',
  'continue',
  'default',
  'extends',
  'super',
  'static',
  'delete',
  'yield',
  'get',
  'set',
  'with',
  'debugger'
)
KW.ts = KW.typescript = new Set([
  ...KW.js,
  'interface',
  'type',
  'enum',
  'implements',
  'declare',
  'abstract',
  'readonly',
  'keyof',
  'infer',
  'never',
  'as',
  'satisfies',
  'namespace',
  'override',
  'module',
  'asserts',
  'is',
  'unique',
  'accessor',
])
KW.py = KW.python = kw(
  'def',
  'class',
  'return',
  'import',
  'from',
  'as',
  'if',
  'elif',
  'else',
  'for',
  'while',
  'try',
  'except',
  'finally',
  'with',
  'pass',
  'break',
  'continue',
  'raise',
  'yield',
  'lambda',
  'True',
  'False',
  'None',
  'and',
  'or',
  'not',
  'in',
  'is',
  'del',
  'global',
  'nonlocal',
  'assert',
  'async',
  'await',
  'print'
)
KW.sh =
  KW.bash =
  KW.shell =
  KW.zsh =
    kw(
      'if',
      'then',
      'else',
      'elif',
      'fi',
      'for',
      'do',
      'done',
      'while',
      'case',
      'esac',
      'function',
      'return',
      'export',
      'local',
      'in',
      'until',
      'select',
      'echo',
      'exit',
      'source',
      'alias',
      'unset',
      'readonly',
      'declare',
      'typeset',
      'shift',
      'true',
      'false'
    )
KW.rust = kw(
  'fn',
  'let',
  'mut',
  'const',
  'struct',
  'enum',
  'impl',
  'trait',
  'use',
  'mod',
  'pub',
  'priv',
  'return',
  'if',
  'else',
  'for',
  'while',
  'loop',
  'match',
  'in',
  'move',
  'ref',
  'self',
  'Self',
  'super',
  'crate',
  'as',
  'where',
  'type',
  'unsafe',
  'async',
  'await',
  'dyn',
  'box',
  'extern',
  'static',
  'true',
  'false',
  'break',
  'continue',
  'i8',
  'i16',
  'i32',
  'i64',
  'i128',
  'isize',
  'u8',
  'u16',
  'u32',
  'u64',
  'u128',
  'usize',
  'f32',
  'f64',
  'bool',
  'char',
  'str',
  'String',
  'Vec',
  'Option',
  'Result'
)
KW.go = kw(
  'func',
  'var',
  'const',
  'type',
  'struct',
  'interface',
  'map',
  'chan',
  'package',
  'import',
  'return',
  'if',
  'else',
  'for',
  'range',
  'select',
  'switch',
  'case',
  'default',
  'break',
  'continue',
  'goto',
  'fallthrough',
  'defer',
  'go',
  'make',
  'new',
  'nil',
  'true',
  'false',
  'len',
  'cap',
  'append',
  'copy',
  'delete',
  'close',
  'error',
  'int',
  'int8',
  'int16',
  'int32',
  'int64',
  'uint',
  'float32',
  'float64',
  'string',
  'bool',
  'byte'
)
KW.java = kw(
  'class',
  'interface',
  'enum',
  'extends',
  'implements',
  'import',
  'package',
  'public',
  'private',
  'protected',
  'static',
  'final',
  'abstract',
  'synchronized',
  'volatile',
  'transient',
  'native',
  'new',
  'this',
  'super',
  'return',
  'if',
  'else',
  'for',
  'while',
  'do',
  'switch',
  'case',
  'break',
  'continue',
  'default',
  'try',
  'catch',
  'finally',
  'throw',
  'throws',
  'void',
  'null',
  'true',
  'false',
  'instanceof',
  'int',
  'long',
  'double',
  'float',
  'boolean',
  'char',
  'byte',
  'short',
  'String'
)
KW.c = kw(
  'auto',
  'break',
  'case',
  'char',
  'const',
  'continue',
  'default',
  'do',
  'double',
  'else',
  'enum',
  'extern',
  'float',
  'for',
  'goto',
  'if',
  'int',
  'long',
  'register',
  'return',
  'short',
  'signed',
  'sizeof',
  'static',
  'struct',
  'switch',
  'typedef',
  'union',
  'unsigned',
  'void',
  'volatile',
  'while',
  'NULL',
  'true',
  'false',
  'include',
  'define',
  'ifdef',
  'ifndef',
  'endif',
  'pragma'
)
KW.cpp = new Set([
  ...KW.c,
  'class',
  'namespace',
  'template',
  'typename',
  'virtual',
  'override',
  'public',
  'private',
  'protected',
  'new',
  'delete',
  'this',
  'nullptr',
  'bool',
  'using',
  'inline',
  'explicit',
  'operator',
  'friend',
  'constexpr',
  'noexcept',
  'auto',
  'decltype',
  'mutable',
  'string',
  'vector',
  'map',
  'set',
  'cout',
  'cin',
])
KW.ruby = kw(
  'def',
  'class',
  'module',
  'return',
  'if',
  'elsif',
  'else',
  'unless',
  'for',
  'while',
  'do',
  'end',
  'begin',
  'rescue',
  'ensure',
  'raise',
  'yield',
  'lambda',
  'proc',
  'self',
  'nil',
  'true',
  'false',
  'and',
  'or',
  'not',
  'in',
  'then',
  'case',
  'when',
  'puts',
  'print',
  'require',
  'include',
  'extend',
  'attr_reader',
  'attr_writer',
  'attr_accessor'
)
KW.php = kw(
  'function',
  'class',
  'return',
  'if',
  'elseif',
  'else',
  'foreach',
  'for',
  'while',
  'do',
  'switch',
  'case',
  'break',
  'continue',
  'default',
  'try',
  'catch',
  'finally',
  'throw',
  'new',
  'null',
  'true',
  'false',
  'echo',
  'print',
  'const',
  'static',
  'public',
  'private',
  'protected',
  'interface',
  'extends',
  'implements',
  'use',
  'namespace',
  'require',
  'include',
  'abstract',
  'final'
)
KW.sql = kw(
  'SELECT',
  'FROM',
  'WHERE',
  'JOIN',
  'LEFT',
  'RIGHT',
  'INNER',
  'OUTER',
  'CROSS',
  'FULL',
  'ON',
  'AS',
  'AND',
  'OR',
  'NOT',
  'IN',
  'IS',
  'NULL',
  'INSERT',
  'UPDATE',
  'DELETE',
  'CREATE',
  'DROP',
  'ALTER',
  'TABLE',
  'INDEX',
  'VIEW',
  'TRIGGER',
  'PROCEDURE',
  'FUNCTION',
  'DATABASE',
  'SCHEMA',
  'GROUP',
  'BY',
  'ORDER',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'UNION',
  'ALL',
  'DISTINCT',
  'COUNT',
  'SUM',
  'AVG',
  'MAX',
  'MIN',
  'INTO',
  'VALUES',
  'SET',
  'PRIMARY',
  'KEY',
  'FOREIGN',
  'REFERENCES',
  'UNIQUE',
  'DEFAULT',
  'WITH',
  'CASE',
  'WHEN',
  'THEN',
  'END',
  'ELSE',
  'EXISTS',
  'BETWEEN',
  'LIKE',
  'ASC',
  'DESC',
  'CONSTRAINT',
  'CHECK',
  'COMMIT',
  'ROLLBACK',
  'BEGIN',
  'TRANSACTION'
)

export function highlight(code: string, lang: string): Token[] {
  const langKey = lang.toLowerCase()
  const keywords = KW[langKey] ?? new Set<string>()
  const isSQL = langKey === 'sql'
  const isPython = langKey === 'python' || langKey === 'py'
  const isHashComment =
    isPython ||
    langKey === 'sh' ||
    langKey === 'bash' ||
    langKey === 'shell' ||
    langKey === 'zsh' ||
    langKey === 'ruby' ||
    langKey === 'r' ||
    langKey === 'perl' ||
    langKey === 'yaml' ||
    langKey === 'toml' ||
    langKey === 'ini'

  const tokens: Token[] = []
  let i = 0
  const n = code.length

  while (i < n) {
    const ch = code[i]

    // Block comment /* ... */
    if (ch === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i + 2)
      const text = end === -1 ? code.slice(i) : code.slice(i, end + 2)
      tokens.push({ type: 'comment', text })
      i += text.length
      continue
    }

    // Line comment //
    if (ch === '/' && code[i + 1] === '/') {
      const end = code.indexOf('\n', i)
      const text = end === -1 ? code.slice(i) : code.slice(i, end)
      tokens.push({ type: 'comment', text })
      i += text.length
      continue
    }

    // Hash comment
    if (ch === '#' && isHashComment) {
      const end = code.indexOf('\n', i)
      const text = end === -1 ? code.slice(i) : code.slice(i, end)
      tokens.push({ type: 'comment', text })
      i += text.length
      continue
    }

    // SQL line comment --
    if (isSQL && ch === '-' && code[i + 1] === '-') {
      const end = code.indexOf('\n', i)
      const text = end === -1 ? code.slice(i) : code.slice(i, end)
      tokens.push({ type: 'comment', text })
      i += text.length
      continue
    }

    // Triple-quoted string (Python, Ruby)
    if (
      (isPython || langKey === 'ruby') &&
      (ch === '"' || ch === "'") &&
      code[i + 1] === ch &&
      code[i + 2] === ch
    ) {
      const quote = code.slice(i, i + 3)
      const end = code.indexOf(quote, i + 3)
      const text = end === -1 ? code.slice(i) : code.slice(i, end + 3)
      tokens.push({ type: 'string', text })
      i += text.length
      continue
    }

    // String: " ' `
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1
      while (j < n) {
        if (code[j] === '\\' && j + 1 < n) {
          j += 2
          continue
        }
        if (code[j] === ch) {
          j++
          break
        }
        if (ch !== '`' && code[j] === '\n') break
        j++
      }
      tokens.push({ type: 'string', text: code.slice(i, j) })
      i = j
      continue
    }

    // Number (hex, binary, octal, float, integer)
    if ((ch >= '0' && ch <= '9') || (ch === '.' && code[i + 1] >= '0' && code[i + 1] <= '9')) {
      let j = i
      if (code[j] === '0' && (code[j + 1] === 'x' || code[j + 1] === 'X')) {
        j += 2
        while (j < n && /[0-9a-fA-F_]/.test(code[j])) j++
      } else if (code[j] === '0' && (code[j + 1] === 'b' || code[j + 1] === 'B')) {
        j += 2
        while (j < n && (code[j] === '0' || code[j] === '1' || code[j] === '_')) j++
      } else if (code[j] === '0' && (code[j + 1] === 'o' || code[j + 1] === 'O')) {
        j += 2
        while (j < n && /[0-7_]/.test(code[j])) j++
      } else {
        while (j < n && ((code[j] >= '0' && code[j] <= '9') || code[j] === '_')) j++
        if (j < n && code[j] === '.') {
          j++
          while (j < n && ((code[j] >= '0' && code[j] <= '9') || code[j] === '_')) j++
        }
        if (j < n && (code[j] === 'e' || code[j] === 'E')) {
          j++
          if (j < n && (code[j] === '+' || code[j] === '-')) j++
          while (j < n && code[j] >= '0' && code[j] <= '9') j++
        }
      }
      // Numeric suffix (n, f, L, u, etc.)
      if (j < n && /[nNfFuUlLdD]/.test(code[j])) j++
      tokens.push({ type: 'number', text: code.slice(i, j) })
      i = j
      continue
    }

    // Identifier or keyword
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_' || ch === '$') {
      let j = i
      while (j < n && /[a-zA-Z0-9_$]/.test(code[j])) j++
      const word = code.slice(i, j)
      const check = isSQL ? word.toUpperCase() : word
      tokens.push({ type: keywords.has(check) ? 'keyword' : 'plain', text: word })
      i = j
      continue
    }

    // Whitespace — group runs together
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      let j = i
      while (j < n && (code[j] === ' ' || code[j] === '\t' || code[j] === '\n' || code[j] === '\r'))
        j++
      tokens.push({ type: 'plain', text: code.slice(i, j) })
      i = j
      continue
    }

    // Operator / punctuation — single char
    tokens.push({ type: 'operator', text: ch })
    i++
  }

  return tokens
}
