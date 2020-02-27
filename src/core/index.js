import Vue from './instance/index'
import { initGlobalAPI } from './global-api/index'
import { isServerRendering } from 'core/util/env'
import { FunctionalRenderContext } from 'core/vdom/create-functional-component'

initGlobalAPI(Vue)
// 给Vue添加util:{warn,extend,mergeOptions,defineReactive}
// 给Vue添加set,del,nextTick
// 给Vue添加observable:value=>{observe(value);return value;}
// 给Vue添加options,并给options添加components,directives,filters,默认都是空对象
// 设置Vue.options._base=Vue
// 给Vue.options.components扩展内置组件keep-alive
// UMEA(use,mixin,extend,initAssetRegister)

Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering
})

Object.defineProperty(Vue.prototype, '$ssrContext', {
  get () {
    /* istanbul ignore next */
    return this.$vnode && this.$vnode.ssrContext
  }
})

// expose FunctionalRenderContext for ssr runtime helper installation
Object.defineProperty(Vue, 'FunctionalRenderContext', {
  value: FunctionalRenderContext
})

Vue.version = '__VERSION__'

export default Vue
