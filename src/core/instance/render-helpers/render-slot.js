/* @flow */

import { extend, warn, isObject } from 'core/util/index'

/**
 * Runtime helper for rendering <slot>
 */
export function renderSlot (
  name: string,
  fallback: ?Array<VNode>,
  props: ?Object,
  bindObject: ?Object
): ?Array<VNode> {
  const scopedSlotFn = this.$scopedSlots[name] // scope="scope" slot-scope="scope"
  let nodes
  if (scopedSlotFn) { // scoped slot
    props = props || {}
    if (bindObject) {
      if (process.env.NODE_ENV !== 'production' && !isObject(bindObject)) {
        warn(
          'slot v-bind without argument expects an Object',
          this
        )
      }
      props = extend(extend({}, bindObject), props)
    }
    nodes = scopedSlotFn(props) || fallback
  } else { // slot = "XXX"
    nodes = this.$slots[name] || fallback // <p slot="xxx"></p>
  }

  const target = props && props.slot // 如果slot-scope 的东西，有属性slot然后就
  if (target) {
    return this.$createElement('template', { slot: target }, nodes)
  } else {
    return nodes // 否则return nodes
  }
}
