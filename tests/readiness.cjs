const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const html = fs.readFileSync(require('node:path').join(__dirname, '../app/index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1].split('// ---------- events ----------')[0];
function app(saved = null){
  const nodes = new Map();
  const context = vm.createContext({localStorage:{getItem:()=>saved, setItem:()=>{}}, addEventListener:()=>{},
    document:{querySelector: key => {if(!nodes.has(key)) nodes.set(key,{style:{}}); return nodes.get(key);}},
    location:{origin:'https://siagakel-pd.web.app', pathname:'/'},
    TextEncoder, TextDecoder, btoa, atob, Blob, Response, CompressionStream, DecompressionStream});
  vm.runInContext(script,context);
  return {run: code => vm.runInContext(code,context), nodes};
}
const future = days => { const d = new Date(); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); };

test('shortfall follows family size and duration', ()=>{
  const a = app();
  assert.equal(a.run('needOf(findItem("galon"))'), 2);           // 4 people × 3 L × 3 days = 36 L
  a.run('S.have.drum = 50');
  assert.equal(a.run('shortOf(findItem("drum"))'), 70);           // 120 L needed
  a.run('S.days = 7');
  assert.equal(a.run('shortOf(findItem("drum"))'), 230);
  assert.equal(a.run('stockState(findItem("drum"))'), 'short');
  a.run('S.have.drum = 280');
  assert.equal(a.run('stockState(findItem("drum"))'), 'ok');
});

test('several purchase batches; expired batches do not count', ()=>{
  const a = app();
  a.run(`S.batches.galon = [{q:1, e:"${future(90)}"}, {q:1, e:"2000-01-01"}]`);
  assert.equal(a.run('haveOf(findItem("galon"))'), 1);
  assert.equal(a.run('expiredQty(findItem("galon"))'), 1);
  assert.equal(a.run('stockState(findItem("galon"))'), 'expired');
  a.run(`S.batches.galon.push({q:1, e:"${future(30)}"})`);
  assert.equal(a.run('stockState(findItem("galon"))'), 'ok');
  assert.equal(a.run('expStatus(new Date().getFullYear()+"-"+String(new Date().getMonth()+1).padStart(2,"0")+"-"+String(new Date().getDate()).padStart(2,"0"))[0]'), 'bad');
});

test('shopping list splits utama/tambahan and home/bag, skips optional and complete items', ()=>{
  const a = app();
  a.run('S.have.kompor = 1');
  const list = a.run('shoppingList()');
  assert.ok(list.some(s => s.id === 'galon' && s.p === 1 && s.buy === 2 && s.loc === 'rumah'));
  assert.ok(list.some(s => s.id === 'ransel' && s.loc === 'tas'));
  assert.ok(list.some(s => s.id === 'roti' && s.p === 2));
  assert.ok(!list.some(s => s.id === 'kompor'));
  assert.ok(!list.some(s => s.id === 'genset'));
  assert.match(a.run('shoppingText(shoppingList())'), /UTAMA[\s\S]*Galon air minum[\s\S]*TAMBAHAN/);
});

test('special needs add user-led items without medical guessing', ()=>{
  const a = app();
  assert.equal(a.run('allItems().some(it => it.id === "taspersalinan")'), false);
  a.run('S.special.hamil = true; S.special.hewan = 2');
  assert.equal(a.run('findItem("taspersalinan").loc'), 'tas');
  assert.equal(a.run('allItems().some(it => it.id === "taspersalinan")'), true);
  assert.equal(a.run('needOf(findItem("pakan"))'), 6);
});

test('v1 data migrates: single expiry becomes a batch, old ticks ask for quantities', ()=>{
  const a = app(JSON.stringify({done:{galon:true}, confirmed:{galon:'2 galon'}, exp:{galon:'2030-01-01'}}));
  assert.equal(a.run('S.v'), 2);
  assert.equal(a.run('S.batches.galon[0].e'), '2030-01-01');
  assert.equal(a.run('"exp" in S || "confirmed" in S'), false);
  assert.equal(a.run('stockState(findItem("galon"))'), 'review');
});

test('backup validation rejects foreign data and strips unknown fields', ()=>{
  const a = app();
  assert.throws(() => a.run('sanitizeData({hello:1})'), /tidak berisi data/);
  assert.throws(() => a.run('sanitizeData([1,2])'), /bukan data/);
  assert.throws(() => a.run('sanitizeData({fam:{dewasa:-1,anak:0,balita:0,lansia:0}})'), /tidak valid/);
  const {data} = a.run('sanitizeData({fam:{dewasa:2,anak:1,balita:0,lansia:1}, members:[{nama:"Ani", evil:"x"}], have:{galon:3, nope:4}, days:9})');
  assert.deepEqual(Object.keys(data.members[0]).sort(), ['butuh','goldar','hp','nama','obat','tugas']);
  assert.equal(JSON.stringify(data.have), '{"galon":3}');   // vm objects live in another realm
  assert.equal('days' in data, false);
});

test('QR share round-trip keeps plan and contacts only', async ()=>{
  const a = app();
  a.run('S.info.titik1 = "Lapangan desa"; S.members = [{nama:"Budi", hp:"0812"}]; S.have.galon = 5; S.region = "umum"');
  const code = await a.run('encodeShare()');
  assert.match(code, /^z[A-Za-z0-9_-]+$/);
  const data = await a.run(`decodeShare(${JSON.stringify(code)})`);
  assert.equal(data.info.titik1, 'Lapangan desa');
  assert.equal(data.members[0].nama, 'Budi');
  assert.equal(data.region, 'umum');
  assert.equal('have' in data, false);
});

test('calendar export has one recurring event per check', ()=>{
  const a = app();
  const ics = a.run('buildIcs(new Date(2026, 9, 31))');
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, a.run('CHECKS.length'));
  assert.match(ics, /RRULE:FREQ=MONTHLY;INTERVAL=6/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261031/);
  assert.ok(ics.includes('\r\n'));
});

