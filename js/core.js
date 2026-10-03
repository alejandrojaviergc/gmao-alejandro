/* Cálculos independientes de la interfaz, adaptados de GMAO_local.ipynb. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GMAO = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SCHEMA = ['OT','Aviso','Fecha_creación','Fecha_inicio','Fecha_fin','Equipo','Unidad','Área','Tipo_equipo','Criticidad','Puesto_trabajo','Tipo_mantenimiento','Planificado','Prioridad','Modo_falla','Causa','Síntoma','Descripción','Estado','Downtime_h','Horas_mano_obra','Costo_repuestos_CLP','Costo_externo_CLP','Costo_total_CLP','Duración_OT_h','Mandante','Sociedad','Centro','Clase_orden','Status_sistema','Status_usuario','Prioridad_SAP','Grupo_planificador','Ubicacion_tecnica','Fecha_necesidad','Fecha_planificada','Tiempo_espera_h','Tiempo_reparacion_h','Cantidad_repuestos','Turno'];
  const NUMBERS = ['Downtime_h','Horas_mano_obra','Costo_repuestos_CLP','Costo_externo_CLP','Costo_total_CLP','Duración_OT_h','Prioridad_SAP','Tiempo_espera_h','Tiempo_reparacion_h','Cantidad_repuestos'];
  const DATES = ['Fecha_creación','Fecha_inicio','Fecha_fin','Fecha_necesidad','Fecha_planificada'];
  const key = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const clean = v => v == null ? '' : v instanceof Date ? v.toISOString() : String(v).trim().replace(/^'/,'').trim();
  const canonical = h => SCHEMA.find(c => key(c) === key(h)) || clean(h);
  function number(v) {
    let s = clean(v).replace(/\s/g,'');
    if (!s) return null;
    if (s.includes(',') && s.includes('.')) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g,'').replace(',','.');
      else s = s.replace(/,/g,'');
    } else s = s.replace(',','.');
    if (!/^[+-]?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i.test(s)) return null;
    const n = Number(s); return Number.isFinite(n) ? n : null;
  }
  function date(v) {
    const s = clean(v); if (!s) return null;
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z)?)?$/);
    let y,mo,d,h=0,mi=0,se=0;
    if (m) { [,y,mo,d,h=0,mi=0,se=0] = m; }
    else {
      m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?: (\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
      if (!m) return null;
      [,d,mo,y,h=0,mi=0,se=0] = m;
    }
    const parts = [y,mo,d,h,mi,se].map(Number);
    const t = Date.UTC(parts[0],parts[1]-1,parts[2],parts[3],parts[4],parts[5]);
    const check = new Date(t);
    if (check.getUTCFullYear()!==parts[0] || check.getUTCMonth()!==parts[1]-1 || check.getUTCDate()!==parts[2] || parts[3]>23 || parts[4]>59 || parts[5]>59) return null;
    return t;
  }
  function prepare(raw, headers) {
    headers = headers.map(canonical);
    if (new Set(headers).size !== headers.length) throw new Error('Hay encabezados repetidos. Cada columna debe tener un nombre único.');
    const missing = ['OT','Tipo_mantenimiento'].filter(c => !headers.includes(c));
    if (missing.length) throw new Error('Faltan columnas necesarias: '+missing.join(', ')+'. Usa la plantilla GMAO.');
    const seen = new Set(), ids = new Set(), rows = [];
    const quality = { input:raw.length, duplicates:0, noOT:0, negative:0, missingNumbers:0, invalidNumbers:0, invalidDates:0, reversed:0, withoutEquipment:0, missingFailure:0, unknownTypes:0 };
    const profile = headers.map(field => ({field, missing:0, invalid:0}));
    for (const obj of raw) {
      const r = Object.create(null);
      for (let i=0;i<headers.length;i++) r[headers[i]] = clean(Array.isArray(obj) ? obj[i] : obj[Object.keys(obj)[i]]);
      if (headers.every(h => !r[h])) { quality.input--; continue; }
      r.Tipo_mantenimiento = ({correctivo:'Correctivo',preventivo:'Preventivo',preventiva:'Preventivo',predictivo:'Predictivo'})[key(r.Tipo_mantenimiento)] || r.Tipo_mantenimiento || 'Sin clasificar';
      r.Estado = ({cerrada:'CERRADA',cerrado:'CERRADA',abierta:'ABIERTA',abierto:'ABIERTA',enejecucion:'EN EJECUCIÓN',ejecutando:'EN EJECUCIÓN'})[key(r.Estado)] || r.Estado || '';
      r.Planificado = ({si:'Sí',no:'No'})[key(r.Planificado)] || r.Planificado || '';
      // Valores numéricos y fechas normalizados antes de comparar duplicados exactos.
      for (const c of NUMBERS) if (headers.includes(c)) r[c] = number(r[c]);
      for (const c of DATES) if (headers.includes(c)) r[c] = date(r[c]);
      const signature = JSON.stringify(headers.map(h => r[h]));
      if (seen.has(signature)) { quality.duplicates++; continue; }
      seen.add(signature);
      if (!r.OT) { quality.noOT++; continue; }
      if (ids.has(r.OT)) throw new Error('La OT '+r.OT+' aparece en filas distintas. Este análisis requiere una fila por OT. Consolida las operaciones antes de cargar el dataset.');
      ids.add(r.OT);
      for (const p of profile) {
        const i=headers.indexOf(p.field), v=Array.isArray(obj)?obj[i]:obj[Object.keys(obj)[i]];
        if (!clean(v)) p.missing++;
        else if ((NUMBERS.includes(p.field)||DATES.includes(p.field)) && r[p.field]===null) p.invalid++;
      }
      for (const c of NUMBERS) if (headers.includes(c)) {
        if (r[c]===null) {
          const i=headers.indexOf(c),original=clean(Array.isArray(obj)?obj[i]:obj[Object.keys(obj)[i]]);
          if(original)quality.invalidNumbers++;else quality.missingNumbers++;
        }
        else if (r[c]<0) quality.negative++;
      }
      for (const c of DATES) if (headers.includes(c) && r[c]===null && clean(Array.isArray(obj)?obj[headers.indexOf(c)]:obj[Object.keys(obj)[headers.indexOf(c)]])) quality.invalidDates++;
      if (r.Fecha_fin != null && r.Fecha_inicio != null && r.Fecha_fin<r.Fecha_inicio) quality.reversed++;
      if (!r.Equipo) quality.withoutEquipment++;
      if (r.Tipo_mantenimiento==='Correctivo' && !r.Modo_falla) quality.missingFailure++;
      if (!['Correctivo','Preventivo','Predictivo'].includes(r.Tipo_mantenimiento)) quality.unknownTypes++;
      r._repair = r.Fecha_inicio!=null && r.Fecha_fin!=null ? (r.Fecha_fin-r.Fecha_inicio)/3600000 : null;
      rows.push(r);
    }
    if (!rows.length) throw new Error('No hay órdenes identificadas para analizar. Revisa el contenido y la columna OT.');
    return {rows,headers,quality,profile};
  }
  const validNumber = v => typeof v==='number' && Number.isFinite(v) && v>=0;
  function metric(rows, field) {
    const values=rows.map(r=>r[field]).filter(validNumber);
    return {value:values.length ? values.reduce((a,b)=>a+b,0) : null, valid:values.length, total:rows.length, complete:values.length===rows.length && rows.length>0};
  }
  const mean = a => a.length ? a.reduce((s,v)=>s+v,0)/a.length : null;
  const median = a => { if(!a.length)return null; const s=[...a].sort((a,b)=>a-b),i=Math.floor(s.length/2); return s.length%2?s[i]:(s[i-1]+s[i])/2; };
  function group(rows, field) {
    const map = new Map();
    for(const r of rows){ const label=r[field]||'Sin dato'; if(!map.has(label))map.set(label,[]); map.get(label).push(r); }
    return [...map].map(([label,data])=>({label,data,n:data.length,hh:metric(data,'Horas_mano_obra'),dt:metric(data,'Downtime_h'),cost:metric(data,'Costo_total_CLP')}));
  }
  function jackknife(rows, field) {
    if (!rows.length) return {rows:[],nLimit:null,tLimit:null,excluded:0};
    const groups=group(rows.filter(r=>r[field]),field), eligible=groups.filter(g=>g.dt.complete);
    const nf=eligible.reduce((s,g)=>s+g.n,0), total=eligible.reduce((s,g)=>s+g.dt.value,0);
    const nLimit=eligible.length?nf/eligible.length:null, tLimit=nf?total/nf:null;
    const result=eligible.map(g=>{
      const duration=g.dt.value/g.n, x=g.n/nLimit, y=tLimit>0?duration/tLimit:null;
      const quadrant=y===null?'No evaluable':x<1?(y<1?'Bajo control':'Agudo'):(y<1?'Crónico':'Grave');
      return {label:g.label,n:g.n,dt:g.dt.value,duration,x,y,risk:y===null?null:x*y,quadrant,type:g.data[0].Tipo_equipo||'Sin dato',criticality:g.data[0].Criticidad||'Sin dato'};
    }).sort((a,b)=>(b.risk??-1)-(a.risk??-1));
    return {rows:result,nLimit,tLimit,excluded:rows.length-eligible.reduce((s,g)=>s+g.n,0)};
  }
  function analyze(rows) {
    const correctives=rows.filter(r=>r.Tipo_mantenimiento==='Correctivo');
    const repairs=correctives.filter(r=>r.Estado==='CERRADA' && r._repair!==null && r._repair>0);
    const failureRows=correctives.filter(r=>r.Modo_falla);
    const failureGroups=group(failureRows,'Modo_falla');
    const pareto={};
    for(const [name,field] of [['frequency','n'],['downtime','dt'],['cost','cost']]){
      const list=failureGroups.map(g=>({label:g.label,value:field==='n'?g.n:g[field].value,complete:field==='n'||g[field].complete,n:g.n})).filter(g=>g.value!==null).sort((a,b)=>b.value-a.value||a.label.localeCompare(b.label));
      const total=list.reduce((s,g)=>s+g.value,0); let acc=0;
      pareto[name]=list.map(g=>({...g,share:total>0?g.value/total*100:null,acc:total>0?(acc+=g.value)/total*100:null}));
    }
    const totals={hh:metric(rows,'Horas_mano_obra'),dt:metric(rows,'Downtime_h'),cost:metric(rows,'Costo_total_CLP')};
    const mix=group(rows,'Tipo_mantenimiento').sort((a,b)=>b.n-a.n);
    for(const g of mix){g.otPct=rows.length?g.n/rows.length*100:null; for(const f of ['hh','dt','cost'])g[f+'Pct']=totals[f].value>0 && g[f].value!==null?g[f].value/totals[f].value*100:null;}
    const mttrByType=group(repairs,'Tipo_equipo').map(g=>({label:g.label,n:g.n,mean:mean(g.data.map(r=>r._repair)),median:median(g.data.map(r=>r._repair))})).sort((a,b)=>b.mean-a.mean);
    return {n:rows.length,totals,mix,correctives:correctives.length,closed:correctives.filter(r=>r.Estado==='CERRADA').length,repairs:repairs.length,mttr:mean(repairs.map(r=>r._repair)),median:median(repairs.map(r=>r._repair)),mttrByType,pareto,failureEvents:failureRows.length,jkEquipment:jackknife(repairs,'Equipo'),jkFailure:jackknife(repairs,'Modo_falla'),equipment:group(rows.filter(r=>r.Equipo),'Equipo'),period:rows.map(r=>r['Fecha_creación']).filter(v=>v!=null)};
  }
  function filter(rows,f={}) {
    return rows.filter(r=>['Tipo_mantenimiento','Estado','Área','Unidad','Criticidad'].every(k=>!f[k]||r[k]===f[k]) && (!f.start || (r['Fecha_creación']!=null && r['Fecha_creación']>=date(f.start))) && (!f.end || (r['Fecha_creación']!=null && r['Fecha_creación']<date(f.end)+86400000)) && (!f.query || key([r.OT,r.Equipo,r.Descripción].join(' ')).includes(key(f.query))));
  }
  return {SCHEMA,NUMBERS,DATES,key,clean,canonical,number,date,prepare,analyze,filter,metric,mean,median};
});
