/* Demostración sintética. No contiene datos del usuario. */
window.createGMAODemo = function () {
  let seed=48; const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const pick=a=>a[Math.floor(random()*a.length)];
  const rows=[];
  const families=['Bomba','Compresor','Motor','Intercambiador','Válvula'];
  const modes=['Vibración alta','Fuga de sello','Desalineación','Sobretemperatura','Desgaste de rodamiento','Pérdida de caudal','Falla eléctrica','Corrosión','Obstrucción','Fuga de aceite','Fatiga mecánica','Pérdida de presión'];
  for(let i=0;i<1200;i++){
    const family=pick(families),unit=pick(['U-100','U-200','U-300']),equipment=unit+'-'+family[0]+'-'+String(1+Math.floor(random()*12)).padStart(3,'0');
    const r=random(),type=r<.41?'Correctivo':r<.87?'Preventivo':'Predictivo',closed=random()<.91;
    const start=Date.UTC(2025,0,1)+Math.floor(random()*180)*86400000+Math.floor(random()*20)*3600000;
    const hours=type==='Correctivo'?4+Math.floor(random()*48):1+Math.floor(random()*9);
    const dt=type==='Correctivo'?Math.round(hours*(.55+random()*.4)*10)/10:type==='Preventivo'?Math.round(random()*3*10)/10:0;
    const hh=Math.round((hours*(1+random()*2))*10)/10,cost=Math.round(hh*18500+random()*700000);
    const row={OT:String(4500000+i),Aviso:type==='Correctivo'?String(8800000+i):'',Fecha_creación:new Date(start-86400000).toISOString(),Fecha_inicio:new Date(start).toISOString(),Fecha_fin:closed?new Date(start+hours*3600000).toISOString():'',Equipo:equipment,Unidad:unit,Área:unit==='U-100'?'Proceso':unit==='U-200'?'Servicios':'Almacenamiento',Tipo_equipo:family,Criticidad:pick(['A','B','C']),Tipo_mantenimiento:type,Planificado:type==='Correctivo'?'No':'Sí',Prioridad:type==='Correctivo'?'Alta':'Media',Modo_falla:type==='Correctivo'?pick(modes):'',Causa:type==='Correctivo'?'Degradación del componente':'',Estado:closed?'CERRADA':pick(['ABIERTA','EN EJECUCIÓN']),Downtime_h:dt,Horas_mano_obra:hh,Costo_total_CLP:cost,Duración_OT_h:closed?hours:'',Descripción:'Dataset sintético de demostración',Centro:unit,Turno:pick(['Día','Noche'])};
    rows.push(GMAO.SCHEMA.map(c=>row[c]??''));
  }
  rows.push([...rows[10]],[...rows[20]]);
  return {headers:GMAO.SCHEMA,rows};
};
