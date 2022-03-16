/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  noop,
} from "../util/index";

import { traverse } from "./traverse";
import { queueWatcher } from "./scheduler";
import Dep, { pushTarget, popTarget } from "./dep";

import type { SimpleSet } from "../util/index";

let uid = 0;

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;

  constructor(
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean // 是否是渲染watcher
    // 渲染时候第一次watcher传入的参数
    // vm, updateComponent, noop, {
    //   before () {
    //     if (vm._isMounted && !vm._isDestroyed) {
    //       callHook(vm, 'beforeUpdate')
    //     }
    //   }
    // }, true
  ) {
    this.vm = vm;
    if (isRenderWatcher) {
      vm._watcher = this; // 将渲染watcher添加到vm自身实例上，渲染watcher的标识
    }
    vm._watchers.push(this); // 这个是vm所有的watcher，包括
    // options
    if (options) {
      this.deep = !!options.deep;
      this.user = !!options.user; // $watch的标识吗？把吗去掉
      this.lazy = !!options.lazy; // computedWatcher的标识
      this.sync = !!options.sync;
      this.before = options.before; // 触发beforeUpdate钩子
    } else {
      this.deep = this.user = this.lazy = this.sync = false;
    }
    this.cb = cb;
    this.id = ++uid; // uid for batching
    this.active = true;
    this.dirty = this.lazy; // for lazy watchers
    this.deps = [];
    this.newDeps = [];
    this.depIds = new Set();
    this.newDepIds = new Set();
    this.expression =
      process.env.NODE_ENV !== "production" ? expOrFn.toString() : "";
    // parse expression for getter
    if (typeof expOrFn === "function") {
      this.getter = expOrFn;
    } else {
      this.getter = parsePath(expOrFn); // 给watch这种准备的expOrFn:varibale，vm.varibale
      // const segments = path.split('.') // 将表达式用.分割，然后返回一个函数
      // return function (obj) {
      //   for (let i = 0; i < segments.length; i++) {
      //     if (!obj) return
      //     obj = obj[segments[i]]
      //   }
      //   return obj
      // }
      if (!this.getter) {
        this.getter = noop;
        process.env.NODE_ENV !== "production" &&
          warn(
            `Failed watching path: "${expOrFn}" ` +
              "Watcher only accepts simple dot-delimited paths. " +
              "For full control, use a function instead.",
            vm
          );
      }
    }
    this.value = this.lazy // computedWatcher的lazy就是true，调用时使用了watcher.evaluate
      ? undefined // computedwatcher第一次建立，并未获取值
      : this.get(); // 如果没有lazy，执行get来获取值
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  get() {
    pushTarget(this);
    let value;
    const vm = this.vm;
    try {
      value = this.getter.call(vm, vm); // 第二个vm也是给watch这种准备的，就是getter中返回函数的obj,#92行
      // 对于$watch,getter返回的函数执行，相当于在vm里逐级查找数据
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`);
      } else {
        throw e;
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value);
      }
      popTarget();
      this.cleanupDeps();
    }
    return value;
  }

  /**
   * Add a dependency to this directive.
   */
  addDep(dep: Dep) {
    const id = dep.id;
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id);
      this.newDeps.push(dep);
      if (!this.depIds.has(id)) {
        dep.addSub(this);
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  cleanupDeps() {
    let i = this.deps.length;
    while (i--) {
      const dep = this.deps[i];
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this);
      }
    }
    let tmp = this.depIds;
    this.depIds = this.newDepIds;
    this.newDepIds = tmp;
    this.newDepIds.clear();
    tmp = this.deps;
    this.deps = this.newDeps;
    this.newDeps = tmp;
    this.newDeps.length = 0;
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  update() {
    /* istanbul ignore else */
    if (this.lazy) {
      // computedWatcher标识
      this.dirty = true; // 有变量变化，触发water.update，下一次computed变量的watcher.dirty就变成了true,下一次就会重新evaluate,重新计算值
    } else if (this.sync) {
      // 给特殊的watch用的？可以直接走到$nextTick之前了
      this.run();
    } else {
      queueWatcher(this);
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run() {
    if (this.active) {
      const value = this.get();
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value;
        this.value = value;
        if (this.user) {
          // $watch的通道
          try {
            this.cb.call(this.vm, value, oldValue);
          } catch (e) {
            handleError(
              e,
              this.vm,
              `callback for watcher "${this.expression}"`
            );
          }
        } else {
          this.cb.call(this.vm, value, oldValue);
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate() {
    this.value = this.get(); // 第一次获取computed值时执行
    // 为什么要拉成false？
    // 2020/02/25日答：因为第一次需要收集依赖，以后就不需要了，所谓的缓存机制，建立起依赖之后，以后就可以通过依赖项的变化，触发computed Watcher去更新就好了
    // 20200229日，发现如果有依赖项发生变化，通知computedWatcher进行更新了，它会把dirty变成true,然后下一次取它的值的时候，重新建立依赖。
    // 20200406，不仅是重新建立依赖，关键是曾经的依赖项发生过变过，重新取值才是关键。
    this.dirty = false;
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend() {
    let i = this.deps.length;
    while (i--) {
      this.deps[i].depend();
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown() {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this);
      }
      let i = this.deps.length;
      while (i--) {
        this.deps[i].removeSub(this);
      }
      this.active = false;
    }
  }
}
