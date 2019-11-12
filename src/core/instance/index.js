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

initMixin(Vue) // 把_init加进来
stateMixin(Vue) // 添加了$data,$props,$set,$delete,$watch
eventsMixin(Vue) // $on,$off,$once,$emit
lifecycleMixin(Vue) // _update(__patch__),$forceUpdate,$destroy
renderMixin(Vue) // 添加renderHelper(_l,_t,_s,_v等),_render,$nextTick()

export default Vue
