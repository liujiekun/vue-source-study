/* @flow */

import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

import Vue from './runtime/index'
import { query } from './util/index'
import { compileToFunctions } from './compiler/index'
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat'

const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})
// 偷天换日，先存储之前定义的Vue.prototype.$mount，
// 然后重新定义Vue.prototype.$mount
const mount = Vue.prototype.$mount
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && query(el)

  /* istanbul ignore if */
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }

  const options = this.$options
  // resolve template/el and convert to render function
  if (!options.render) {
    let template = options.template // 先找options里面的template
    if (template) {
      if (typeof template === 'string') { // 直接写html
        if (template.charAt(0) === '#') { // 也可以写id
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        template = template.innerHTML
      } else {
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) { // 否则找el
      template = getOuterHTML(el)
    }
    if (template) {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }
      // 编译的重点，这个函数真尼玛绕
      // const { compile, compileToFunctions } = createCompiler(baseOptions)
      // export const createCompiler = createCompilerCreator(function baseCompile (）{
      // 期间有parse, optimize, generate编译的关键步骤执行
      // })
      // export function createCompilerCreator (baseCompile: Function) {
      //   return function createCompiler (baseOptions: CompilerOptions) {
      //     function compile (
      //       template: string,
      //       options?: CompilerOptions
      //     ){
      //      finalOptions.modules = baseOptions.modules
      //      finalOptions.directives = baseOptions.modules
      //      finalOptions其他项合并,extend(baseOptions,options)
      //      期间有baseCompile的执行(template,finalOptions)
      //     }
      //     return {
      //       compile,
      //       compileToFunctions: createCompileToFunctionFn(compile)
      //     }
      //   }
      // }
      // export function createCompileToFunctionFn (compile: Function): Function {
      // 期间有compile的执行
      //   return function compileToFunctions (
      //     template: string,
      //     options?: CompilerOptions,
      //     vm?: Component
      //   ): CompiledFunctionResult {
      //    期间有compile的执行(template,options)
      //   }
      // }
      //compileToFunctions的执行会调用compile函数，compile执行会调baseCompile函数，baseCompile函数执行会执行parse，optimize，generate的函数执行。
      const { render, staticRenderFns } = compileToFunctions(template, {
        outputSourceRange: process.env.NODE_ENV !== 'production',
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this)
      options.render = render
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
function getOuterHTML(el: Element): string {
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

Vue.compile = compileToFunctions

export default Vue
