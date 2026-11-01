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

test('shopping cost: user prices, cash counted automatically, missing prices reported', ()=>{
  const a = app();
  a.run('S.price.galon = 20000; S.price.fotokopi = 15000');
  const list = a.run('shoppingList()');
  const cost = id => a.run(`costOf(shoppingList().find(s => s.id === "${id}"))`);
  assert.equal(cost('galon'), 40000);        // 2 galon × 20.000
  assert.equal(cost('fotokopi'), 15000);     // checkbox item: price per package
  assert.equal(cost('tunai'), 600000);       // 600 ribu rupiah needed for 4 people
  assert.equal(cost('roti'), null);
  const sum = a.run('costSummary(shoppingList())');
  assert.ok(sum[1].sum >= 655000 && sum[1].missing > 0);
  assert.match(a.run('shoppingText(shoppingList())'), /Perkiraan total: Rp/);
  assert.ok(list.length > 0);
});

test('power & fuel calculators use stock and editable assumptions', ()=>{
  const a = app();
  a.run('S.have.gas = 4; S.have.powerbank = 2; S.batches = {}');
  let r = a.run('calcPower()');
  assert.equal(r.gasDays, 4);                 // 4 cans × 1.5 h / 1.5 h per day
  assert.equal(r.charges, 2.9);               // 2 × 10000 × 0.65 / 4500
  assert.equal(r.phones, 2);                  // defaults to adults
  assert.equal(r.range, 160);
  assert.equal(r.safeRange, 128);
  a.run('S.calc.reserve = 0; S.calc.kmpl = 10; S.calc.phones = "x"');
  r = a.run('calcPower()');
  assert.equal(r.safeRange, 40);              // zero reserve allowed
  assert.equal(r.phones, 2);                  // invalid value falls back
  assert.equal(a.run('fuelFor(25)'), 2.5);
});

test('coordinates, routes and conditions helpers', ()=>{
  const a = app();
  assert.equal(JSON.stringify(a.run('parseCoord("-8.123456, 112.6")')), '{"lat":-8.12346,"lon":112.6}');
  assert.equal(JSON.stringify(a.run('parseCoord("-8,2; 112,6")')), '{"lat":-8.2,"lon":112.6}');
  assert.equal(a.run('parseCoord("abc")'), null);
  assert.equal(a.run('parseCoord("95, 10")'), null);
  assert.equal(Math.round(a.run('distKm({lat:-8.2, lon:112.6}, {lat:-7.98, lon:112.63})')), 25);
  assert.equal(a.run('aqiCat(160)[1]'), 'Tidak sehat');
  assert.equal(a.run('wmoText(63)'), 'Hujan sedang');
  const alerts = a.run(`wxAlerts({place:{lat:-8.2, lon:112.6}, aq:{current:{us_aqi:150}},
    wx:{daily:{time:["2026-11-01"], precipitation_probability_max:[90], precipitation_sum:[35]}},
    eq:{Coordinates:"-8.5,112.4", Magnitude:"5.6"}}).map(x => x[2]).join()`);
  assert.equal(alerts, 'erupsi,banjir,gempa');
  assert.equal(a.run('wxAlerts({place:{lat:-8.2, lon:112.6}, eq:{Coordinates:"4.79,96.20", Magnitude:"6.1"}}).length'), 0);   // far away
});

