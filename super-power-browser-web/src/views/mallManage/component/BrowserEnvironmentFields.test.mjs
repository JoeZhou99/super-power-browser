import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {parse,compileScript} from '@vue/compiler-sfc';
import ts from 'typescript';
import {createRenderer,defineComponent,h,nextTick,reactive} from 'vue';

// Mount the actual SFC with Vue's renderer. Only Element Plus presentation controls are passthroughs.
const require=createRequire(import.meta.url);
const source=await readFile(new URL('./BrowserEnvironmentFields.vue',import.meta.url),'utf8');
const {descriptor}=parse(source);
const script=compileScript(descriptor,{id:'browser-environment-fields-test',inlineTemplate:true});
const code=ts.transpileModule(script.content,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
  .replace(/from ["']vue["']/g,`from ${JSON.stringify(pathToFileURL(require.resolve('vue')).href)}`);
const Component=(await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)).default;
const renderer=createRenderer({
  createElement:type=>({type,props:{},children:[]}),createText:text=>({type:'#text',text}),createComment:text=>({type:'#comment',text}),
  setText:(node,text)=>{node.text=text;},setElementText:(node,text)=>{node.text=text;node.children=[];},
  parentNode:node=>node.parent,nextSibling:node=>node.parent?.children[node.parent.children.indexOf(node)+1],
  patchProp:(node,key,_previous,value)=>{node.props[key]=value;},
  insert(node,parent,anchor){if(node.parent){const index=node.parent.children.indexOf(node);if(index>=0)node.parent.children.splice(index,1);}node.parent=parent;const index=anchor?parent.children.indexOf(anchor):-1;parent.children.splice(index<0?parent.children.length:index,0,node);},
  remove(node){const index=node.parent?.children.indexOf(node);if(index>=0)node.parent.children.splice(index,1);node.parent=undefined;}
});
function config(defaults={language:'en-GB',timezone:'Europe/London',resolution:'1920x1080'}){
  return {revision:1,defaults,languages:[{value:'en-GB',label:'English'},{value:'zh-CN',label:'简体中文'},{value:'auto',label:'跟随代理 IP'}],
    timezones:[{value:'Europe/London',label:'伦敦'},{value:'Asia/Shanghai',label:'上海'},{value:'__local__',label:'本地时区'},{value:'auto',label:'跟随代理 IP'}],
    resolutions:[{value:'1920x1080',label:'1920 × 1080'}]};
}
function mount(fingerprint,catalog=config()){
  const props=reactive({form:{id:'synthetic-shop',fingerprint:{...fingerprint}},config:catalog,configLoading:false,kernels:[],kernelError:''});
  const root={type:'root',children:[]};
  const app=renderer.createApp({render:()=>h(Component,props)});
  for(const tag of new Set(source.match(/el-[a-z-]+/g)))app.component(tag,defineComponent({inheritAttrs:false,setup:(_props,{attrs,slots})=>()=>h(tag,attrs,slots.default?.())}));
  app.mount(root);
  function find(predicate,node=root){if(predicate(node))return node;for(const child of node.children||[]){const result=find(predicate,child);if(result)return result;}}
  const control=label=>{const node=find(node=>node.props?.['aria-label']===label);assert.ok(node,`Missing control: ${label}`);return node;};
  return {props,find,control,close:()=>app.unmount(),async change(label,value){control(label).props['onUpdate:modelValue'](value);await nextTick();},async advanced(){const button=find(node=>node.type==='el-button'&&node.children.some(child=>child.text==='展开'));assert.ok(button);button.props.onClick();await nextTick();}};
}

test('switching to IP and back preserves saved custom values, including options no longer in the catalog',async()=>{
  const original={language:'de-DE',languageMode:'custom',timezone:'Europe/Berlin',resolution:'1920x1080',canvas:'privacy'};
  const ui=mount(original);
  try{
    assert.deepEqual(ui.props.form.fingerprint,original);assert.equal(ui.control('浏览器语言').props.modelValue,'de-DE');
    await ui.change('语言设置方式','ip');assert.equal(ui.props.form.fingerprint.language,'auto');assert.equal(ui.props.form.fingerprint.languageMode,'ip');
    await ui.change('语言设置方式','custom');assert.equal(ui.props.form.fingerprint.language,'de-DE');assert.equal(ui.props.form.fingerprint.languageMode,'custom');
    await ui.advanced();await ui.change('时区设置方式','ip');assert.equal(ui.props.form.fingerprint.timezone,'auto');
    await ui.change('时区设置方式','custom');assert.equal(ui.props.form.fingerprint.timezone,'Europe/Berlin');assert.equal(ui.props.form.fingerprint.canvas,'privacy');
  }finally{ui.close();}
});
test('IP defaults show the right mode and switching to custom uses the current operational defaults',async()=>{
  const original={language:'auto',languageMode:'custom',timezone:'auto',resolution:'1920x1080'};const ui=mount(original);
  try{
    assert.equal(ui.control('语言设置方式').props.modelValue,'ip');assert.deepEqual(ui.props.form.fingerprint,original);
    await ui.change('语言设置方式','custom');assert.equal(ui.props.form.fingerprint.language,'en-GB');
    await ui.advanced();assert.equal(ui.control('时区设置方式').props.modelValue,'ip');
    await ui.change('时区设置方式','custom');assert.equal(ui.props.form.fingerprint.timezone,'Europe/London');
  }finally{ui.close();}
});
test('reusing the editor for another shop never restores the previous shop custom values',async()=>{
  const ui=mount({language:'de-DE',languageMode:'custom',timezone:'Europe/Berlin'});
  try{
    await ui.change('语言设置方式','ip');await ui.advanced();await ui.change('时区设置方式','ip');
    ui.props.form.fingerprint={language:'auto',languageMode:'ip',timezone:'auto'};await nextTick();
    await ui.change('语言设置方式','custom');await ui.change('时区设置方式','custom');
    assert.equal(ui.props.form.fingerprint.language,'en-GB');assert.equal(ui.props.form.fingerprint.timezone,'Europe/London');
  }finally{ui.close();}
});
test('local timezone remains selectable and follows the same custom/IP round trip',async()=>{
  const ui=mount({language:'en-GB',languageMode:'custom',timezone:'__local__'});
  try{
    await ui.advanced();assert.equal(ui.control('时区').props.modelValue,'__local__');
    assert.ok(ui.find(node=>node.type==='el-option'&&node.props.value==='__local__'&&node.props.label==='本地时区'));
    await ui.change('时区设置方式','ip');await ui.change('时区设置方式','custom');assert.equal(ui.props.form.fingerprint.timezone,'__local__');
  }finally{ui.close();}
});
test('disabled operational IP options preserve existing mode while preventing new selections',async()=>{
  const catalog=config();catalog.languages=catalog.languages.filter(option=>option.value!=='auto');catalog.timezones=catalog.timezones.filter(option=>option.value!=='auto');
  const ui=mount({language:'auto',languageMode:'ip',timezone:'auto'},catalog);
  try{
    assert.equal(ui.control('语言设置方式').props.modelValue,'ip');
    assert.equal(ui.control('语言设置方式').children.find(node=>node.type==='el-radio'&&node.props.value==='ip').props.disabled,true);
    await ui.advanced();assert.equal(ui.control('时区设置方式').children.find(node=>node.type==='el-radio'&&node.props.value==='ip').props.disabled,true);
    assert.equal(ui.props.form.fingerprint.language,'auto');assert.equal(ui.props.form.fingerprint.timezone,'auto');
  }finally{ui.close();}
});
