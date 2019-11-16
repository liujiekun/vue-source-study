/* @flow */

import { toNumber, toString, looseEqual, looseIndexOf } from 'shared/util'
import { createTextVNode, createEmptyVNode } from 'core/vdom/vnode'
import { renderList } from './render-list'
import { renderSlot } from './render-slot'
import { resolveFilter } from './resolve-filter'
import { checkKeyCodes } from './check-keycodes'
import { bindObjectProps } from './bind-object-props'
import { renderStatic, markOnce } from './render-static'
import { bindObjectListeners } from './bind-object-listeners'
import { resolveScopedSlots } from './resolve-scoped-slots'
import { bindDynamicKeys, prependModifier } from './bind-dynamic-keys'

export function installRenderHelpers (target: any) {
  target._o = markOnce
  target._n = toNumber
  target._s = toString
  target._l = renderList // 适合v-for的render
  target._t = renderSlot // 处理与slot有关的东西
  target._q = looseEqual // 两个对象是否宽松相等,genCheckboxModel,genRadioModel里面有用到
  target._i = looseIndexOf // 数组中利用宽松相等来确定数组中是否包含值
  target._m = renderStatic // genCheckboxModel,genRadioModel里面有用到
  target._f = resolveFilter // 从$options.filters查出特定id的filters
  target._k = checkKeyCodes // 检测按键的键码值，用于事件处理时配合特定的按键才能响应
  target._b = bindObjectProps // 绑定静态属性
  target._v = createTextVNode // 创建文本节点Vnode
  target._e = createEmptyVNode // 创建注释Vnode
  target._u = resolveScopedSlots // 包括slot与scope或者slot - scope
  target._g = bindObjectListeners // baseDerectives:{bind,on,cloak}里面的on用到了，on又在gendata中!!gen时可能用到，现在可能废弃了
  target._d = bindDynamicKeys // 绑定动态keys
  target._p = prependModifier // 字符串前面加内容
}