test('routes, coordinates, prices and calculator settings survive backup validation; QR carries routes', async ()=>{
  const a = app();
  const {data} = a.run(`sanitizeData({geo:{titik1:{lat:-8.2, lon:112.6}, titik2:{lat:"x", lon:1}, hack:{lat:1, lon:1}},
    routes:[{nama:"Ke bukit", tujuan:"Bukit Kaliwaru", km:3.5, via:"jalan desa"}, {nama:"x", km:-4}],
    price:{galon:20000, nope:5, beras:-1}, calc:{tank:5, bogus:1}, place:{name:"Rumah", lat:-8.2, lon:112.6}})`);
  assert.equal(JSON.stringify(Object.keys(data.geo)), '["titik1"]');
  assert.equal(data.routes.length, 2);
  assert.equal(data.routes[1].km, 0);
  assert.equal(JSON.stringify(data.price), '{"galon":20000}');
  assert.equal(JSON.stringify(data.calc), '{"tank":5}');
  assert.throws(() => a.run('sanitizeData({routes:new Array(11).fill({})})'), /rute/);
  a.run('S.geo = {titik1:{lat:-8.2, lon:112.6}}; S.routes = [{nama:"Ke bukit", tujuan:"Bukit", km:3, via:""}]');
  const shared = await a.run(`encodeShare().then(decodeShare)`);
  assert.equal(shared.routes[0].tujuan, 'Bukit');
  assert.equal(shared.geo.titik1.lon, 112.6);
});

test('Morse: encoding and on/off timeline follow standard timing', ()=>{
  const a = app();
  assert.equal(a.run('toMorse("sos")'), '... --- ...');
  assert.equal(a.run('toMorse("ok 1")'), '--- -.- / .----');
  const tl = a.run('JSON.stringify(morseTimeline("SOS"))');
  // S = 3 dots (1 on, 1 gap), letter gap 3, O = 3 dashes (3 on)
  assert.ok(tl.startsWith('[[true,1],[false,1],[true,1],[false,1],[true,1],[false,3],[true,3]'));
  assert.equal(a.run('morseTimeline("SOS").reduce((s, [, u]) => s + u, 0)'), 27);
  assert.equal(a.run('morseTimeline("!!").length'), 0);
});

test('emergency SMS: who, where with GPS and map link, what, condition, needs, time', ()=>{
  const a = app();
  const msg = a.run('sosMessage({who:"Budi (4 orang)", where:"Jl. Raya 12", geo:{lat:-8.39012, lon:112.7123}, what:"banjir", cond:"1 lansia luka", need:"evakuasi"}, new Date(2026, 10, 1, 14, 5))');
  assert.equal(msg, 'DARURAT. Saya: Budi (4 orang). Lokasi: Jl. Raya 12 · -8.39012,112.7123. Peta: maps.google.com/?q=-8.39012,112.7123 Kejadian: banjir. Kondisi: 1 lansia luka. Butuh: evakuasi. Jam 14.05');
  assert.equal(a.run('sosMessage({}, new Date(2026, 0, 1, 9, 0))'), 'DARURAT. Jam 09.00');
  assert.equal(a.run('phoneIn("Tante Rina (Surabaya) 0812-3456-7890")'), '081234567890');
  assert.equal(a.run('phoneIn("+62 812 3456 7890 kantor")'), '+6281234567890');
  assert.equal(a.run('phoneIn("belum ada")'), '');
});

test('library and radio guides have sources; PMR facts stated; offline search finds guides across tabs', ()=>{
  const a = app();
  assert.equal(a.run('[...LIB, ...COMMS].every(x => x.steps.length >= 3 && (x.src || []).every(id => SOURCES[id]?.url.startsWith("https://")))'), true);
  assert.equal(a.run('[...LIB, ...COMMS].filter(x => !x.src).map(x => x.k).join()'), 'etika');   // only general radio etiquette is unsourced, and says so
  const pmr = a.run('JSON.stringify(COMMS.find(x => x.k === "pmr"))');
  assert.match(pmr, /409,74375–409,99375 MHz/);
  assert.match(pmr, /500 mW/);
  assert.match(pmr, /wajib izin/);
  assert.doesNotMatch(a.run('JSON.stringify(LIB)'), /\d+\s*tetes/);   // no bleach drop dosing
  const types = q => a.run(`searchGuides(${JSON.stringify(q)}).map(e => e.type + ":" + e.k).join()`);
  assert.match(types('radio'), /lib:fm|lib:pmr/);
  assert.match(types('luka bakar'), /^fa:bakar/);
  assert.match(types('kaporit'), /lib:air/);
  assert.match(types('tsunami'), /haz:tsunami/);
  assert.equal(types('zzzz'), '');
  assert.equal(a.run('PHONETIC.length'), 26);
});

