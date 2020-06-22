/* @flow */

import {
  tip,
  hasOwn,
  isDef,
  isUndef,
  hyphenate,
  formatComponentName
} from 'core/util/index'

export function extractPropsFromVNodeData(
  data: VNodeData,
  Ctor: Class<Component>,
  tag?: string
): ?Object {
  // we are only extracting raw values here.
  // validation and default values are handled in the child
  // component itself.
  const propOptions = Ctor.options.props
  if (isUndef(propOptions)) {
    return
  }
  const res = {}
  // 父占位组件里的data
  const { attrs, props } = data
  if (isDef(attrs) || isDef(props)) {
    // 组件定义的props
    for (const key in propOptions) {
      // 接收的属性，转换成kebab-case
      const altKey = hyphenate(key) // 把驼峰liuJieKun转成->liu-jie-kun
      if (process.env.NODE_ENV !== 'production') {
        const keyInLowerCase = key.toLowerCase()
        if (
          key !== keyInLowerCase &&
          attrs && hasOwn(attrs, keyInLowerCase)
        ) {
          tip(
            `Prop "${keyInLowerCase}" is passed to component ` +
            `${formatComponentName(tag || Ctor)}, but the declared prop name is` +
            ` "${key}". ` +
            `Note that HTML attributes are case-insensitive and camelCased ` +
            `props need to use their kebab-case equivalents when using in-DOM ` +
            `templates. You should probably use "${altKey}" instead of "${key}".`
          )
        }
      }
      // 如果是props中只加不删，如果是attrs加上就从attrs中删除
      checkProp(res, props, key, altKey, true) ||
        checkProp(res, attrs, key, altKey, false)
    }
  }
  return res
}

// 按规范dom里写法让这么用:
// <com :liu-jiekun="liujiekun" ,但是我偏偏 <com :liuJieKun="liujiekun"
function checkProp(
  res: Object,
  hash: ?Object,
  key: string,
  altKey: string,
  preserve: boolean
): boolean {//如果被作为props识别了，就从$attrs中删去,$attrs只保留除了props之外的属性
  if (isDef(hash)) {
    if (hasOwn(hash, key)) { // 驼峰
      res[key] = hash[key]
      if (!preserve) {
        delete hash[key]
      }
      return true
    } else if (hasOwn(hash, altKey)) { // kebab-case写法
      res[key] = hash[altKey]
      if (!preserve) {
        delete hash[altKey]
      }
      return true
    }
  }
  return false
}
