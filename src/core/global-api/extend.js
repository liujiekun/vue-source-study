/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { defineComputed, proxy } from '../instance/state'
import { extend, mergeOptions, validateComponentName } from '../util/index'

export function initExtend(Vue: GlobalAPI) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   */
  Vue.cid = 0
  let cid = 1

  /**
   * Class inheritance
   */
  Vue.extend = function (extendOptions: Object): Function {
    extendOptions = extendOptions || {}
    const Super = this // 就是Vue
    const SuperId = Super.cid // 初始值是0，以后++
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
    // 给组件添加_Ctor,初始化为{}
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
      // 如果是同一个组件直接返回，不需要再初始化了
    }

    const name = extendOptions.name || Super.options.name
    // 经常不习惯写name，可能也写了components:{child}->components:{child:child}
    if (process.env.NODE_ENV !== 'production' && name) {
      validateComponentName(name)
    }

    const Sub = function VueComponent(options) {
      this._init(options)
    }
    Sub.prototype = Object.create(Super.prototype) // 经典的继承写法
    Sub.prototype.constructor = Sub
    Sub.cid = cid++
    Sub.options = mergeOptions(
      Super.options,
      extendOptions // 注意此处没有vm，而初始化那块儿有vm
    )
    // 这个合并还真不是当初想象的那样直接合并，而是有策略的合并，
    // 如directives,filters,components都是以父对象为原型创建对象
    // data是儿子的覆盖老子的
    // 像初始化Vue一样初始化组件
    Sub['super'] = Super // 建立组件间父子关系

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    if (Sub.options.props) {
      initProps(Sub) // 初始化子组件props
    }
    if (Sub.options.computed) {
      initComputed(Sub) // 初始化子组件computed
    }

    // allow further extension/mixin/plugin usage
    // 给子组件扩充能力UMEA
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use

    // create asset registers, so extended classes
    // can have their private assets too.
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type] // 子组件使用filter,directive,component
    })
    // enable recursive self-lookup
    if (name) {
      Sub.options.components[name] = Sub
    }

    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    // 保持父子组件间的options引用
    Sub.superOptions = Super.options
    Sub.extendOptions = extendOptions
    Sub.sealedOptions = extend({}, Sub.options)

    // cache constructor
    cachedCtors[SuperId] = Sub
    return Sub
  }
}

function initProps(Comp) {
  const props = Comp.options.props
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key) // 
    // 添加到原型上是几个意思？
  }
}

function initComputed(Comp) {
  const computed = Comp.options.computed
  for (const key in computed) {
    defineComputed(Comp.prototype, key, computed[key])
    // 添加到原型上是几个意思？
  }
}
