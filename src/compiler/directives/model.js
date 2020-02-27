/* @flow */

/**
 * Cross-platform code generation for component v-model
 */
export function genComponentModel (
  el: ASTElement,
  value: string,
  modifiers: ?ASTModifiers
): ?boolean {
  const { number, trim } = modifiers || {}

  const baseValueExpression = '$$v'
  let valueExpression = baseValueExpression
  if (trim) {
    valueExpression =
      `(typeof ${baseValueExpression} === 'string'` +
      `? ${baseValueExpression}.trim()` +
      `: ${baseValueExpression})`
  }
  if (number) {
    // _n->toNumber
    valueExpression = `_n(${valueExpression})`
  }
  const assignment = genAssignmentCode(value, valueExpression)

  el.model = {
    value: `(${value})`,
    expression: JSON.stringify(value),
    callback: `function (${baseValueExpression}) {${assignment}}`
    // 字面量：callback:`function($$v){value=expression}`
    // callback:`function($$v){$set(exp,key,)}`
  }
}

/**
 * Cross-platform codegen helper for generating v-model value assignment code.
 */
// genDefaultModel中，assignment：$event.target.value
export function genAssignmentCode (
  value: string,
  assignment: string
): string {
  const res = parseModel(value)
  // res对象是这样的res: { exp: '', key: "" }
  // 假设v-model="A", res:{exp:'A',key:null}
  // 假设v-model="A.B", res:{exp:'A',key:"B"}
  // 假设v-model="A["B"]", res:{exp:'A',key:"B"}
  // 假设v-model="A.B["C"]", res:{exp:'A.B',key:"C"}
  // 假设v-model="A.B["C"]["D"]", res:{exp:'A.B["C"]',key:"D"}
  if (res.key === null) {
    return `${value}=${assignment}` // 相当于字面量的直接赋值
  } else {
    return `$set(${res.exp}, ${res.key}, ${assignment})` // 对象或者数组中的需要$set
  }
}

/**
 * Parse a v-model expression into a base path and a final key segment.
 * Handles both dot-path and possible square brackets.
 *
 * Possible cases:
 *
 * - test
 * - test[key]
 * - test[test1[key]]
 * - test["a"][key]
 * - xxx.test[a[a].test1[key]]
 * - test.xxx.a["asa"][test1[key]]
 *
 */

let len, str, chr, index, expressionPos, expressionEndPos

type ModelParseResult = {
  exp: string,
  key: string | null
}

export function parseModel (val: string): ModelParseResult {
  // Fix https://github.com/vuejs/vue/pull/7730
  // allow v-model="obj.val " (trailing whitespace)
  val = val.trim()
  len = val.length
  // 使用中括号，并且有.,只能是这样的情况A.B
  if (val.indexOf('[') < 0 || val.lastIndexOf(']') < len - 1) {
    index = val.lastIndexOf('.')
    if (index > -1) { // 如果value中还有.说明v-model="A.B"
      return {
        exp: val.slice(0, index),
        key: '"' + val.slice(index + 1) + '"' //{exp:A,key:'B'}
      }
    } else { // 没有.说明只绑定了某个值
      return {
        exp: val,
        key: null // {exp:"A",key:null}
      }
    }
  }

  str = val
  index = expressionPos = expressionEndPos = 0
  // 有中括号的才会走到这里
  while (!eof()) {
    chr = next()
    /* istanbul ignore if */
    if (isStringStart(chr)) { // 是单引号或者双引号
      parseString(chr) // index移动到引号结束位置，即expressionPos到达引号结束位置
    } else if (chr === 0x5B) { // 左中括号[
      parseBracket(chr)
    }
  }
  // A["B"]--->{exp:A[B].slice(0,1),key:A[B].slice(3,4)}->{exp:A,key:B}
  // A["B"]["C"]-->{exp:A["B"],key:C}
  return {
    exp: val.slice(0, expressionPos),
    key: val.slice(expressionPos + 1, expressionEndPos)
  }
}

function next (): number {
  return str.charCodeAt(++index)
}

function eof (): boolean {
  return index >= len
}

function isStringStart (chr: number): boolean {
  return chr === 0x22 || chr === 0x27 // 0x22是",0x27是'
}

function parseBracket (chr: number): void {
  let inBracket = 1
  expressionPos = index // 开始位置
  while (!eof()) {
    chr = next()
    if (isStringStart(chr)) { // 引号
      parseString(chr)
      continue
    }
    if (chr === 0x5B) inBracket++ // 左中括号[
    if (chr === 0x5D) inBracket-- // 有中括号]
    if (inBracket === 0) {
      expressionEndPos = index // 结束位置
      break
    }
  }
}

function parseString (chr: number): void {
  const stringQuote = chr
  while (!eof()) {
    chr = next()
    if (chr === stringQuote) {
      break
    }
  }
}
