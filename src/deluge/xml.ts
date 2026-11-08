/**
 * Minimal, strict, DOM-free XML parser for Deluge files.
 *
 * Builds a lightweight element tree implementing the small Element API surface the versioned parsers use
 * (`XmlElement`). A DOM `Element` satisfies the same interface, so parsers accept either.
 *
 * Strict on purpose: anything malformed or outside what Deluge writes (DOCTYPE, namespaces, unknown entities,
 * non-ASCII names, non UTF-8 declaration...) returns `null`, and the caller falls back to DOMParser. That keeps
 * DOMParser's partial-document and error-message behavior for broken files without reimplementing libxml2.
 *
 * Worker-safe: uses no DOM APIs.
 */

export interface XmlAttr { readonly name: string, readonly value: string }

/** The Element API subset used by the versioned parsers. Both DOM `Element` and `XElement` implement it. */
export interface XmlElement {
  readonly tagName: string
  readonly nodeName: string
  readonly children: ArrayLike<XmlElement>
  readonly attributes: ArrayLike<XmlAttr>
  readonly textContent: string | null
  /** Only used in error messages. */
  readonly outerHTML: string
  getAttribute(name: string): string | null
  hasAttribute(name: string): boolean
  getElementsByTagName(name: string): ArrayLike<XmlElement>
}

const EMPTY: XElement[] = []

export class XElement implements XmlElement {
  children: XElement[] = EMPTY
  /** Flat [name, value, name, value, ...] */
  attrs: string[] = EMPTY as unknown as string[]
  /** Content range in src (between start and end tag). cStart === cEnd for empty/self-closing elements. */
  cStart = 0
  cEnd = 0
  end = 0

  constructor(readonly tagName: string, readonly src: string, readonly start: number) {}

  get nodeName() { return this.tagName }

  getAttribute(name: string): string | null {
    const a = this.attrs
    for (let i = 0; i < a.length; i += 2) if (a[i] === name) return a[i + 1]
    return null
  }

  hasAttribute(name: string): boolean {
    const a = this.attrs
    for (let i = 0; i < a.length; i += 2) if (a[i] === name) return true
    return false
  }

  get attributes(): XmlAttr[] {
    const out: XmlAttr[] = []
    const a = this.attrs
    for (let i = 0; i < a.length; i += 2) out.push({ name: a[i], value: a[i + 1] })
    return out
  }

  getElementsByTagName(name: string): XElement[] {
    const out: XElement[] = []
    const walk = (el: XElement) => {
      for (const c of el.children) {
        if (c.tagName === name) out.push(c)
        if (c.children.length) walk(c)
      }
    }
    walk(this)
    return out
  }

  get textContent(): string {
    return contentText(this.src, this.cStart, this.cEnd)
  }

  /** Source slice, not a re-serialization. Callers that need DOMParser-exact text must use the DOM fallback. */
  get outerHTML(): string {
    return this.src.slice(this.start, this.end)
  }
}

// Character classes ----------------------------------------------------------------------------------------------------

const NAME_START = new Uint8Array(128)
const NAME_CHAR = new Uint8Array(128)
for (let c = 0; c < 128; c++) {
  const ch = String.fromCharCode(c)
  if (/[A-Za-z_]/.test(ch)) NAME_START[c] = 1
  if (/[A-Za-z0-9_.-]/.test(ch)) NAME_CHAR[c] = 1
}
const isWs = (c: number) => c === 32 || c === 10 || c === 9 || c === 13

/** Characters that need the slow path in attribute values. */
const ATTR_SPECIAL = /[<&\t\n\r\x00-\x08\x0b\x0c\x0e-\x1f￾￿]/
const ATTR_INVALID = /[<\x00-\x08\x0b\x0c\x0e-\x1f￾￿]/
const TEXT_SPECIAL = /[&\r]/

class Malformed extends Error {}
const fail = (): never => { throw new Malformed() }

// Entities -------------------------------------------------------------------------------------------------------------

