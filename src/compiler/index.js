/* @flow */

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'
import directive from '../platforms/web/runtime/directives/model'

// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.
// 这个baseCompile真了不得
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  // 第一步，完成解析
  const ast = parse(template.trim(), options)
  // 解析完了，ast应该是这样的：
  // {
  //   type: 1,
  //   tag,
  //   attrsList: attrs,
  //   attrsMap: makeAttrsMap(attrs),
  //   rawAttrsMap: { },
  //   parent,
  //   children: [],
  //   if:'',
  //   else-if:'',
  //   key:'',
  //   for:{for: List, iterator1:'item'},
  //   slotName:'', // 如果tag==slot的话，slotName=(slot 标签的name)
  //   slot:'',  // <div slot='xxx'>
  //   slotTarget:'', // <div slot='xxx'>
  //   slotScope:'', // <div scope='xxx' | slot-scope='xxx'>
  //   attrs:[],
  //   directives:[],
  //   events:{event:[],...},
  //   nativeEvents:{event:[],...}
  // }
  if (options.optimize !== false) {
    // 第二步，优化静态树
    optimize(ast, options)
  }
  // 第三步，生成render函数
  const code = generate(ast, options)
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