test('region switch changes hazards and texts', ()=>{
  const a = app();
  assert.equal(a.run('hazList().some(h => h.k === "asap")'), false);
  assert.equal(a.run('findItem("selimut").t').includes('Malang'), true);
  a.run('S.region = "umum"; S.risk.gunung = true');
  assert.equal(a.run('hazList().some(h => h.k === "asap")'), true);
  assert.equal(a.run('hazList()[0].k'), 'erupsi');
  assert.equal(a.run('findItem("selimut").t').includes('Malang'), false);
});

test('every hazard has three quick actions and https sources', ()=>{
  const a = app();
  assert.equal(a.run('HAZ.every(h => h.quick.length === 3 && h.src.every(id => SOURCES[id]?.url.startsWith("https://")))'), true);
});

test('progress never reaches 100% while something is short', ()=>{
  const a = app();
  a.run(`allItems().forEach(it => { if(it.exp) S.batches[it.id] = [{q:needOf(it), e:"${future(400)}"}]; else if(it.n) S.have[it.id] = needOf(it); else S.done[it.id] = true; });
    PHASES.forEach(p => p.items.forEach(([id]) => S.done["plan-"+id] = true)); progress()`);
  assert.equal(a.nodes.get('#pct').textContent, '100%');
  a.run('S.batches.galon[0].e = "2000-01-01"; progress()');
  assert.notEqual(a.nodes.get('#pct').textContent, '100%');
});

test('endurance: water vs food, cooking needs stove and gas, expired stock ignored', ()=>{
  const a = app();   // 4 people: 2 adults, 2 children → 12 L water/day, 1.1 kg rice/day, 1 gas can/day, 4 ready units/day
  a.run(`S.batches.galon = [{q:2, e:"${future(200)}"}]; S.batches.beras = [{q:5.5, e:"${future(200)}"}]; S.have.gas = 2`);
  let e = a.run('endurance()');
  assert.equal(e.water, 3.2);            // 38 L / 12
  assert.equal(e.rice, 5);
  assert.equal(e.cook, 0);               // no stove yet
  assert.equal(e.total, 0);
  a.run('S.have.kompor = 1');
  e = a.run('endurance()');
  assert.equal(e.cook, 2);               // gas limits cooking
  assert.equal(e.total, 2);
  a.run(`S.batches.biskuit = [{q:10, e:"${future(200)}"}]; S.batches.kaleng = [{q:6, e:"${future(200)}"}]`);
  assert.equal(a.run('endurance().ready'), 4);
  assert.equal(a.run('endurance().total'), 3.2); // now water is the bottleneck
  a.run('S.batches.galon[0].e = "2000-01-01"');
  assert.equal(a.run('endurance().water'), 0);
});

