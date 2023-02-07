/* @flow */

import { ASSET_TYPES } from "shared/constants";
import { defineComputed, proxy } from "../instance/state";
import { extend, mergeOptions, validateComponentName } from "../util/index";

export function initExtend(Vue: GlobalAPI) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   */
  Vue.cid = 0;
  let cid = 1;

  /**
   * Class inheritance
   */
  Vue.extend = function (extendOptions: Object): Function {
    // extendOptions子组件options
    extendOptions = extendOptions || {};
    const Super = this; // 就是Vue
    const SuperId = Super.cid; // 初始值是0被Vue占了，以后的组件从1开始++
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {});
    // 给组件添加_Ctor,初始化为{}
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId];
      // 如果是同一个组件直接返回，不需要再初始化了
    }

    const name = extendOptions.name || Super.options.name;
    if (process.env.NODE_ENV !== "production" && name) {
      validateComponentName(name);
    }

    const Sub = function VueComponent(options) {
      // Vue只是第一次的constructor，剩下的子组件的constructor都是这里
      this._init(options);
    };
    Sub.prototype = Object.create(Super.prototype); // 经典的继承写法
    Sub.prototype.constructor = Sub;
    Sub.cid = cid++;
    Sub.options = mergeOptions(
      Super.options, // Vue.options一般就{filters:{},components:{transitions,transition-group,keep-alive},directives:{v-model,v-show},_base:Vue}
      extendOptions // 注意此处没有vm，而初始化那块儿有vm
    );
    // 这个合并还真不是当初想象的那样直接合并，而是有策略的合并，
    // 生命周期钩子函数都是[].concat，但要注意去重处理
    // watch是[].concat，如果父组件和子组件都watch同一个数据，两个water都同时执行进行响应
    // 如directives,filters,components都是以父对象为原型创建对象，然后将儿子的这些挂载到新创建的对象下面。
    // el,propsData,props,method,inject,computed儿子覆盖老子的
    // data,provide是深层次递归，儿子的覆盖老子的
    // 像初始化Vue一样初始化组件
    Sub["super"] = Super; // 建立组件构造函数间父子关系

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    if (Sub.options.props) {
      initProps(Sub); // 初始化子组件props
    }
    if (Sub.options.computed) {
      initComputed(Sub); // 初始化子组件computed
    }

    // allow further extension/mixin/plugin usage
    // 给子组件扩充能力UMEA
    Sub.extend = Super.extend;
    Sub.mixin = Super.mixin;
    Sub.use = Super.use;

    // create asset registers, so extended classes
    // can have their private assets too.
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type]; // 子组件使用filter,directive,component
    });
    // enable recursive self-lookup
    if (name) {
      Sub.options.components[name] = Sub;
    }

    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    // 保持父子组件间的options引用
    Sub.superOptions = Super.options; // 保存父组件构造函数的options
    Sub.extendOptions = extendOptions; // 保存自己的配置项options
    Sub.sealedOptions = extend({}, Sub.options); // Sub.options保存mergeOptions(Vue.options,extendOptions)，等于Sub.options

    // cache constructor
    cachedCtors[SuperId] = Sub;
    return Sub;
  };
}

function initProps(Comp) {
  const props = Comp.options.props;
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key); //
    // 添加到原型上是几个意思？
    // 20200302答：估计是为了组件复用吧，让每个组件都能拿到
  }
}

function initComputed(Comp) {
  const computed = Comp.options.computed;
  for (const key in computed) {
    defineComputed(Comp.prototype, key, computed[key]);
    // 添加到原型上是几个意思？
    // 20200302答：估计是为了组件复用吧，让每个组件都能拿到
  }
}
