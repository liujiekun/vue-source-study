/* @flow */

import { warn } from "./debug";
import { observe, toggleObserving, shouldObserve } from "../observer/index";
import {
  hasOwn,
  isObject,
  toRawType,
  hyphenate,
  capitalize,
  isPlainObject,
} from "shared/util";

type PropOptions = {
  type: Function | Array<Function> | null,
  default: any,
  required: ?boolean,
  validator: ?Function,
};

export function validateProp(
  key: string,
  propOptions: Object,
  propsData: Object,
  vm?: Component
): any {
  const prop = propOptions[key]; //组件里要的值
  const absent = !hasOwn(propsData, key); // 不在它父占位组件的属性里面
  let value = propsData[key]; // 先取父占位组件里面传过来的值
  // boolean casting
  const booleanIndex = getTypeIndex(Boolean, prop.type); //有匹配到是Boolean类型
  if (booleanIndex > -1) {
    // 大于-1算是匹配到了Boolean,类型中有Boolean
    if (absent && !hasOwn(prop, "default")) {
      // 父组件没传，且没有设置default
      value = false; // 且没有设置默认值，就设置为false
    } else if (value === "" || value === hyphenate(key)) {
      // 如果value从父组件传过来的是空字符串，或者key如果是两个单词，AB-->a-b
      // only cast empty string / same name to boolean if
      // boolean has higher priority
      const stringIndex = getTypeIndex(String, prop.type);
      if (stringIndex < 0 || booleanIndex < stringIndex) {
        // 没有匹配到String,或者查到的boolean早于string，value设为true
        value = true;
      }
    }
  }
  // check default value
  if (value === undefined) {
    // 占位父组件没传
    value = getPropDefaultValue(vm, prop, key); // 先设定给default，再查找propsData，找到替换，找不到如果default是函数，就执行结果返回
    // since the default value is a fresh copy,
    // make sure to observe it.
    const prevShouldObserve = shouldObserve;
    toggleObserving(true);
    observe(value); // 将prop做成动态响应的
    toggleObserving(prevShouldObserve);
  }
  // 以上种种都是给value赋值
  if (
    process.env.NODE_ENV !== "production" &&
    // skip validation for weex recycle-list child component props
    !(__WEEX__ && isObject(value) && "@binding" in value)
  ) {
    // 眼看就要返回了，这里又进行了值类型的校验
    // 就是因为要返回了，肯定要先拿到值再进行校验啊
    assertProp(prop, key, value, vm, absent);
    //
  }
  return value;
}

/**
 * Get the default value of a prop.
 */
function getPropDefaultValue(
  vm: ?Component,
  prop: PropOptions,
  key: string
): any {
  // no default, return undefined
  if (!hasOwn(prop, "default")) {
    return undefined;
  }
  const def = prop.default;
  // warn against non-factory defaults for Object & Array
  if (process.env.NODE_ENV !== "production" && isObject(def)) {
    warn(
      'Invalid default value for prop "' +
        key +
        '": ' +
        "Props with type Object/Array must use a factory function " +
        "to return the default value.",
      vm
    );
  }
  // the raw prop value was also undefined from previous render,
  // return previous default value to avoid unnecessary watcher trigger
  if (
    vm &&
    vm.$options.propsData &&
    vm.$options.propsData[key] === undefined &&
    vm._props[key] !== undefined
  ) {
    // 爸爸给传了undefined，相当于没传
    return vm._props[key];
  }
  // call factory function for non-Function types
  // a value is Function if its prototype is function even across different execution context
  return typeof def === "function" && getType(prop.type) !== "Function"
    ? // 只要不是构造函数就行
      def.call(vm)
    : def;
}

/**
 * Assert whether a prop is valid.
 */