test('hazard readiness scores only that hazard\'s key items', ()=>{
  const a = app();
  const pct = k => a.run(`hazardReadiness().find(r => r.h.k === "${k}").pct`);
  assert.equal(pct('blackout'), 0);
  a.run('["senter","powerbank","radio","surya","chargermotor","cooler","timba","surge","kompor"].forEach(id => S.have[id] = needOf(findItem(id))); S.have.baterai = 1; S.have.korek = 3');
  assert.ok(pct('blackout') > 50);
  assert.ok(pct('tsunami') < 20);
  assert.equal(a.run('hazardReadiness().some(r => r.h.k === "asap")'), false);   // haze card only in umum mode
  a.run('S.special.hamil = true');
  assert.equal(a.run('allItems().filter(it => inScenario(it, "tsunami")).some(it => it.id === "taspersalinan")'), true);
});

test('custom items join stock, shopping list, scenarios, and survive backup validation', ()=>{
  const a = app();
  a.run('S.custom.push({id:"uabc123", t:"Obat asma cadangan", cat:"obat", n:2, u:"inhaler", p:1, loc:"tas", exp:true, sc:["asap","gempa"]})');
  a.run('S.custom.push({id:"udef456", t:"HT", cat:"alat", n:0, u:"buah", p:2, loc:"rumah", exp:false, sc:[]})');
  assert.equal(a.run('findItem("uabc123").loc'), 'tas');
  assert.equal(a.run('stockState(findItem("udef456"))'), 'missing');   // no quantity → checkbox item
  assert.ok(a.run('shoppingList()').some(s => s.id === 'uabc123' && s.p === 1 && s.buy === 2));
  assert.equal(a.run('inScenario(findItem("uabc123"), "gempa")'), true);
  assert.equal(a.run('inScenario(findItem("uabc123"), "banjir")'), false);
  a.run(`S.batches.uabc123 = [{q:2, e:"${future(100)}"}]`);
  assert.equal(a.run('stockState(findItem("uabc123"))'), 'ok');
  const backup = a.run('JSON.stringify(S)');
  const {data} = a.run(`sanitizeData(${backup})`);
  assert.equal(data.custom.length, 2);
  assert.equal(data.batches.uabc123[0].q, 2);    // stock of imported custom items is kept
  const bad = a.run('sanitizeData({custom:[{id:"../x", t:"a"}, {id:"u1", t:""}, {id:"u2", t:"Senter kepala", cat:"???", sc:["nope","banjir"]}]}).data.custom');
  assert.equal(bad.length, 1);
  assert.equal(bad[0].cat, 'alat');
  assert.equal(JSON.stringify(bad[0].sc), '["banjir"]');
});

test('first aid guide: every topic has steps and https sources; key numbers present', ()=>{
  const a = app();
  assert.equal(a.run('FIRSTAID.every(f => f.steps.length >= 3 && f.src.length && f.src.every(id => SOURCES[id]?.url.startsWith("https://")))'), true);
  const rjp = a.run('JSON.stringify(FIRSTAID.find(f => f.k === "rjp"))');
  assert.match(rjp, /100–120/);
  assert.match(rjp, /5–6 cm/);
  assert.match(a.run('JSON.stringify(FIRSTAID.find(f => f.k === "bakar"))'), /minimal 20 menit/);
  assert.doesNotMatch(a.run('JSON.stringify(FIRSTAID)'), /sendok/);   // no home-made ORS recipe
});
