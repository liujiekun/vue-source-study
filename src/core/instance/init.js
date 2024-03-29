/* @flow */

import config from "../config";
import { initProxy } from "./proxy";
import { initState } from "./state";
import { initRender } from "./render";
import { initEvents } from "./events";
import { mark, measure } from "../util/perf";
import { initLifecycle, callHook } from "./lifecycle";
import { initProvide, initInjections } from "./inject";
import { extend, mergeOptions, formatComponentName } from "../util/index";

let uid = 0;

export function initMixin(Vue: Class<Component>) {
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this;
    // a uid
    vm._uid = uid++;

    let startTag, endTag;
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== "production" && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`;
      endTag = `vue-perf-end:${vm._uid}`;
      mark(startTag);
    }

    // a flag to avoid this being observed
    vm._isVue = true;
    // merge options
    // 组件options: {
    //   _isComponent: true,
    //   _parentVnode: vnode, // 父占位组件vnode
    //   parent // 父组件所在的实例
    // }
    if (options && options._isComponent) {
      // 是组件，走上面，不是组件走下面
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options);
    } else {
      vm.$options = mergeOptions(
        // 合并Options
        resolveConstructorOptions(vm.constructor), // vm.constructor一般指Vue
        options || {}, // 用户传入
        vm // {uid,_isVue}
      );
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== "production") {
      initProxy(vm); // 做Proxy代理
    } else {
      vm._renderProxy = vm;
    }
    // expose real self
    vm._self = vm;
    initLifecycle(vm); // 初始化parent,$children之类的种种
    initEvents(vm); // 初始化事件_events之类的，使用到createFnInvoker
    initRender(vm); // 初始化渲染需要的东西，如vm._c,vm.$createElement等，初始化它爸爸的$attrs,$listeners，动态绑定，不让孩子随意更改
    callHook(vm, "beforeCreate"); // options钩子事件与$on注册以hook:打头的事件
    initInjections(vm); // resolve injections before data/props,并生动动态响应的东西
    initState(vm); // 将options.data实现双向绑定，并将爸爸的$props动态绑定，不让直接修改
    initProvide(vm); // resolve provide after data/props
    callHook(vm, "created");

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== "production" && config.performance && mark) {
      vm._name = formatComponentName(vm, false);
      mark(endTag);
      measure(`vue ${vm._name} init`, startTag, endTag);
    }

    if (vm.$options.el) { // 数据解析完毕，开始挂载了
      vm.$mount(vm.$options.el); // 此处$mount被改造过
    }
  };
}

export function initInternalComponent(
  vm: Component,
  options: InternalComponentOptions
) {
  // options:{
  //   _isComponent: true,
  //   _parentVnode: vnode,
  //   parent
  // }
  const opts = (vm.$options = Object.create(vm.constructor.options));
  // vm.constructor->parentVnode.componentOptions.Ctor
  // 真是神奇，vm.constructor.options居然是通过resolve父组件的components,在占位组件上就拿到了子组件的真正options，然后真正初始化子组件时，竟然是通过原型继承的方式拿到占位组件的options,被骗了这么久。。。
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode; // 占位vnode
  opts.parent = options.parent; // 父组件所在的实例，好像是一个组件一个实例
  opts._parentVnode = parentVnode;

  const vnodeComponentOptions = parentVnode.componentOptions; // { Ctor, propsData, listeners, tag, children }
  opts.propsData = vnodeComponentOptions.propsData; // 父占位组件的属性值，以及attrs
  opts._parentListeners = vnodeComponentOptions.listeners;
  // _renderChildren将来给子组件渲染slot的时候会用到，initRender时vm.$slots=resolveSlots(options._renderChildren, renderContext)
  opts._renderChildren = vnodeComponentOptions.children;
  opts._componentTag = vnodeComponentOptions.tag;

  if (options.render) {
    opts.render = options.render;
    opts.staticRenderFns = options.staticRenderFns;
  }
}

export function resolveConstructorOptions(Ctor: Class<Component>) {
  // 构造器就是Vue
  let options = Ctor.options; //现在的Vue.options {comonents:{keep-alive,transition,transition-group},filters:{},directives:{v-model,v-show},_base=Vue}
  if (Ctor.super) {
    // 什么样的会有super? 答：父子组件extend之后，子组件就有了
    const superOptions = resolveConstructorOptions(Ctor.super); // 如果他有super会继续递归，superOptions是新读取到的父组件构造函数的的options
    const cachedSuperOptions = Ctor.superOptions; // 这是子组件生成时记住的父组件构造函数的options
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions; // 如果不相等了，子组件更新
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor);
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions);
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions);
      if (options.name) {
        options.components[options.name] = Ctor;
      }
    }
  }
  return options;
}

function resolveModifiedOptions(Ctor: Class<Component>): ?Object {
  let modified;
  const latest = Ctor.options; // superOptions
  const sealed = Ctor.sealedOptions; // mergeOptions{superOptions,Sub.options}
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {};
      modified[key] = latest[key];
    }
  }
  return modified;
}