test('BMKG feeds: parse, merge, tsunami text, and alert relevance', ()=>{
  const a = app();
  const now = Date.parse('2026-11-01T07:00:00Z');
  const feed = JSON.stringify({Infogempa:{gempa:[
    {DateTime:'2026-11-01T06:50:00+00:00', Coordinates:'-8.60,112.40', Magnitude:'5.4', Kedalaman:'10 km', Wilayah:'Selatan Malang', Potensi:'Tidak berpotensi tsunami', Tanggal:'01 Nov 2026', Jam:'13:50:00 WIB'},
    {DateTime:'2026-11-01T06:40:00+00:00', Coordinates:'-10.5,110.0', Magnitude:'7.1', Kedalaman:'20 km', Wilayah:'Samudra Hindia', Potensi:'Berpotensi TSUNAMI'},
    {DateTime:'2026-11-01T03:00:00+00:00', Coordinates:'-8.30,112.60', Magnitude:'4.0', Wilayah:'lama'},
    {DateTime:'2026-11-01T06:55:00+00:00', Coordinates:'4.79,96.20', Magnitude:'6.2', Wilayah:'Aceh'}]}});
  const felt = JSON.stringify({Infogempa:{gempa:[{DateTime:'2026-11-01T06:50:00+00:00', Coordinates:'-8.60,112.40', Magnitude:'5.4', Dirasakan:'III Malang'}]}});
  a.run(`globalThis.Q = mergeQuakes([parseQuakes(${feed}), parseQuakes(${felt})])`);
  assert.equal(a.run('Q.length'), 4);
  assert.equal(a.run('Q.find(q => q.mag === 5.4).dirasakan'), 'III Malang');
  assert.equal(a.run('Q.find(q => q.mag === 5.4).potensi'), 'Tidak berpotensi tsunami');   // merged, not overwritten
  assert.equal(a.run('tsunamiRisk({potensi:"Tidak berpotensi tsunami"})'), false);
  assert.equal(a.run('tsunamiRisk({potensi:"Berpotensi TSUNAMI"})'), true);
  const rel = ref => a.run(`Q.filter(q => eqRelevant(q, ${ref}, 300, ${now})).map(q => q.mag).join()`);
  assert.equal(rel('{lat:-8.2, lon:112.6}'), '5.4,7.1');   // nearby recent + tsunami potential; old and far-away skipped
  assert.equal(rel('null'), '6.2,7.1');                     // unknown location: tsunami or M ≥ 6 only (newest first)
});