function assertProp(
  prop: PropOptions,
  name: string,
  value: any,
  vm: ?Component,
  absent: boolean
) {
  if (prop.required && absent) {
    // required
    warn('Missing required prop: "' + name + '"', vm);
    return;
  }
  if (value == null && !prop.required) {
    // 等于null,也没必须要求
    return;
  }
  let type = prop.type;
  let valid = !type || type === true;
  const expectedTypes = [];
  if (type) {
    if (!Array.isArray(type)) {
      type = [type];
    }
    for (let i = 0; i < type.length && !valid; i++) {
      const assertedType = assertType(value, type[i]); // 通过value和设定的type进行比对
      expectedTypes.push(assertedType.expectedType || ""); // 收集所有设定的type
      valid = assertedType.valid;
    }
  }

  if (!valid) {
    // 如果校验没通过，这个是系统的校验
    warn(
      getInvalidTypeMessage(name, value, expectedTypes), // 拼接提示语
      vm
    );
    return;
  }
  const validator = prop.validator;
  if (validator) {
    if (!validator(value)) {
      // 用户自己写了校验函数
      warn(
        'Invalid prop: custom validator check failed for prop "' + name + '".',
        vm
      );
    }
  }
}

const simpleCheckRE = /^(String|Number|Boolean|Function|Symbol)$/;

function assertType(
  value: any,
  type: Function
): {
  valid: boolean,
  expectedType: string,
} {
  let valid;
  const expectedType = getType(type);
  if (simpleCheckRE.test(expectedType)) {
    const t = typeof value;
    valid = t === expectedType.toLowerCase();
    // for primitive wrapper objects
    if (!valid && t === "object") {
      valid = value instanceof type;
    }
  } else if (expectedType === "Object") {
    valid = isPlainObject(value);
  } else if (expectedType === "Array") {
    valid = Array.isArray(value);
  } else {
    valid = value instanceof type;
  }
  return {
    valid,
    expectedType,
  };
}

/**
 * Use function string name to check built-in types,
 * because a simple equality check will fail when running
 * across different vms / iframes.
 */
function getType(fn) {
  // 利用Boolean，String,Array,Function等的构造函数的toString来获取名字
  const match = fn && fn.toString().match(/^\s*function (\w+)/);
  return match ? match[1] : "";
}

function isSameType(a, b) {
  return getType(a) === getType(b);
}

function getTypeIndex(type, expectedTypes): number {
  // props:{key:{type:type|[],default:''}}
  if (!Array.isArray(expectedTypes)) {
    return isSameType(expectedTypes, type) ? 0 : -1;
  }
  for (let i = 0, len = expectedTypes.length; i < len; i++) {
    if (isSameType(expectedTypes[i], type)) {
      return i;
    }
  }
  return -1;
}

function getInvalidTypeMessage(name, value, expectedTypes) {
  let message =
    `Invalid prop: type check failed for prop "${name}".` +
    ` Expected ${expectedTypes.map(capitalize).join(", ")}`;
  const expectedType = expectedTypes[0];
  const receivedType = toRawType(value);
  const expectedValue = styleValue(value, expectedType);
  const receivedValue = styleValue(value, receivedType);
  // check if we need to specify expected value
  if (
    expectedTypes.length === 1 &&
    isExplicable(expectedType) &&
    !isBoolean(expectedType, receivedType)
  ) {
    message += ` with value ${expectedValue}`;
  }
  message += `, got ${receivedType} `;
  // check if we need to specify received value
  if (isExplicable(receivedType)) {
    //'string', 'number', 'boolean'
    message += `with value ${receivedValue}.`;
  }
  return message;
}

function styleValue(value, type) {
  if (type === "String") {
    return `"${value}"`;
  } else if (type === "Number") {
    return `${Number(value)}`;
  } else {
    return `${value}`;
  }
}

function isExplicable(value) {
  const explicitTypes = ["string", "number", "boolean"];
  return explicitTypes.some((elem) => value.toLowerCase() === elem);
}

function isBoolean(...args) {
  return args.some((elem) => elem.toLowerCase() === "boolean");
}
