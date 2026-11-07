/**
 * Minimal, formatting-preserving XML value rewriter.
 *
 * Deluge files are not always well-formed XML (2.x files have several top-level elements), so we cannot round-trip
 * them through a DOM. Instead we walk the raw text and only touch attribute values and text content, leaving every
 * other byte untouched.
 *
 * Both Deluge XML styles map to the same field key:
 * - 2.x: `<osc1><transpose>0</transpose></osc1>` -> parent 'osc1', field 'transpose'
 * - 3.x: `<osc1 transpose="0" />`               -> parent 'osc1', field 'transpose'
 */

export type FieldContext = {
  /** Open element stack, root first. For text values the last item is the element holding the text. */
  path: readonly string[]
  /** Element owning the field (attr: the element itself, text: the element's parent). */
  parent: string
  /** Attribute name, or element name for text values. */
  field: string
  kind: 'attr' | 'text'
  /** Original attribute values of the element owning the field (attr kind only; empty for text). */
  attrs: Readonly<Record<string, string>>
}

export type FieldVisitor = (ctx: FieldContext, value: string) => string

/** Key used to group values of the same logical field across files and firmware styles. */
export function fieldKey(ctx: Pick<FieldContext, 'parent' | 'field'>) {
  return `${ctx.parent}.${ctx.field}`
}

function findTagEnd(xml: string, lt: number): number {
  if (xml.startsWith('<!--', lt)) {
    const end = xml.indexOf('-->', lt)
    if (end === -1) throw new Error(`Unterminated comment at ${lt}`)
    return end + 2
  }
  let quote: string | null = null
  for (let i = lt + 1; i < xml.length; i++) {
    const c = xml[i]
    if (quote) {
      if (c === quote) quote = null
    } else if (c === '"' || c === "'") {
      quote = c
    } else if (c === '>') {
      return i
    }
  }
  throw new Error(`Unterminated tag at ${lt}`)
}

const ATTR_RE = /([^\s=<>/]+)(\s*=\s*)"([^"]*)"/g

/**
 * Walk the XML text and replace every attribute value and non-whitespace text value with whatever `visit` returns.
 * Returning the input value unchanged keeps the file byte-identical.
 */
export function rewriteXml(xml: string, visit: FieldVisitor): string {
  const out: string[] = []
  const stack: string[] = []
  let i = 0

  while (i < xml.length) {
    const lt = xml.indexOf('<', i)
    const textEnd = lt === -1 ? xml.length : lt

    if (textEnd > i) {
      const text = xml.slice(i, textEnd)
      if (text.trim() && stack.length > 0) {
        const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/)!
        const ctx: FieldContext = { path: stack, parent: stack[stack.length - 2] ?? '', field: stack[stack.length - 1], kind: 'text', attrs: {} }
        out.push(m[1] + visit(ctx, m[2]) + m[3])
      } else {
        out.push(text)
      }
    }
    if (lt === -1) break

    const gt = findTagEnd(xml, lt)
    const tag = xml.slice(lt, gt + 1)

    if (tag.startsWith('<?') || tag.startsWith('<!')) {
      out.push(tag)
    } else if (tag.startsWith('</')) {
      stack.pop()
      out.push(tag)
    } else {
      const name = tag.match(/^<\s*([^\s/>]+)/)![1]
      const selfClosing = /\/\s*>$/.test(tag)
      stack.push(name)
      const attrs: Record<string, string> = {}
      for (const m of tag.matchAll(ATTR_RE)) attrs[m[1]] = m[3]
      out.push(tag.replace(ATTR_RE, (_all, attr: string, eq: string, value: string) => {
        const ctx: FieldContext = { path: stack, parent: name, field: attr, kind: 'attr', attrs }
        return `${attr}${eq}"${visit(ctx, value)}"`
      }))
      if (selfClosing) stack.pop()
    }
    i = gt + 1
  }

  return out.join('')
}

/** Collect every element path (e.g. `sound/osc1/zone`) in the file. Used as coverage features. */
export function collectFeatures(xml: string): Set<string> {
  const features = new Set<string>()
  rewriteXml(xml, (ctx, value) => {
    features.add(`${ctx.path.join('/')}@${ctx.kind === 'attr' ? ctx.field : '#text'}`)
    return value
  })
  return features
}