test('family location: Firestore field mapping, group codes, check-in message', ()=>{
  const a = app();
  const doc = a.run(`JSON.stringify(toFs({name:"Ayah", lat:-8.2, lon:112.6, acc:12, status:"aman", t:"2026-11-01T07:00:00Z", exp:"2026-11-02T07:00:00Z"}))`);
  assert.equal(doc, '{"fields":{"name":{"stringValue":"Ayah"},"t":{"timestampValue":"2026-11-01T07:00:00Z"},"exp":{"timestampValue":"2026-11-02T07:00:00Z"},"lat":{"doubleValue":-8.2},"lon":{"doubleValue":112.6},"acc":{"doubleValue":12},"status":{"stringValue":"aman"}}}');
  const back = a.run(`fromFs({name:"projects/x/databases/(default)/documents/fam/G/m/dev123", fields:${doc}.fields})`);
  assert.equal(back.id, 'dev123'); assert.equal(back.lat, -8.2); assert.equal(back.status, 'aman');
  assert.equal(a.run('fromFs({name:"a/b", fields:{name:{stringValue:"X"}, lat:{integerValue:"-8"}, lon:{integerValue:"112"}}}).lat'), -8);
  assert.equal(a.run('JSON.stringify(Object.keys(toFs({name:"B", t:"x", exp:"y", lat:999, lon:1}).fields))'), '["name","t","exp"]');   // invalid coords dropped
  assert.equal(a.run('validGid("abc")'), false);
  assert.equal(a.run('validGid("Abcdefghij_klmnop-1234")'), true);
  assert.equal(a.run('validGid("bad/../code_12345678901")'), false);
  assert.equal(a.run('checkinMessage("aman", "Budi", {lat:-8.2, lon:112.6}, new Date(2026, 10, 1, 9, 5))'), 'SAYA AMAN. Budi. Lokasi: -8.2,112.6 maps.google.com/?q=-8.2,112.6 Jam 09.05');
  assert.equal(a.run('checkinMessage("bantuan", "", null, new Date(2026, 10, 1, 21, 0))'), 'BUTUH BANTUAN. Jam 21.00');
  const {data} = a.run('sanitizeData({famGroup:"Abcdefghij_klmnop-1234", mode:"offline", eqRadius:500, eqWatch:false, live:{mid:"x", on:true}, videos:[{id:"https://youtu.be/ER92JACcoec", t:"Tas"}, {id:"bad"}]})');
  assert.equal(data.famGroup, 'Abcdefghij_klmnop-1234');
  assert.equal(data.mode, 'offline'); assert.equal(data.eqRadius, 500); assert.equal(data.eqWatch, false);
  assert.equal('live' in data, false);   // device-specific sharing consent is never imported
  assert.equal(JSON.stringify(data.videos), '[{"id":"ER92JACcoec","t":"Tas"}]');
  assert.equal(a.run('SHARE_FIELDS.includes("famGroup") && !SHARE_FIELDS.includes("live")'), true);
});

test('videos, workouts and quiz data are well-formed', ()=>{
  const a = app();
  assert.equal(a.run('VIDEOS.every(v => /^[A-Za-z0-9_-]{11}$/.test(v.id) && VIDEO_GROUPS.some(([g]) => g === v.g))'), true);
  for (const [u, id] of [['https://www.youtube.com/watch?v=ER92JACcoec&t=5', 'ER92JACcoec'], ['https://youtu.be/bs36NO8o-sI', 'bs36NO8o-sI'], ['https://www.youtube.com/shorts/dbfvYnpoDFM', 'dbfvYnpoDFM'], ['javascript:alert(1)', '']])
    assert.equal(a.run(`ytId(${JSON.stringify(u)})`), id);
  assert.equal(a.run('WORKOUTS.map(workoutSeconds).join()'), '345,460');
  assert.equal(a.run('QUIZ.every(x => x.a.length === 4 && x.c >= 0 && x.c < 4 && x.e && new Set(x.a).size === 4)'), true);
  assert.equal(a.run('QUIZ.length'), 16);
});

test('imports never switch location groups silently while sharing', ()=>{
  const a = app();
  a.run('globalThis.fsReq = () => Promise.resolve(null); S.famGroup = "MyFamilyGroupCode_12345"; S.live = {mid:"dev1234567890", name:"Ayah", on:true, lastSent:"2026-11-01T07:00:00Z", status:""}');
  assert.match(a.run('famImportNote({famGroup:"AttackerGroupCode_99999"})'), /DIMATIKAN/);
  assert.equal(a.run('famImportNote({famGroup:"MyFamilyGroupCode_12345"})'), '');
  a.run('globalThis.d1 = {famGroup:""}; adoptFamGroup(d1)');
  assert.equal(a.run('"famGroup" in d1 || S.live.on !== true'), false);          // empty group: keep current group and sharing
  a.run('adoptFamGroup({famGroup:"MyFamilyGroupCode_12345"})');
  assert.equal(a.run('S.live.on'), true);                                        // same group: unchanged
  a.run('adoptFamGroup({famGroup:"AttackerGroupCode_99999"})');
  assert.equal(a.run('S.live.on'), false);                                       // different group: sharing switched off
  assert.equal(a.run('S.live.lastSent'), null);
});
