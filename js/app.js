/* Interfaz estática: todos los archivos se leen en memoria del navegador. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id), fmt=GMAOCharts.fmt, esc=GMAOCharts.esc;
  let prepared=null,source='',sha='',filtered=[],result=null,excel=null;
  const charts=new Map();
  const settings={paretoMetric:'frequency',topN:10,equipmentMetric:'dt',jkGroup:'equipment'};
  const filterIds={'Tipo_mantenimiento':'typeFilter',Estado:'stateFilter','Área':'areaFilter',Unidad:'unitFilter',Criticidad:'criticalFilter'};
  function message(text,type='success'){const el=$('message');el.textContent=text;el.className='message '+type;el.hidden=!text;}
  function busy(on,text){$('chooseBtn').disabled=on;$('demoBtn').disabled=on;if(on)message(text);}
  function currentFilters(){const f={};for(const [k,id] of Object.entries(filterIds))f[k]=$(id).value;f.start=$('startFilter').value;f.end=$('endFilter').value;f.query=$('searchFilter').value.trim();return f;}
  function populateFilters(){
    for(const [key,id] of Object.entries(filterIds)){
      const el=$(id);el.replaceChildren(new Option('Todos',''));
      [...new Set(prepared.rows.map(r=>r[key]).filter(Boolean))].sort().forEach(v=>el.add(new Option(v,v)));
    }
    $('startFilter').value='';$('endFilter').value='';$('searchFilter').value='';
  }
  function table(id,headers,rows){
    $(id).innerHTML='<table><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+(rows.length?rows.map(row=>'<tr>'+row.map((v,i)=>'<td'+(i?' class="numeric"':'')+'>'+esc(v)+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="'+headers.length+'">No hay datos válidos para esta selección.</td></tr>')+'</tbody></table>';
  }
  function draw(id,kind){
    const el=$(id);
    if(!GMAOCharts.available(kind,result,settings)){
      if(charts.has(id)){charts.get(id).dispose();charts.delete(id);}
      el.innerHTML='<div class="chart-empty">'+(result.n?'No hay datos suficientes para este análisis. Revisa las columnas, estados y tiempos del archivo.':'No hay órdenes que coincidan con los filtros seleccionados.')+'</div>';return;
    }
    let chart=charts.get(id);if(!chart){el.replaceChildren();chart=echarts.init(el,null,{renderer:'canvas'});charts.set(id,chart);}
    chart.setOption(GMAOCharts.options(kind,result,settings),true);
  }
  function render(){
    if(!prepared)return;
    const f=currentFilters();
    if(f.start&&f.end&&f.start>f.end){message('La fecha de inicio debe ser anterior o igual a la fecha final.','error');$('pdfBtn').disabled=true;return;}
    filtered=GMAO.filter(prepared.rows,f);result=GMAO.analyze(filtered);
    $('pdfBtn').disabled=!result.n;$('csvBtn').disabled=!result.n;
    $('filterSummary').textContent=fmt(result.n,0)+' de '+fmt(prepared.rows.length,0)+' OT · Fechas filtradas por creación · El informe PDF usa esta selección.';
    const dates=result.period;const displayDate=t=>new Intl.DateTimeFormat('es-CL',{timeZone:'UTC'}).format(new Date(t));
    $('periodBadge').textContent=dates.length?displayDate(dates.reduce((v,t)=>Math.min(v,t),Infinity))+' — '+displayDate(dates.reduce((v,t)=>Math.max(v,t),-Infinity)):'Sin fechas de creación válidas';
    const kpis=[['Órdenes de trabajo',fmt(result.n,0),'OT únicas en la selección','◫'],['Horas de mano de obra',fmt(result.totals.hh.value),'Horas · '+coverage(result.totals.hh),'◷'],['Downtime acumulado',fmt(result.totals.dt.value),'Horas · '+coverage(result.totals.dt),'↘'],['Costo directo',result.totals.cost.value===null?'No disponible':'$ '+fmt(result.totals.cost.value/1e6),'Millones CLP · '+coverage(result.totals.cost),'$'],['MTTR correctivo',fmt(result.mttr),'Horas · '+result.repairs+' reparaciones válidas','↗'],['Mediana de reparación',fmt(result.median),'Horas · misma población del MTTR','≈']];
    $('kpis').innerHTML=kpis.map(([name,value,note,icon])=>'<article class="kpi"><span class="kpi-icon">'+icon+'</span><span class="kpi-label">'+name+'</span><div class="kpi-value">'+esc(value)+'</div><span class="kpi-note">'+esc(note)+'</span></article>').join('');
    const corr=result.mix.find(g=>g.label==='Correctivo');
    $('insight').innerHTML='<span class="insight-mark">↗</span><div><strong>Lectura del período</strong><br>'+(corr?'El correctivo reúne <strong>'+fmt(corr.otPct)+' % de las OT</strong> y concentra <strong>'+fmt(corr.dtPct)+' % del downtime registrado</strong>. '+result.repairs+' correctivos cerrados tienen fechas válidas para MTTR.':'No hay órdenes correctivas en esta selección. Los análisis de MTTR, fallas y Jack-Knife necesitan registros correctivos válidos.')+'</div>';
    table('mixTable',['Tipo','OT','% OT','HH','Downtime · h','Costo · M CLP'],result.mix.map(g=>[g.label,g.n,fmt(g.otPct)+' %',fmt(g.hh.value),fmt(g.dt.value),g.cost.value===null?'No disponible':fmt(g.cost.value/1e6)]));
    $('repairCoverage').textContent=result.repairs+' válidas / '+result.correctives+' correctivas';
    table('mttrTable',['Familia','Reparaciones','MTTR · h','Mediana · h'],result.mttrByType.map(g=>[g.label,g.n,fmt(g.mean),fmt(g.median)]));
    const p=result.pareto[settings.paretoMetric];
    table('paretoTable',['Modo de falla',settings.paretoMetric==='frequency'?'Eventos':settings.paretoMetric==='cost'?'Costo · CLP':'Downtime · h','%','Acumulado'],p.slice(0,settings.topN).map(r=>[r.label,fmt(r.value,settings.paretoMetric==='frequency'?0:1)+(r.complete?'':' · subtotal'),fmt(r.share)+' %',fmt(r.acc)+' %']));
    const jk=settings.jkGroup==='equipment'?result.jkEquipment:result.jkFailure;
    table('jkTable',[settings.jkGroup==='equipment'?'Equipo':'Modo de falla','Fallas','Downtime/falla · h','Downtime · h','Prioridad relativa','Cuadrante'],jk.rows.slice(0,15).map(r=>[r.label,r.n,fmt(r.duration),fmt(r.dt),fmt(r.risk,2),r.quadrant]));
    const q=prepared.quality;
    table('qualityTable',['Control del archivo','Registros / valores'],[['Filas de entrada',q.input],['Duplicados exactos eliminados',q.duplicates],['Filas sin OT excluidas',q.noOT],['OT admitidas',prepared.rows.length],['Valores numéricos ausentes (incluye opcionales)',q.missingNumbers],['Valores numéricos inválidos',q.invalidNumbers],['Valores negativos (no sumados)',q.negative],['Fechas inválidas',q.invalidDates],['Fecha_fin anterior a Fecha_inicio',q.reversed],['OT sin equipo',q.withoutEquipment],['Correctivo sin modo de falla',q.missingFailure],['Tipos de mantenimiento no reconocidos',q.unknownTypes]]);
    for(const [id,kind] of [['mixChart','mix'],['typeChart','type'],['equipmentChart','equipment'],['mttrChart','mttr'],['paretoChart','pareto:'+settings.paretoMetric],['jkChart','jk:'+settings.jkGroup]])draw(id,kind);
    const incomplete=['hh','dt','cost'].filter(k=>!result.totals[k].complete);
    const issues=q.negative+q.invalidNumbers+q.invalidDates+q.reversed+q.noOT;
    if(incomplete.length && result.n)message('Cobertura incompleta: algunos indicadores son subtotales de los valores válidos. Revisa los controles y las coberturas antes de comparar resultados.','warning');
    else if(issues)message('Archivo cargado. Se detectaron datos que requieren revisión; consulta Calidad y trazabilidad.','warning');
    else message('Dataset listo: '+fmt(prepared.rows.length,0)+' OT admitidas; '+q.duplicates+' duplicados exactos eliminados.');
  }
  function coverage(m){return m.complete?'cobertura completa':m.valid+' / '+m.total+' valores válidos · subtotal';}
  async function loadMatrix(headers,rows,name,digest=''){
    if(rows.length>100000)throw new Error('El dataset supera 100.000 filas. Divide el archivo por período para analizarlo.');
    if(headers.some(h=>!GMAO.clean(h)))throw new Error('El archivo tiene columnas sin encabezado. Usa la primera fila para los nombres de campos.');
    const p=GMAO.prepare(rows,headers);prepared=p;source=name;sha=digest;populateFilters();
    $('sourceLabel').textContent=name+' · '+fmt(rows.length,0)+' filas leídas';$('emptyState').hidden=true;$('analysis').hidden=false;render();
  }
  async function loadFile(file){
    if(!file)return;if(file.size>25*1024*1024){message('El archivo supera 25 MB. Divide el dataset por período.','error');return;}
    busy(true,'Leyendo '+file.name+'…');$('sheetChooser').hidden=true;
    try{
      await new Promise(r=>setTimeout(r,30));
      const bytes=await file.arrayBuffer();let digest='';
      if(globalThis.crypto?.subtle){const buffer=await crypto.subtle.digest('SHA-256',bytes);digest=[...new Uint8Array(buffer)].map(x=>x.toString(16).padStart(2,'0')).join('');}
      if(file.name.toLowerCase().endsWith('.xlsx')){
        const book=new ExcelJS.Workbook();await book.xlsx.load(bytes);
        const sheets=book.worksheets.filter(s=>s.state==='visible'||!s.state);
        if(!sheets.length)throw new Error('No hay hojas visibles en el Excel.');
        excel={book,sheets,name:file.name,digest};$('sheetSelect').replaceChildren(...sheets.map((s,i)=>new Option(s.name,String(i))));
        if(sheets.length===1)await loadSheet();else{$('sheetChooser').hidden=false;message('Selecciona la hoja que contiene el dataset GMAO.');}
      }else if(file.name.toLowerCase().endsWith('.csv')){
        let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{text=new TextDecoder('windows-1252').decode(bytes);}
        const parsed=Papa.parse(text.replace(/^\uFEFF/,''),{skipEmptyLines:'greedy'});
        if(parsed.errors.length)throw new Error('No se pudo interpretar el CSV: '+parsed.errors[0].message);
        const [headers,...rows]=parsed.data;if(!headers)throw new Error('El CSV está vacío.');
        if(rows.some(r=>r.length!==headers.length))throw new Error('Hay filas con una cantidad de columnas diferente al encabezado. Revisa separadores y comillas.');
        await loadMatrix(headers,rows,file.name,digest);
      }else throw new Error('Formato no compatible. Selecciona un archivo CSV o XLSX.');
    }catch(error){message(error.message.startsWith('La OT')||error.message.startsWith('Faltan')?error.message:'No fue posible cargar el archivo. '+error.message,'error');}
    finally{busy(false);$('fileInput').value='';}
  }
  async function loadSheet(){
    const s=excel.sheets[Number($('sheetSelect').value)],headers=Array.from({length:s.getRow(1).cellCount},(_,i)=>s.getRow(1).getCell(i+1).text);
    function value(v){if(v&&typeof v==='object'&&!(v instanceof Date)){if('result'in v)return v.result??'';if('richText'in v)return v.richText.map(t=>t.text).join('');if('text'in v)return v.text;throw new Error('Una celda contiene un error o un valor no compatible.');}return v??'';}
    const rows=[];for(let i=2;i<=s.actualRowCount;i++)rows.push(headers.map((_,j)=>value(s.getRow(i).getCell(j+1).value)));
    await loadMatrix(headers,rows,excel.name+' · '+s.name,excel.digest);$('sheetChooser').hidden=true;
  }
  function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $('chooseBtn').addEventListener('click',()=>$('fileInput').click());$('fileInput').addEventListener('change',e=>loadFile(e.target.files[0]));
  const zone=$('dropZone');['dragenter','dragover'].forEach(t=>zone.addEventListener(t,e=>{e.preventDefault();zone.classList.add('drag-over');}));['dragleave','drop'].forEach(t=>zone.addEventListener(t,e=>{e.preventDefault();zone.classList.remove('drag-over');}));zone.addEventListener('drop',e=>loadFile(e.dataTransfer.files[0]));
  $('demoBtn').addEventListener('click',async()=>{busy(true,'Preparando demostración…');try{const d=createGMAODemo();await loadMatrix(d.headers,d.rows,'Demostración sintética · 1.200 OT');}catch(e){message(e.message,'error');}finally{busy(false);}});
  $('loadSheetBtn').addEventListener('click',()=>loadSheet().catch(e=>message(e.message,'error')));
  for(const id of [...Object.values(filterIds),'startFilter','endFilter'])$(id).addEventListener('change',render);
  let debounce;$('searchFilter').addEventListener('input',()=>{clearTimeout(debounce);debounce=setTimeout(render,180);});
  $('resetBtn').addEventListener('click',()=>{populateFilters();render();});
  $('equipmentMetric').addEventListener('change',e=>{settings.equipmentMetric=e.target.value;render();});
  $('topN').addEventListener('change',e=>{settings.topN=Number(e.target.value);render();});
  $('jkGroup').addEventListener('change',e=>{settings.jkGroup=e.target.value;render();});
  document.querySelectorAll('[data-pareto]').forEach(b=>b.addEventListener('click',()=>{settings.paretoMetric=b.dataset.pareto;document.querySelectorAll('[data-pareto]').forEach(t=>t.classList.toggle('active',t===b));render();}));
  $('templateBtn').addEventListener('click',()=>download('\uFEFF'+Papa.unparse({fields:GMAO.SCHEMA,data:[]})+'\r\n','plantilla_GMAO.csv','text/csv;charset=utf-8'));
  $('csvBtn').addEventListener('click',()=>{const rows=filtered.map(r=>prepared.headers.map(c=>{const v=GMAO.DATES.includes(c)?r[c]==null?'':new Date(r[c]).toISOString():r[c]??'';return typeof v==='string'&&/^[=+@-]/.test(v)?"'"+v:v;}));download('\uFEFF'+Papa.unparse({fields:prepared.headers,data:rows}),'GMAO_datos_tratados.csv','text/csv;charset=utf-8');});
  function snapshot(){return {prepared,source,sha,rows:filtered,analysis:result,filters:currentFilters(),settings:{...settings}};}
  $('pdfBtn').addEventListener('click',()=>{$('reportScope').textContent=source+' · '+result.n+' OT seleccionadas · '+(Object.values(currentFilters()).some(Boolean)?'Filtros activos':'Dataset completo');$('reportDialog').showModal();});
  $('generatePdfBtn').addEventListener('click',async()=>{
    const button=$('generatePdfBtn');button.disabled=true;button.textContent='Generando informe…';
    try{await GMAOReport.exportPDF(snapshot(),{title:$('reportTitle').value.trim()||'Informe Ejecutivo de Gestión de Mantenimiento',unit:$('reportUnit').value.trim(),author:$('reportAuthor').value.trim()});$('reportDialog').close();message('Informe PDF exportado con los filtros y la selección actuales.');}
    catch(e){message('No se pudo exportar el informe: '+e.message,'error');}finally{button.disabled=false;button.textContent='Generar PDF';}
  });
  new ResizeObserver(()=>charts.forEach(c=>c.resize())).observe(document.querySelector('main'));
  window.addEventListener('resize',()=>charts.forEach(c=>c.resize()));
  const observer=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(visible)document.querySelectorAll('.nav-item').forEach(a=>a.classList.toggle('active',a.hash==='#'+visible.target.id));},{rootMargin:'-90px 0px -50% 0px'});document.querySelectorAll('.section').forEach(s=>observer.observe(s));
  window.GMAOWeb={snapshot,loadMatrix};
})();
