const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const html = fs.readFileSync(require('node:path').join(__dirname, '../app/index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1].split('// ---------- events ----------')[0];
function app(saved = null){
  const nodes = new Map();
  const context = vm.createContext({localStorage:{getItem:()=>saved, setItem:()=>{}}, addEventListener:()=>{}, document:{querySelector: key => {if(!nodes.has(key)) nodes.set(key,{style:{}}); return nodes.get(key);}}});
  vm.runInContext(script,context);
  return {run: code => vm.runInContext(code,context), nodes};
}
test('legacy checks retained but require confirmation',()=>{
  const a=app(JSON.stringify({done:{galon:true}}));
  assert.equal(a.run('S.done.galon'),true);
  assert.equal(a.run('stockState(CATS[0].items[0])'),'review');
});
test('quantity changes invalidate confirmation; fixed equipment stays confirmed',()=>{
  const a=app();
  a.run('S.done.galon=true; S.confirmed.galon=CATS[0].items[0].q(ctx())');
  assert.equal(a.run('stockState(CATS[0].items[0])'),'ok');
  a.run('const radio=CATS.flatMap(c=>c.items).find(it=>it.id==="radio"); S.done.radio=true; S.confirmed.radio=radio.q(ctx()); S.days=7');
  assert.equal(a.run('stockState(radio)'), 'ok');
  assert.equal(a.run('stockState(CATS[0].items[0])'),'review');
  a.run('S.confirmed.galon=CATS[0].items[0].q(ctx())');
  assert.equal(a.run('stockState(CATS[0].items[0])'),'ok');
  a.run('S.fam.dewasa=10');
  assert.equal(a.run('stockState(CATS[0].items[0])'),'review');
});
test('expired and today dates excluded, missing date disclosed',()=>{
  const a=app();
  a.run('S.done.galon=true; S.confirmed.galon=CATS[0].items[0].q(ctx()); S.exp.galon="2000-01-01"');
  assert.equal(a.run('stockState(CATS[0].items[0])'),'expired');
  assert.equal(a.run('expStatus(new Date().getFullYear()+"-"+String(new Date().getMonth()+1).padStart(2,"0")+"-"+String(new Date().getDate()).padStart(2,"0"))[0]'),'bad');
  a.run('delete S.exp.galon; progress()');
  assert.match(a.nodes.get('#readiness').innerHTML,/1 belum bertanggal/);
});
test('full checkmarks with expired stock never show 100 percent',()=>{
  const a=app();
  a.run('CATS.forEach(cat=>cat.items.forEach(it=>{S.done[it.id]=true;S.confirmed[it.id]=it.q(ctx())})); PHASES.forEach(p=>p.items.forEach(([id])=>S.done["plan-"+id]=true)); progress()');
  assert.equal(a.nodes.get('#pct').textContent,'100%');
  a.run('S.exp.galon="2000-01-01"; progress()');
  assert.notEqual(a.nodes.get('#pct').textContent,'100%');
});
test('every hazard has three quick actions and official sources',()=>{
  const a=app();
  assert.equal(a.run('HAZ.length===QUICK.length && QUICK.every(q=>q.steps.length===3 && q.sources.every(id=>SOURCES[id]?.url.startsWith("https://")))'),true);
});
