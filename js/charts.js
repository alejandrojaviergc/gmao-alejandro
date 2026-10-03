window.GMAOCharts = (function(){
  const palette=['#2c7762','#4a80a4','#c89c56','#887eb0','#70a5a0','#b96b53'];
  const colors={Grave:'#b8654b',Agudo:'#c89943','Crónico':'#497eab','Bajo control':'#62917d'};
  const fmt=(v,d=1)=>v==null?'No disponible':new Intl.NumberFormat('es-CL',{maximumFractionDigits:d}).format(v);
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const base={animation:false,color:palette,textStyle:{fontFamily:'Arial, sans-serif',color:'#56746a',fontSize:11},tooltip:{confine:true,backgroundColor:'#fff',borderColor:'#e0e8e7',textStyle:{color:'#36594d',fontSize:12}},grid:{left:55,right:30,top:55,bottom:65,containLabel:true}};
  const axis={axisLine:{lineStyle:{color:'#dce7e0'}},axisTick:{show:false},axisLabel:{color:'#80988c'},splitLine:{lineStyle:{color:'#edf2ef'}}};
  const short=s=>s.length>25?s.slice(0,23)+'…':s;
  function options(kind,a,s={}){
    let o={...base,tooltip:{...base.tooltip},grid:{...base.grid}};
    if(kind==='mix'){
      o.legend={top:8,itemWidth:10,itemHeight:10,textStyle:{fontSize:11,color:'#6a867a'}};
      o.xAxis={...axis,type:'category',data:a.mix.map(g=>g.label)};o.yAxis={...axis,type:'value',name:'Participación (%)',max:100};
      o.tooltip={...o.tooltip,trigger:'axis',formatter:p=>'<b>'+esc(p[0]?.axisValue??'')+'</b><br>'+p.map(t=>esc(t.seriesName)+': '+fmt(t.value)+' %').join('<br>')};
      o.series=[['Órdenes','otPct'],['Horas-hombre','hhPct'],['Downtime','dtPct'],['Costo directo','costPct']].map(([name,field])=>({name,type:'bar',barMaxWidth:35,data:a.mix.map(g=>g[field]),itemStyle:{borderRadius:[3,3,0,0]}}));
    }else if(kind==='type'){
      o.tooltip={...o.tooltip,trigger:'item',formatter:p=>'<b>'+esc(p.name)+'</b><br>'+fmt(p.value,0)+' OT · '+fmt(p.percent)+' %'};
      o.legend={bottom:8,textStyle:{fontSize:11}};
      o.series=[{type:'pie',radius:['47%','72%'],center:['50%','45%'],label:{show:false},emphasis:{label:{show:true,fontSize:14,fontWeight:'bold'}},data:a.mix.map(g=>({name:g.label,value:g.n})),itemStyle:{borderRadius:5,borderColor:'#fff',borderWidth:3}}];
    }else if(kind==='equipment'){
      const f=s.equipmentMetric||'dt',unit=f==='cost'?'CLP':'h';
      const list=a.equipment.filter(g=>g[f].value!==null).sort((a,b)=>b[f].value-a[f].value).slice(0,s.topN||10).reverse();
      o.grid={left:10,right:48,top:25,bottom:35,containLabel:true};
      o.xAxis={...axis,type:'value',axisLabel:{formatter:v=>f==='cost'?fmt(v/1e6)+' M':fmt(v)},name:unit};
      o.yAxis={...axis,type:'category',data:list.map(g=>g.label),axisLabel:{fontSize:10}};
      o.tooltip={...o.tooltip,trigger:'axis',formatter:p=>'<b>'+esc(p[0].axisValue)+'</b><br>'+fmt(p[0].value)+' '+unit};
      o.series=[{type:'bar',data:list.map(g=>g[f].value),barMaxWidth:18,itemStyle:{borderRadius:[0,3,3,0]},label:{show:false}}];
    }else if(kind==='mttr'){
      o.legend={top:8};o.xAxis={...axis,type:'category',data:a.mttrByType.map(g=>g.label),axisLabel:{rotate:20,formatter:short}};
      o.yAxis={...axis,type:'value',name:'Horas'};o.tooltip={...o.tooltip,trigger:'axis',formatter:p=>'<b>'+esc(p[0].axisValue)+'</b><br>'+p.map(t=>esc(t.seriesName)+': '+fmt(t.value)+' h').join('<br>')};
      o.series=[{name:'MTTR',type:'bar',barMaxWidth:35,data:a.mttrByType.map(g=>g.mean),itemStyle:{borderRadius:[3,3,0,0]},markLine:a.mttr==null?undefined:{symbol:'none',label:{formatter:'MTTR global',position:'insideEndTop'},data:[{yAxis:a.mttr}],lineStyle:{color:'#c89c56',type:'dashed'}}},{name:'Mediana',type:'bar',barMaxWidth:35,data:a.mttrByType.map(g=>g.median),itemStyle:{borderRadius:[3,3,0,0]}}];
    }else if(kind.startsWith('pareto')){
      const f=kind.split(':')[1]||s.paretoMetric||'frequency';const list=a.pareto[f].slice(0,s.topN||10),cost=f==='cost';
      o.grid={left:55,right:58,top:35,bottom:110,containLabel:true};
      o.xAxis={...axis,type:'category',data:list.map(g=>g.label),axisLabel:{rotate:35,formatter:short,fontSize:10}};
      o.yAxis=[{...axis,type:'value',name:f==='frequency'?'Eventos':cost?'Millones CLP':'Horas'},{...axis,type:'value',min:0,max:100,name:'Acumulado %',splitLine:{show:false}}];
      o.tooltip={...o.tooltip,trigger:'axis',formatter:p=>'<b>'+esc(p[0].axisValue)+'</b><br>'+p.map(t=>esc(t.seriesName)+': '+fmt(t.value)+(t.seriesIndex===1?' %':cost?' M CLP':'')).join('<br>')};
      o.series=[{name:f==='frequency'?'Eventos':cost?'Costo directo':'Downtime',type:'bar',barMaxWidth:45,data:list.map(g=>cost?g.value/1e6:g.value),itemStyle:{borderRadius:[3,3,0,0]}},{name:'Acumulado',type:'line',yAxisIndex:1,data:list.map(g=>g.acc),symbolSize:5,lineStyle:{color:'#c89c56'},itemStyle:{color:'#c89c56'},markLine:{symbol:'none',label:{formatter:'80 %'},lineStyle:{color:'#bac9be',type:'dashed'},data:[{yAxis:80}]}}];
    }else if(kind.startsWith('jk')){
      const jk=kind==='jk:failure'?a.jkFailure:a.jkEquipment;
      const plotted=jk.rows.filter(r=>r.x>0&&r.y>0),all=plotted.flatMap(r=>[r.x,r.y]);
      const min=all.reduce((v,x)=>Math.min(v,x),.3)*.5,max=all.reduce((v,x)=>Math.max(v,x),3)*1.6;
      o.grid={left:70,right:45,top:45,bottom:70,containLabel:true};
      const logLabel=v=>v<.01||v>=10000?Number(v).toExponential(1):fmt(v,3);
      o.xAxis={...axis,type:'log',min,max,axisLabel:{...axis.axisLabel,formatter:logLabel},name:'Frecuencia normalizada N*',nameLocation:'middle',nameGap:35};
      o.yAxis={...axis,type:'log',min,max,axisLabel:{...axis.axisLabel,formatter:logLabel},name:'Downtime por falla normalizado T*',nameLocation:'middle',nameGap:55};
      o.dataZoom=s.forPdf?[]:[{type:'inside',xAxisIndex:0,filterMode:'none'},{type:'inside',yAxisIndex:0,filterMode:'none'}];
      o.tooltip={...o.tooltip,trigger:'item',formatter:p=>{const r=p.data?.record;if(!r)return '';return '<b>'+esc(r.label)+'</b><br>'+esc(r.quadrant)+'<br>'+r.n+' fallas · '+fmt(r.duration)+' h/falla<br>Prioridad relativa: '+fmt(r.risk,2);}};
      o.series=Object.entries(colors).map(([name,color])=>({name,type:'scatter',data:plotted.filter(r=>r.quadrant===name).map(r=>({value:[r.x,r.y],record:r})),symbolSize:11,itemStyle:{color,opacity:.85},emphasis:{itemStyle:{borderColor:'#fff',borderWidth:2}},label:{show:false},z:4}));
      o.series.push({type:'line',symbol:'none',data:[],markLine:{silent:true,symbol:'none',label:{show:false},lineStyle:{color:'#9eafa5',type:'dashed'},data:[{xAxis:1},{yAxis:1}]}});
      for(const risk of [.5,1,2,4,8]){
        const points=[];for(let i=0;i<100;i++){const x=min*Math.pow(max/min,i/99),y=risk/x;if(y>=min&&y<=max)points.push([x,y]);}
        o.series.push({type:'line',data:points,symbol:'none',silent:true,lineStyle:{color:'#dce5de',type:'dotted',width:1},z:1});
      }
      o.graphic=[['AGUDO','15%','12%'],['GRAVE','72%','12%'],['BAJO CONTROL','15%','79%'],['CRÓNICO','72%','79%']].map(([text,left,top])=>({type:'text',left,top,style:{text,fill:'#91a69a',font:'10px Arial'}}));
    }
    if(s.forPdf){
      o.textStyle={...o.textStyle,fontSize:17};
      if(o.legend)o.legend={...o.legend,textStyle:{...o.legend.textStyle,fontSize:15}};
      for(const name of ['xAxis','yAxis'])if(o[name]){
        const resize=ax=>({...ax,axisLabel:{...ax.axisLabel,fontSize:14},nameTextStyle:{fontSize:15}});
        o[name]=Array.isArray(o[name])?o[name].map(resize):resize(o[name]);
      }
      if(o.graphic)o.graphic=o.graphic.map(g=>({...g,style:{...g.style,font:'14px Arial'}}));
    }
    return o;
  }
  function available(kind,a,s={}){
    if(!a.n)return false;
    if(kind==='mix'||kind==='type')return !!a.mix.length;
    if(kind==='equipment')return a.equipment.some(g=>g[s.equipmentMetric||'dt'].value!==null);
    if(kind==='mttr')return !!a.mttrByType.length;
    if(kind.startsWith('pareto'))return !!a.pareto[kind.split(':')[1]||s.paretoMetric||'frequency'].length;
    if(kind.startsWith('jk'))return (kind==='jk:failure'?a.jkFailure:a.jkEquipment).rows.some(r=>r.x>0&&r.y>0);
    return false;
  }
  return {options,available,fmt,esc,colors};
})();