/** Decode the reference starting at src[i] === '&'. Returns [text, indexAfter]. Throws Malformed on anything invalid. */
function decodeRef(src: string, i: number): [string, number] {
  const semi = src.indexOf(';', i)
  if (semi < 0 || semi - i > 12) fail()
  const ref = src.slice(i + 1, semi)
  switch (ref) {
    case 'amp': return ['&', semi + 1]
    case 'lt': return ['<', semi + 1]
    case 'gt': return ['>', semi + 1]
    case 'quot': return ['"', semi + 1]
    case 'apos': return ["'", semi + 1]
  }
  let cp: number
  if (/^#[0-9]+$/.test(ref)) cp = parseInt(ref.slice(1), 10)
  else if (/^#x[0-9a-fA-F]+$/.test(ref)) cp = parseInt(ref.slice(2), 16)
  else return fail()
  const valid = cp === 9 || cp === 10 || cp === 13 || (cp >= 0x20 && cp <= 0xd7ff) || (cp >= 0xe000 && cp <= 0xfffd) || (cp >= 0x10000 && cp <= 0x10ffff)
  if (!valid) fail()
  return [String.fromCodePoint(cp), semi + 1]
}

/** Decode a validated attribute value: line-end normalization, then literal whitespace → space, then entities. */
function decodeAttr(raw: string): string {
  let out = ''
  for (let i = 0; i < raw.length;) {
    const c = raw.charCodeAt(i)
    if (c === 38) { const [t, j] = decodeRef(raw, i); out += t; i = j }
    else if (c === 13) { out += ' '; i += raw.charCodeAt(i + 1) === 10 ? 2 : 1 }
    else if (c === 9 || c === 10) { out += ' '; i++ }
    else { out += raw[i]; i++ }
  }
  return out
}

/** Decode a validated text run: line-end normalization and entities. */
function decodeText(src: string, from: number, to: number): string {
  const raw = src.slice(from, to)
  if (!TEXT_SPECIAL.test(raw)) return raw
  let out = ''
  for (let i = 0; i < raw.length;) {
    const c = raw.charCodeAt(i)
    if (c === 38) { const [t, j] = decodeRef(raw, i); out += t; i = j }
    else if (c === 13) { out += '\n'; i += raw.charCodeAt(i + 1) === 10 ? 2 : 1 }
    else { out += raw[i]; i++ }
  }
  return out
}

/** textContent of an already-validated content range: concatenated text and CDATA, skipping tags, comments and PIs. */
function contentText(src: string, from: number, to: number): string {
  let lt = src.indexOf('<', from)
  if (lt < 0 || lt >= to) return decodeText(src, from, to)
  let out = ''
  let i = from
  while (i < to) {
    lt = src.indexOf('<', i)
    if (lt < 0 || lt >= to) { out += decodeText(src, i, to); break }
    if (lt > i) out += decodeText(src, i, lt)
    if (src.startsWith('<!--', lt)) i = src.indexOf('-->', lt + 4) + 3
    else if (src.startsWith('<![CDATA[', lt)) {
      const e = src.indexOf(']]>', lt + 9)
      out += src.slice(lt + 9, e).replace(/\r\n?/g, '\n')
      i = e + 3
    }
    else if (src.charCodeAt(lt + 1) === 63) i = src.indexOf('?>', lt + 2) + 2
    else i = skipTag(src, lt)
  }
  return out
}

/** Index after the '>' of the (validated) tag starting at src[lt]. Honors quoted attribute values. */
function skipTag(src: string, lt: number): number {
  let i = lt + 1
  for (;;) {
    const c = src.charCodeAt(i)
    if (c === 62) return i + 1
    if (c === 34 || c === 39) i = src.indexOf(src[i], i + 1) + 1
    else i++
  }
}

// Parser ---------------------------------------------------------------------------------------------------------------

const XML_DECL = /^<\?xml[ \t\r\n]+version[ \t\r\n]*=[ \t\r\n]*(["'])1\.[0-9]+\1(?:[ \t\r\n]+encoding[ \t\r\n]*=[ \t\r\n]*(["'])([A-Za-z][A-Za-z0-9._-]*)\2)?(?:[ \t\r\n]+standalone[ \t\r\n]*=[ \t\r\n]*(["'])(?:yes|no)\4)?[ \t\r\n]*\?>/

/**
 * Parse an XML string. Returns the root element, or `null` if the document is malformed or uses anything this parser
 * does not handle (caller should then use DOMParser).
 */
export function parseXml(src: string): XElement | null {
  try {
    return parse(src)
  } catch (e) {
    if (e instanceof Malformed || e instanceof RangeError || e instanceof TypeError) return null
    throw e
  }
}

function readName(src: string, i: number): number {
  const c = src.charCodeAt(i)
  if (!(c < 128 && NAME_START[c])) fail()
  i++
  for (;;) {
    const d = src.charCodeAt(i)
    if (d < 128 && NAME_CHAR[d]) i++
    else if (d >= 128) return fail() // Non-ASCII names: leave to DOMParser
    else return i
  }
}

/** Validate a comment or PI starting at lt; returns index after it. */
function skipMisc(src: string, lt: number): number {
  if (src.startsWith('<!--', lt)) {
    const e = src.indexOf('--', lt + 4)
    if (e < 0 || src.charCodeAt(e + 2) !== 62) fail() // '--' not allowed inside comments
    checkChars(src, lt + 4, e)
    return e + 3
  }
  if (src.charCodeAt(lt + 1) === 63) {
    const nameEnd = readName(src, lt + 2)
    if (src.slice(lt + 2, nameEnd).toLowerCase() === 'xml') fail()
    const e = src.indexOf('?>', nameEnd)
    if (e < 0) fail()
    if (e > nameEnd && !isWs(src.charCodeAt(nameEnd))) fail()
    checkChars(src, nameEnd, e)
    return e + 2
  }
  return fail()
}

const INVALID_CHARS = /[\x00-\x08\x0b\x0c\x0e-\x1f￾￿]/
function checkChars(src: string, from: number, to: number) {
  if (INVALID_CHARS.test(src.slice(from, to))) fail()
}

/** Validate a text run (inside the root element). */
function checkText(src: string, from: number, to: number) {
  for (let i = from; i < to; i++) {
    const c = src.charCodeAt(i)
    if (c < 32) { if (c !== 9 && c !== 10 && c !== 13) fail() }
    else if (c === 38) i = decodeRef(src, i)[1] - 1
    else if (c === 93) { if (src.charCodeAt(i + 1) === 93 && src.charCodeAt(i + 2) === 62) fail() }
    else if (c >= 0xfffe) { if (c <= 0xffff) fail() }
  }
}

function skipWs(src: string, i: number): number {
  while (isWs(src.charCodeAt(i))) i++
  return i
}

function parse(src: string): XElement {
  const n = src.length
  let i = 0
  if (src.startsWith('<?xml')) {
    const m = XML_DECL.exec(src)
    if (!m) fail()
    if (m![3] && m![3].toLowerCase() !== 'utf-8') fail()
    i = m![0].length
  }

  // Prolog: whitespace, comments, PIs
  for (;;) {
    i = skipWs(src, i)
    if (src.charCodeAt(i) !== 60) fail()
    const c = src.charCodeAt(i + 1)
    if (c === 33 || c === 63) i = skipMisc(src, i)
    else break
  }

  const stack: XElement[] = []
  let cur: XElement | null = null
  let root: XElement | null = null

  while (i < n) {
    // Text up to the next tag
    const lt = src.indexOf('<', i)
    if (lt < 0) fail()
    if (lt > i) checkText(src, i, lt)
    i = lt
    const c = src.charCodeAt(i + 1)

    if (c === 47) { // '</'
      const nameEnd = readName(src, i + 2)
      const el = cur!
      if (src.slice(i + 2, nameEnd) !== el.tagName) fail()
      const gt = skipWs(src, nameEnd)
      if (src.charCodeAt(gt) !== 62) fail()
      el.cEnd = i
      el.end = gt + 1
      i = gt + 1
      stack.pop()
      cur = stack.length ? stack[stack.length - 1] : null
      if (!cur) { root = el; break }
      continue
    }

    if (c === 33) { // '<!'
      if (src.startsWith('<![CDATA[', i)) {
        const e = src.indexOf(']]>', i + 9)
        if (e < 0) fail()
        checkChars(src, i + 9, e)
        i = e + 3
      } else i = skipMisc(src, i)
      continue
    }
    if (c === 63) { i = skipMisc(src, i); continue }

    // Start tag
    const nameEnd = readName(src, i + 1)
    const el = new XElement(src.slice(i + 1, nameEnd), src, i)
    let j = nameEnd
    let attrs: string[] | null = null
    let selfClose = false
    for (;;) {
      const k = skipWs(src, j)
      const d = src.charCodeAt(k)
      if (d === 62) { j = k + 1; break }
      if (d === 47) {
        if (src.charCodeAt(k + 1) !== 62) fail()
        j = k + 2
        selfClose = true
        break
      }
      if (k === j) fail() // Attributes must be separated by whitespace
      const aEnd = readName(src, k)
      const aName = src.slice(k, aEnd)
      let q = skipWs(src, aEnd)
      if (src.charCodeAt(q) !== 61) fail()
      q = skipWs(src, q + 1)
      const quote = src.charCodeAt(q)
      if (quote !== 34 && quote !== 39) fail()
      const vEnd = src.indexOf(quote === 34 ? '"' : "'", q + 1)
      if (vEnd < 0) fail()
      let value = src.slice(q + 1, vEnd)
      if (ATTR_SPECIAL.test(value)) {
        if (ATTR_INVALID.test(value)) fail()
        value = decodeAttr(value)
      }
      if (attrs) {
        for (let a = 0; a < attrs.length; a += 2) if (attrs[a] === aName) fail()
        attrs.push(aName, value)
      } else attrs = [aName, value]
      j = vEnd + 1
    }
    if (attrs) {
      // Reject namespaces: DOMParser treats them specially
      for (let a = 0; a < attrs.length; a += 2) if (attrs[a] === 'xmlns') fail()
      el.attrs = attrs
    }

    if (cur) {
      if (cur.children === EMPTY) cur.children = [el]
      else cur.children.push(el)
    }
    if (selfClose) {
      el.cStart = el.cEnd = j
      el.end = j
      if (!cur) { root = el; i = j; break }
    } else {
      el.cStart = j
      stack.push(el)
      cur = el
    }
    i = j
  }

  if (!root) fail()

  // Epilog: whitespace, comments, PIs only
  for (;;) {
    i = skipWs(src, i)
    if (i >= n) break
    if (src.charCodeAt(i) !== 60) fail()
    const c = src.charCodeAt(i + 1)
    if (c === 33 || c === 63) i = skipMisc(src, i)
    else fail()
  }
  return root!
}
