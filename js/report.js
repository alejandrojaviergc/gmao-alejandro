/* Informe ejecutivo generado íntegramente en el navegador. */
window.GMAOReport = (function(){
  const fmt=GMAOCharts.fmt;
  const safe=s=>String(s??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[–—‑]/g,'-').slice(0,500);
  async function capture(kind,a,settings){
    if(!GMAOCharts.available(kind,a,settings))return null;
    const node=document.createElement('div');node.setAttribute('aria-hidden','true');node.style.cssText='position:fixed;left:-12000px;top:0;width:1100px;height:'+(kind==='mix'?420:kind==='mttr'?560:660)+'px;background:white;';document.body.appendChild(node);
    let chart;
    try{chart=echarts.init(node,null,{renderer:'canvas',devicePixelRatio:1.6});chart.setOption(GMAOCharts.options(kind,a,{...settings,forPdf:true}));chart.getZr().flush();await new Promise(r=>setTimeout(r,20));return chart.getDataURL({type:'png',pixelRatio:1.6,backgroundColor:'#ffffff'});}
    finally{chart?.dispose();node.remove();}
  }
  async function exportPDF(snapshot,meta={},save=true){
    const a=snapshot.analysis;if(!a?.n)throw new Error('No hay órdenes seleccionadas para exportar.');
    const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:'mm',format:'letter',orientation:'portrait',compress:true});
    const w=215.9,h=279.4,m=22,cw=w-2*m;
    const blue=[23,54,93],accent=[47,117,181],gray=[100,116,139];
    const emission=new Intl.DateTimeFormat('es-CL',{dateStyle:'long',timeZone:'America/Santiago'}).format(new Date());
    const title=safe(meta.title||'Informe Ejecutivo de Gestión de Mantenimiento'),source=safe(snapshot.source);
    doc.setProperties({title,subject:'Análisis de mantenimiento CMMS',author:safe(meta.author||'GMAO · Gestión de mantenimiento'),creator:'GMAO Web estático'});
    const image={};for(const kind of ['mix','mttr','pareto:frequency','pareto:downtime','pareto:cost','jk:equipment','jk:failure'])image[kind]=await capture(kind,a,snapshot.settings);
    const sections=[],headerPages=new Set();
    function write(text,x,y,size=10,color=gray,bold=false){doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color);doc.text(safe(text),x,y);}
    function paragraph(text,y,size=9.5,color=[51,65,85],width=cw){doc.setFont('helvetica','normal');doc.setFontSize(size);doc.setTextColor(...color);const lines=doc.splitTextToSize(safe(text),width);doc.text(lines,m,y);return y+lines.length*size*.42+3;}
    function page(section){doc.addPage();const page=doc.getNumberOfPages();headerPages.add(page);sections.push({title:section,page});write('MEC048H · Gestión de activos y mantenimiento',m,13,8,gray);write('Análisis CMMS',w-m-26,13,8,gray);doc.setLineWidth(.25);doc.setDrawColor(203,213,225);doc.line(m,17,w-m,17);write(section,m,28,15,blue,true);doc.setDrawColor(...accent);doc.line(m,32,w-m,32);return 41;}
    function sub(text,y){write(text,m,y,10.5,blue,true);return y+7;}
    function box(text,y,label='Hallazgo clave del diagnóstico'){
      doc.setFont('helvetica','normal');doc.setFontSize(9.5);const lines=doc.splitTextToSize(safe(text),cw-10),height=13+lines.length*4.2;
      doc.setLineWidth(.2);doc.setFillColor(241,246,251);doc.setDrawColor(...accent);doc.roundedRect(m,y,cw,height,2,2,'FD');write(label,m+5,y+6,9,blue,true);doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(51,65,85);doc.text(lines,m+5,y+13);return y+height+7;
    }
    function table(headers,rows,y,widths){
      doc.autoTable({startY:y,head:[headers],body:rows.map(r=>r.map(safe)),theme:'plain',margin:{left:m,right:m,top:23,bottom:20},tableWidth:cw,rowPageBreak:'avoid',styles:{font:'helvetica',fontSize:8.5,cellPadding:2.5,textColor:[51,65,85],overflow:'linebreak'},headStyles:{fillColor:[237,243,248],textColor:blue,fontStyle:'bold'},alternateRowStyles:{fillColor:[248,250,252]},columnStyles:widths?Object.fromEntries(widths.map((v,i)=>[i,{cellWidth:v}])):{}});
      return doc.lastAutoTable.finalY+7;
    }
    function figure(kind,y,height,caption){
      if(image[kind]){doc.addImage(image[kind],'PNG',m,y,cw,height,undefined,'FAST');y+=height+4;}
      else y=paragraph('No hay datos válidos para construir este gráfico.',y+8,9,gray)+10;
      return paragraph(caption,y,8,gray);
    }
    function pct(v){return v==null?'n.a.':fmt(v)+' %';}
    function unit(v,suffix=' h'){return v==null?'n.a.':fmt(v)+suffix;}
    function total(m){return m.value==null?'n.a.':fmt(m.value)+(m.complete?'':' *');}
    const period=a.period.length?new Intl.DateTimeFormat('es-CL',{timeZone:'UTC'}).format(new Date(a.period.reduce((v,t)=>Math.min(v,t),Infinity)))+' al '+new Intl.DateTimeFormat('es-CL',{timeZone:'UTC'}).format(new Date(a.period.reduce((v,t)=>Math.max(v,t),-Infinity))):'Sin fechas de creación válidas';
    const filters=Object.entries(snapshot.filters).filter(([,v])=>v).map(([k,v])=>(k==='start'?'Creación desde':k==='end'?'Creación hasta':k==='query'?'Búsqueda':k)+': '+v).join(' · ')||'Dataset completo, sin filtros';
    const corr=a.mix.find(g=>g.label==='Correctivo');
    // Portada.
    write('MEC048H · GESTIÓN DE ACTIVOS Y MANTENIMIENTO',m,46,10,accent,true);doc.setDrawColor(...blue);doc.setLineWidth(1);doc.line(m,55,w-m,55);
    doc.setFont('helvetica','bold');doc.setFontSize(26);doc.setTextColor(...blue);doc.text(doc.splitTextToSize(title,cw),m,77);
    let cy=115;cy=paragraph('Análisis automatizado de CMMS · '+source,cy,12);
    cy=box('Reporte técnico-gerencial con actividad, recursos, impacto operacional, mantenibilidad, modos de falla y priorización mediante Jack-Knife. Resultados calculados sobre la selección actual.',cy+8,'Resumen del documento');
    paragraph('Período de creación: '+period,cy+3,10);
    paragraph('Plataforma: procesamiento local en el navegador\nFecha de emisión: '+emission+(meta.unit?'\nUnidad operativa: '+safe(meta.unit):'')+(meta.author?'\nPreparado por: '+safe(meta.author):''),231,8.5,gray);
    doc.addPage(); // Índice se completa con los números efectivos al final.
    // Resumen ejecutivo.
    let y=page('1. Resumen ejecutivo');
    const cards=[['Órdenes de trabajo',fmt(a.n,0)],['Horas-hombre',total(a.totals.hh)+' h'],['Downtime total',total(a.totals.dt)+' h'],['Costo directo',a.totals.cost.value==null?'n.a.':'$ '+fmt(a.totals.cost.value/1e6)+' M CLP'+(a.totals.cost.complete?'':' *')],['MTTR correctivo',unit(a.mttr)],['Mediana de reparación',unit(a.median)]];
    const cardw=(cw-10)/3;
    cards.forEach(([label,value],i)=>{const x=m+(i%3)*(cardw+5),yy=y+Math.floor(i/3)*26;doc.setFillColor(248,250,252);doc.setDrawColor(203,213,225);doc.roundedRect(x,yy,cardw,22,2,2,'FD');doc.setFontSize(8);doc.setFont('helvetica','bold');doc.setTextColor(...gray);doc.text(label,x+cardw/2,yy+7,{align:'center'});doc.setFontSize(value.length>17?11:14);doc.setTextColor(...blue);doc.text(value,x+cardw/2,yy+16,{align:'center'});});
    y+=56;
    y=box(corr?'El correctivo representa '+pct(corr.otPct)+' de las órdenes, '+pct(corr.hhPct)+' de las horas-hombre, '+pct(corr.dtPct)+' del downtime registrado y '+pct(corr.costPct)+' del costo directo. '+a.repairs+' reparaciones tienen fechas válidas para MTTR.':'La selección no contiene mantenimiento correctivo. MTTR, Pareto de fallas y Jack-Knife quedan sin resultados.',y);
    y=sub('1.1. Distribución de órdenes y recursos',y);
    y=table(['Tipo','OT','% OT','% HH','% Downtime','% Costo'],a.mix.map(g=>[g.label,g.n,pct(g.otPct),pct(g.hhPct),pct(g.dtPct),pct(g.costPct)]),y);
    y=figure('mix',y,63,'Figura 1. Participación relativa de cada tipo en las métricas del período.');
    paragraph('* Subtotal de valores válidos. n.a.: datos no disponibles. Las participaciones de recursos usan esos valores válidos.',y,8,gray);
    // Mantenibilidad.
    y=page('2. Mantenibilidad');
    y=paragraph('MTTR: intervalo medio entre Fecha_inicio y Fecha_fin, para correctivos cerrados con duración positiva. Verificar que estas marcas representen reparación, pues pueden incluir espera o tiempo administrativo.',y);
    y=box('Correctivos: '+a.correctives+' · Cerrados: '+a.closed+' · Reparaciones válidas: '+a.repairs+'. MTTR global: '+unit(a.mttr)+'; mediana: '+unit(a.median)+'.',y,'Cobertura de mantenibilidad');
    y=sub('2.1. MTTR por tipo de equipo',y);
    y=figure('mttr',y,92,'Figura 2. MTTR y mediana por familia de equipo. Línea de referencia: MTTR global.');
    y=table(['Familia de equipo','Reparaciones','MTTR [h]','Mediana [h]'],a.mttrByType.slice(0,6).map(r=>[r.label,r.n,fmt(r.mean),fmt(r.median)]),y);
    paragraph('Tabla: hasta seis familias con mayor MTTR. El gráfico y el panel incluyen todas las familias del filtro.',y,8,gray);
    // Modos de falla: cada impacto separado mantiene lectura y evita gráficos comprimidos.
    const descriptions={frequency:['3.1. Pareto por frecuencia','Eventos','Eventos correctivos con modo de falla. El acumulado utiliza todos los modos de falla de la selección.'],downtime:['3.2. Pareto por downtime','Downtime [h]','Concentración de indisponibilidad en los modos de falla correctivos. Los valores inválidos no se sustituyen por cero.'],cost:['3.3. Pareto por costo directo','Costo directo [CLP]','Concentración del gasto directo en fallas correctivas. Moneda del esquema GMAO: CLP.']};
    for(const [metric,[section,label,description]] of Object.entries(descriptions)){
      y=page(section);y=paragraph(description,y);
      const list=a.pareto[metric];
      y=figure('pareto:'+metric,y,97,'Pareto de los '+snapshot.settings.topN+' modos principales. El acumulado no se recalcula sobre el top mostrado.');
      y=table(['Modo de falla',label,'% acumulado'],list.slice(0,8).map(r=>[r.label,fmt(r.value,metric==='frequency'?0:1)+(r.complete?'':' *'),pct(r.acc)]),y,[cw*.57,cw*.25,cw*.18]);
      paragraph('Cobertura: '+a.failureEvents+' correctivos con modo de falla de '+a.correctives+' correctivos seleccionados. '+(list.some(r=>!r.complete)?'* Existen subtotales por datos incompletos.':'Los registros sin modo de falla no participan en este ranking.'),y,8,gray);
    }
    // Jack-Knife por equipo y por modo.
    for(const [kind,title,label] of [['equipment','4.1. Jack-Knife por equipo','Equipo'],['failure','4.2. Jack-Knife por modo de falla','Modo de falla']]){
      const jk=kind==='equipment'?a.jkEquipment:a.jkFailure;
      y=page(title);y=paragraph('Frecuencia normalizada N* frente a downtime por falla normalizado T*. Se utilizan correctivos válidos para MTTR y grupos con downtime completo. La duración de este diagrama difiere del MTTR por inicio-fin.',y);
      y=figure('jk:'+kind,y,97,'Jack-Knife normalizado. Referencias N*=1 y T*=1; curvas de igual prioridad relativa.');
      y=table([label,'Fallas','DT/falla [h]','R*','Cuadrante'],jk.rows.slice(0,8).map(r=>[r.label,r.n,fmt(r.duration),fmt(r.risk,2),r.quadrant]),y,[cw*.36,cw*.12,cw*.19,cw*.1,cw*.23]);
      paragraph('R*=N*×T* refleja downtime relativo, no riesgo de seguridad. '+jk.excluded+' registros se excluyeron por clave ausente o downtime incompleto. Los grupos con tiempo cero se omiten del gráfico logarítmico, pero se conservan en tabla.',y,8,gray);
    }
    // Calidad y método.
    y=page('5. Calidad de datos y trazabilidad');
    const q=snapshot.prepared.quality;
    y=paragraph('Los controles siguientes corresponden al archivo completo cargado; los indicadores y gráficas del informe corresponden exclusivamente a la selección filtrada.',y);
    y=table(['Control','Resultado'],[['Filas de entrada',q.input],['Duplicados exactos eliminados',q.duplicates],['Filas sin OT excluidas',q.noOT],['OT admitidas',snapshot.prepared.rows.length],['OT incluidas en este informe',a.n],['Valores numéricos ausentes (incluye opcionales)',q.missingNumbers],['Valores numéricos inválidos',q.invalidNumbers],['Valores negativos no sumados',q.negative],['Fechas inválidas',q.invalidDates],['Fin anterior al inicio',q.reversed],['OT sin equipo',q.withoutEquipment],['Correctivos sin modo de falla',q.missingFailure]],y);
    y=sub('5.1. Cobertura de recursos en la selección',y);
    y=table(['Métrica','Valores válidos','Total de OT'],[['Horas-hombre',a.totals.hh.valid,a.n],['Downtime',a.totals.dt.valid,a.n],['Costo directo',a.totals.cost.valid,a.n]],y);
    y=paragraph('Fuente: '+source+'\nFiltros: '+filters,y,8.5);
    if(snapshot.sha)y=paragraph('SHA-256 del archivo: '+snapshot.sha,y,7.5);
    if(y>235){y=page('6. Método y alcance');}
    y=paragraph('Método adaptado de GMAO_local.ipynb: actividad, horas-hombre, downtime, costo directo, MTTR, Pareto y Jack-Knife. Una fila por OT; duplicados exactos eliminados. Los campos faltantes se muestran como n.a. o subtotal, sin inventar valores.',y,8.5);
    paragraph('MTBF y disponibilidad no se calculan: requieren horas de operación y tiempo requerido por activo. Todos los archivos se procesan en el navegador. La demostración, cuando se utiliza, contiene datos sintéticos.',y,8.5);
    // Índice usa la paginación efectiva, también si una tabla se extendió.
    doc.setPage(2);write('Índice',m,30,18,blue,true);doc.setDrawColor(...accent);doc.line(m,35,w-m,35);
    let iy=49;for(const s of sections){doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(...blue);doc.text(s.title,m,iy);doc.text(String(s.page),w-m,iy,{align:'right'});iy+=11;}
    iy=paragraph('Archivo: '+source+'\nPeríodo de creación: '+period+'\nSelección: '+a.n+' de '+snapshot.prepared.rows.length+' OT admitidas.\nFiltros: '+filters,iy+12,9);
    paragraph('Las fechas se filtran por creación de la OT. Los cambios de filtros actualizan todos los análisis y este informe. Los datos incompletos y los controles de calidad se documentan en la sección final.',iy+4,9);
    const pages=doc.getNumberOfPages();for(let i=2;i<=pages;i++){doc.setPage(i);if(i>2&&!headerPages.has(i))write('Gestión de activos y mantenimiento',m,13,8,gray);write(String(i)+' / '+pages,w/2,269,8,gray);}
    if(save){const basename=source.replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,65);doc.save('Informe_Ejecutivo_Mantenimiento_'+basename+'.pdf');}
    return doc;
  }
  return {exportPDF};
})();
