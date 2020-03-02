import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}

initMixin(Vue) // 给Vue.prototype添加_init方法，便于后续所有组件都使用
stateMixin(Vue)
// 给Vue.prototype添加了$data--->返回this._data
// 给Vue.prototype添加了$props-->返回this._props
// 给Vue.prototype添加了$set-->set，跟Vue.set一样
// 给Vue.prototype添加了$delete-->del，跟Vue.del一样
// 给Vue.prototype添加了$watch-->定义函数
eventsMixin(Vue) // $on,$off,$once,$emit
// $on,$off都是加在子组件上的事件，对vm._events:{event:[fn1,fn2,...],...}进行操作
lifecycleMixin(Vue)
// 给Vue.prototype添加_update-->vm.__patch__-->Vue.prototype.__patch__-->patch.js
// 给Vue.prototype添加$forceUpdate
// 给Vue.prototype添加$destroy
renderMixin(Vue) 
// 添加renderHelper(_l,_t,_s,_v等),
// 给Vue.prototype添加_render:
// 1、期间添加解析了vm.$scopedSlots，vm.$slots
// 2、调用了解析模板，生成的render函数，返回Vnode
// 给Vue.prototype添加$nextTick()

export default Vue
