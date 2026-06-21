import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  getItemType,
  getFilename,
  getParentDir,
  getFileExtension,
  getFileIconType,
  timeAgo,
  getListLabel,
  getListMeta,
} from '../utils/itemType.ts'
import type { ClipboardItem } from '../types.ts'

function item(overrides: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: 'id',
    text: '',
    image: null,
    copiedAt: new Date().toISOString(),
    pinned: false,
    ...overrides,
  }
}

describe('getItemType', () => {
  it('returns "image" when item has an image', () => {
    expect(getItemType(item({ image: 'base64' }))).toBe('image')
  })

  it('returns "color" for hex codes', () => {
    expect(getItemType(item({ text: '#ff0000' }))).toBe('color')
    expect(getItemType(item({ text: '#abc' }))).toBe('color')
    expect(getItemType(item({ text: '#aabbccdd' }))).toBe('color')
  })

  it('returns "color" for rgb/rgba/hsl/hsla', () => {
    expect(getItemType(item({ text: 'rgb(255, 0, 0)' }))).toBe('color')
    expect(getItemType(item({ text: 'rgba(0, 0, 0, 0.5)' }))).toBe('color')
    expect(getItemType(item({ text: 'hsl(120, 100%, 50%)' }))).toBe('color')
    expect(getItemType(item({ text: 'hsla(0, 0%, 0%, 1)' }))).toBe('color')
  })

  it('returns "url" for http/https links', () => {
    expect(getItemType(item({ text: 'https://example.com' }))).toBe('url')
    expect(getItemType(item({ text: 'http://foo.bar/baz' }))).toBe('url')
  })

  it('returns "file" for unix-style absolute paths', () => {
    expect(getItemType(item({ text: '/home/user/file.txt' }))).toBe('file')
    expect(getItemType(item({ text: '~/Documents/thing' }))).toBe('file')
  })

  it('returns "file" for Windows paths', () => {
    expect(getItemType(item({ text: 'C:\\Users\\file.txt' }))).toBe('file')
  })

  it('returns "text" for plain text', () => {
    expect(getItemType(item({ text: 'hello world' }))).toBe('text')
    expect(getItemType(item({ text: '' }))).toBe('text')
  })
})

describe('getFilename', () => {
  it('extracts filename from unix path', () => {
    expect(getFilename('/home/user/docs/file.txt')).toBe('file.txt')
  })

  it('extracts filename from windows path', () => {
    expect(getFilename('C:\\Users\\file.txt')).toBe('file.txt')
  })

  it('returns path itself when no separator', () => {
    expect(getFilename('file.txt')).toBe('file.txt')
  })
})

describe('getParentDir', () => {
  it('returns parent directory segments', () => {
    expect(getParentDir('/home/user/docs/file.txt')).toBe('home/user/docs')
  })

  it('returns empty string for single-segment paths', () => {
    expect(getParentDir('/file.txt')).toBe('')
    expect(getParentDir('file.txt')).toBe('')
  })
})

describe('getFileExtension', () => {
  it('extracts lowercase extension', () => {
    expect(getFileExtension('/path/to/FILE.PNG')).toBe('png')
    expect(getFileExtension('/path/to/script.ts')).toBe('ts')
  })

  it('returns empty string when no extension', () => {
    expect(getFileExtension('/path/to/Makefile')).toBe('')
  })
})

describe('getFileIconType', () => {
  it('returns "image-file" for image extensions', () => {
    expect(getFileIconType('png')).toBe('image-file')
    expect(getFileIconType('jpg')).toBe('image-file')
    expect(getFileIconType('svg')).toBe('image-file')
  })

  it('returns "pdf" for pdf', () => {
    expect(getFileIconType('pdf')).toBe('pdf')
  })

  it('returns "code" for source code extensions', () => {
    expect(getFileIconType('ts')).toBe('code')
    expect(getFileIconType('py')).toBe('code')
    expect(getFileIconType('json')).toBe('code')
  })

  it('returns "archive" for archive extensions', () => {
    expect(getFileIconType('zip')).toBe('archive')
    expect(getFileIconType('tar')).toBe('archive')
  })

  it('returns "document" for document extensions', () => {
    expect(getFileIconType('md')).toBe('document')
    expect(getFileIconType('docx')).toBe('document')
  })

  it('returns "file" for unknown extensions', () => {
    expect(getFileIconType('xyz')).toBe('file')
    expect(getFileIconType('')).toBe('file')
  })
})

describe('timeAgo', () => {
  afterEach(() => vi.useRealTimers())

  it('returns "now" for less than 1 minute ago', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T12:00:30Z'))
    expect(timeAgo('2025-01-01T12:00:00Z')).toBe('now')
  })

  it('returns minutes for less than 1 hour', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T12:05:00Z'))
    expect(timeAgo('2025-01-01T12:00:00Z')).toBe('5m')
  })

  it('returns hours for less than 24 hours', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T14:00:00Z'))
    expect(timeAgo('2025-01-01T12:00:00Z')).toBe('2h')
  })

  it('returns empty string for empty input', () => {
    expect(timeAgo('')).toBe('')
  })
})

describe('getListLabel', () => {
  it('returns "Copied!" when isCopied', () => {
    expect(getListLabel(item({ text: 'hello' }), 'text', true)).toBe('Copied!')
  })

  it('returns "Image" for image type with default text', () => {
    expect(getListLabel(item({ text: 'Image', image: 'b64' }), 'image', false)).toBe('Image')
  })

  it('returns item text for image type with custom label', () => {
    expect(getListLabel(item({ text: 'screenshot.png', image: 'b64' }), 'image', false)).toBe(
      'screenshot.png'
    )
  })

  it('returns filename for file type', () => {
    expect(getListLabel(item({ text: '/home/user/file.txt' }), 'file', false)).toBe('file.txt')
  })

  it('returns text for text type', () => {
    expect(getListLabel(item({ text: 'hello world' }), 'text', false)).toBe('hello world')
  })
})

describe('getListMeta', () => {
  it('returns "current" when isCurrent', () => {
    expect(getListMeta(item(), 'text', true)).toBe('current')
  })

  it('returns "Color" for color type', () => {
    expect(getListMeta(item({ text: '#fff' }), 'color', false)).toBe('Color')
  })

  it('returns "URL" for url type', () => {
    expect(getListMeta(item({ text: 'https://x.com' }), 'url', false)).toBe('URL')
  })

  it('returns "Image" for image type', () => {
    expect(getListMeta(item({ text: 'Image', image: 'b64' }), 'image', false)).toBe('Image')
  })

  it('returns parent dir for file with nested path', () => {
    expect(getListMeta(item({ text: '/home/user/docs/file.txt' }), 'file', false)).toBe(
      '…/home/user/docs'
    )
  })

  it('returns timeAgo for file with no parent dir', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T12:05:00Z'))
    const copiedAt = '2025-01-01T12:00:00Z'
    expect(getListMeta(item({ text: '/file.txt', copiedAt }), 'file', false)).toBe('5m')
    vi.useRealTimers()
  })
})
