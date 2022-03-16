/* @flow */

import { hasOwn } from "shared/util";
import { warn, hasSymbol } from "../util/index";
import { defineReactive, toggleObserving } from "../observer/index";

export function initProvide(vm: Component) {
  const provide = vm.$options.provide;
  if (provide) {
    vm._provided =
      typeof provide === "function" // provide可以是对象，可以是返回对象的函数
        ? provide.call(vm)
        : provide;
  }
}

export function initInjections(vm: Component) {
  const result = resolveInject(vm.$options.inject, vm);
  if (result) {
    toggleObserving(false);
    Object.keys(result).forEach((key) => {
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== "production") {
        defineReactive(vm, key, result[key], () => {
          warn(
            `Avoid mutating an injected value directly since the changes will be ` +
              `overwritten whenever the provided component re-renders. ` +
              `injection being mutated: "${key}"`,
            vm
          );
        });
      } else {
        // 绑定到vm，形成动态响应的数据
        defineReactive(vm, key, result[key]);
      }
    });
    toggleObserving(true);
  }
}

export function resolveInject(inject: any, vm: Component): ?Object {
  if (inject) {
    // inject is :any because flow is not smart enough to figure out cached
    const result = Object.create(null);
    const keys = hasSymbol ? Reflect.ownKeys(inject) : Object.keys(inject);

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      // #6574 in case the inject object is observed...
      if (key === "__ob__") continue;
      // 这里一定有from吗？答：肯定是有的，因为在mergeOptions时，统一处标准化处理过props,injections,directives
      const provideKey = inject[key].from;
      let source = vm;
      while (source) {
        if (source._provided && hasOwn(source._provided, provideKey)) {
          result[key] = source._provided[provideKey]; // 找到赋值break，现在source还有值呢
          break;
        }
        source = source.$parent;
      } // 循环向它的父辈组件查找
      if (!source) {
        // 刚开始肯定有，循环一直到头了，都没找到，根节点的$parent肯定undefined
        if ("default" in inject[key]) {
          // 如果有default，就将default赋值给result[key]
          const provideDefault = inject[key].default;
          result[key] =
            typeof provideDefault === "function"
              ? provideDefault.call(vm)
              : provideDefault;
        } else if (process.env.NODE_ENV !== "production") {
          warn(`Injection "${key}" not found`, vm); // 两者都没有就警告
        }
      }
    }
    return result;
  }
}
