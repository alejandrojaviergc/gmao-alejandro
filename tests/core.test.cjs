const test=require('node:test');
const assert=require('node:assert/strict');
const G=require('../js/core.js');
const headers=['OT','Tipo_mantenimiento','Estado','Fecha_inicio','Fecha_fin','Equipo','Tipo_equipo','Modo_falla','Downtime_h','Horas_mano_obra','Costo_total_CLP','Fecha_creación'];
const row=(id,overrides={})=>{const obj={OT:id,Tipo_mantenimiento:'Correctivo',Estado:'CERRADA',Fecha_inicio:'01-01-2025 08:00',Fecha_fin:'01-01-2025 12:00',Equipo:'P-1',Tipo_equipo:'Bomba',Modo_falla:'Fuga',Downtime_h:'3',Horas_mano_obra:'5',Costo_total_CLP:'100',Fecha_creación:'01-01-2025 00:00',...overrides};return headers.map(h=>obj[h]);};
test('normalización regional y fechas reales, sin rollover',()=>{
 assert.equal(G.number("' 1.234,56"),1234.56);assert.equal(G.number('1,234.56'),1234.56);assert.equal(G.number('abc'),null);
 assert.equal(G.date('31-02-2025'),null);assert.equal(G.date('2025-13-01'),null);
 assert.equal(G.date('03-10-2026 14:30'),Date.UTC(2026,9,3,14,30));
});
test('duplicados exactos se eliminan; OT conflictivas se rechazan',()=>{
 const p=G.prepare([row('1'),row('1')],headers);assert.equal(p.quality.duplicates,1);assert.equal(p.rows.length,1);
 assert.throws(()=>G.prepare([row('1'),row('1',{Downtime_h:'4'})],headers),/filas distintas/);
});
test('MTTR usa intervalos correctivos cerrados positivos; no usa downtime',()=>{
 const p=G.prepare([row('1'),row('2',{Estado:'ABIERTA'}),row('3',{Fecha_fin:'01-01-2025 06:00'}),row('4',{Tipo_mantenimiento:'Preventivo'})],headers);
 const a=G.analyze(p.rows);assert.equal(a.n,4);assert.equal(a.repairs,1);assert.equal(a.mttr,4);assert.equal(a.median,4);assert.equal(p.quality.reversed,1);assert.equal(a.jkEquipment.rows[0].duration,3);
});
test('cobertura incompleta se conserva y Jack-Knife excluye grupo incompleto',()=>{
 const p=G.prepare([row('1'),row('2',{Downtime_h:'',Equipo:'P-1'}),row('3',{Downtime_h:'-2',Equipo:'P-2'})],headers);
 const a=G.analyze(p.rows);assert.equal(a.totals.dt.value,3);assert.equal(a.totals.dt.valid,1);assert.equal(a.totals.dt.complete,false);assert.equal(a.jkEquipment.rows.length,0);assert.equal(a.jkEquipment.excluded,3);
});
test('Jack-Knife conserva tiempos cero sin normalización infinita',()=>{
 const a=G.analyze(G.prepare([row('1',{Downtime_h:'0'})],headers).rows);
 assert.equal(a.jkEquipment.rows.length,1);assert.equal(a.jkEquipment.rows[0].y,null);assert.equal(a.jkEquipment.rows[0].quadrant,'No evaluable');
});
test('Pareto usa el universo completo y filtros actualizan los cálculos',()=>{
 const p=G.prepare([row('1'),row('2'),row('3',{Modo_falla:'Eléctrica',Tipo_mantenimiento:'Preventivo'}),row('4',{Modo_falla:'Desgaste',Fecha_creación:'02-01-2025 23:59'})],headers);
 const a=G.analyze(p.rows);assert.equal(a.pareto.frequency[0].acc,2/3*100);assert.equal(a.pareto.frequency.at(-1).acc,100);
 assert.equal(G.filter(p.rows,{start:'2025-01-02',end:'2025-01-02'}).length,1);
 assert.equal(G.analyze(G.filter(p.rows,{Tipo_mantenimiento:'Preventivo'})).mttr,null);
 assert.equal(G.analyze([]).totals.hh.value,null);
});
test('columnas mínimas y esquemas parciales',()=>{
 assert.throws(()=>G.prepare([['1']],['Order']),/Faltan columnas/);
 const a=G.analyze(G.prepare([['1','preventiva']],['OT','Tipo_mantenimiento']).rows);
 assert.equal(a.mix[0].label,'Preventivo');assert.equal(a.totals.dt.value,null);assert.equal(a.mttr,null);
});
