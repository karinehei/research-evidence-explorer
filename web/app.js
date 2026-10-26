/* Browser-local research workspace. No remote requests or service credentials. */
(function () {
  'use strict';
  const M = window.ResearchModel, KEY = 'research-evidence-explorer-v1';
  const $ = id => document.getElementById(id);
  const el = (tag, attrs = {}, children = []) => {
    const n = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs)) {
      if (k === 'text') n.textContent = v;
      else if (k === 'class') n.className = v;
      else n.setAttribute(k,v);
    }
    for (const c of children) n.append(typeof c === 'string' ? document.createTextNode(c) : c);
    return n;
  };
  const clone = x => JSON.parse(JSON.stringify(x));
  const names = {source:'Lähde',concept:'Käsite',criterion:'Kriteeri',question:'Avoin kysymys',literature:'Kirjallisuudesta raportoitu',adaptation:'Oma sovellus',hypothesis:'Testaamaton oletus','reported-full-text':'Asiakirjassa: käsikirjoituksen tekstiä tarkasteltu','reported-abstract':'Asiakirjassa: abstrakti','not-recorded':'Tarkastelutaso täsmennettävä','not-applicable':'Ei sovellu',motivates:'Motivoi',operationalises:'Operationalisoi',complements:'Täydentää',questions:'Kyseenalaistaa',proposes:'Ehdottaa testattavaa yhteyttä'};
  const colors = {source:'#eaf0fb',concept:'#e9f2ed',criterion:'#f6efdf',question:'#eee9f6'};
  let model = M.validate(window.RESEARCH_SEED), selected = 'sufficiency', selectedEdge = null, focus = true, view = 'graph', caseId = 'A', trace = null;
  let undo = [], positions = new Map(), visibleIds = new Set(), drag = null, importedWarning = '';
  const message = (s,error=false) => { $('message').textContent=s; $('message').className=error?'error':''; };
  try { const saved = localStorage.getItem(KEY); if (saved) model = M.validate(JSON.parse(saved)); }
  catch { importedWarning = 'Paikallista tallennetta ei voitu lukea. Lähtömalli avattiin; tallenne säilyy koskemattomana seuraavaan muokkaukseen asti.'; }
  if (!model.nodes.some(n => n.id === selected)) selected = model.nodes[0].id;
  function persist() {
    try { localStorage.setItem(KEY,JSON.stringify(model)); $('save-state').textContent='Tallennettu tähän selaimeen'; }
    catch { $('save-state').textContent='Paikallinen tallennus ei onnistunut'; message('Selaintallennus ei ole käytettävissä. Vie JSON säilyttääksesi muutokset.',true); }
  }
  function commit(next) {
    try {
      const clean = M.validate(next);
      if (JSON.stringify(clean) === JSON.stringify(model)) return true;
      undo.push(clone(model)); if (undo.length>30) undo.shift(); model=clean; trace=null; persist(); render();return true;
    } catch(e) { message(e.message,true);return false; }
  }
  const button = (text,callback,cls='') => { const b=el('button',{type:'button',text,class:cls}); b.addEventListener('click',callback); return b; };
  function options(select,values,current) {
    select.replaceChildren(...values.map(v => el('option',{value:typeof v==='string'?v:v.id,text:typeof v==='string'?(names[v]||v):v.label})));
    if(current!==undefined) select.value=current;
  }
  function field(parent,label,value,type='textarea',values=null) {
    const wrap=el('label',{text:label});
    const input=el(type === 'select'?'select':type === 'textarea'?'textarea':'input');
    if(type==='input')input.type='text';
    if(values)options(input,values,value); else input.value=value;
    wrap.append(input);parent.append(wrap);return input;
  }
  function related(id) {
    const ids = new Set([id]);
    // Ancestors and descendants are traversed separately. Shared neighbours do
    // not turn a focused view into the entire connected component.
    for (const backwards of [true,false]) {
      const queue=[id],seen=new Set([id]);
      for(let i=0;i<queue.length;i++) for(const e of model.edges){
        const from=backwards?e.target:e.source,to=backwards?e.source:e.target;
        if(from===queue[i]&&!seen.has(to)){seen.add(to);ids.add(to);queue.push(to);}
      }
    }
    return ids;
  }
  function choose(id,moveView=false) { selected=id;selectedEdge=null;trace=null;if(moveView){view='graph';focus=true;location.hash='graph';$('search').value='';$('status-filter').value='all';}render(); }
  function renderInspector() {
    const panel=$('inspector');panel.replaceChildren();
    if(selectedEdge){
      const edge=model.edges.find(e=>e.id===selectedEdge);if(!edge){selectedEdge=null;return renderInspector();}
      panel.append(el('div',{class:'eyebrow',text:'YHTEYDEN PERUSTELU'}),el('h2',{text:edge.label||names[edge.relation]}));
      panel.append(el('p',{text:(model.nodes.find(n=>n.id===edge.source)?.label||edge.source)+' → '+(model.nodes.find(n=>n.id===edge.target)?.label||edge.target)}));
      const form=el('form');
      const label=field(form,'Näkyvä nimi',edge.label,'input');
      const relation=field(form,'Yhteyden merkitys',edge.relation,'select',M.relations);
      const status=field(form,'Yhteyden tiedollinen tila',edge.status,'select',M.statuses);
      const rationale=field(form,'Perustelu ja soveltamisen rajaus',edge.rationale);
      const locator=field(form,'Lähdekohta tai päätösmuistio',edge.locator);
      const save=el('button',{type:'submit',class:'primary',text:'Tallenna yhteys'});form.append(el('div',{class:'actions'},[save]));
      form.addEventListener('submit',ev=>{ev.preventDefault();const next=clone(model),e=next.edges.find(x=>x.id===edge.id);Object.assign(e,{label:label.value,relation:relation.value,status:status.value,rationale:rationale.value,locator:locator.value});if(commit(next))message('Yhteyden tiedot tallennettiin.');});panel.append(form);
      panel.append(button('Poista yhteys',()=>{const next=clone(model);next.edges=next.edges.filter(e=>e.id!==edge.id);selectedEdge=null;commit(next);message('Yhteys poistettiin. Toiminnon voi kumota.');},'delete'));
      return;
    }
    const node=model.nodes.find(n=>n.id===selected); if(!node)return;
    panel.append(el('div',{class:'eyebrow',text:names[node.kind]}),el('h2',{text:node.label}),el('span',{class:'tag '+node.status,text:names[node.status]}));
    const form=el('form');
    const label=field(form,'Nimi',node.label,'input');
    const description=field(form,'Määritelmä tai lähteestä raportoitu sisältö',node.description);
    const boundary=field(form,'Mitä tästä ei voi päätellä',node.boundary);
    const unit=field(form,'Arvioinnin kohde tai yksikkö',node.unit,'input');
    const status=field(form,'Tiedollinen tila',node.status,'select',M.statuses);
    const access=field(form,'Asiakirjassa raportoitu lukemistieto',node.access,'select',M.access);
    const basis=field(form,'Tulkinnan perustana oleva asiakirja',node.basis,'input');
    const locator=field(form,'Lähdekohta',node.locator,'input');
    const url=field(form,'Alkuperäislähteen linkki',node.url,'input');
    const notes=field(form,'Oma pohdinta tai seuraava tarkistus',node.notes);
    form.append(el('div',{class:'actions'},[el('button',{type:'submit',class:'primary',text:'Tallenna muutokset'})]));
    form.addEventListener('submit',ev=>{ev.preventDefault();const next=clone(model),n=next.nodes.find(x=>x.id===node.id);Object.assign(n,{label:label.value.trim(),description:description.value,boundary:boundary.value,unit:unit.value,status:status.value,access:access.value,basis:basis.value,locator:locator.value,url:url.value.trim(),notes:notes.value});if(commit(next))message('Kohteen tiedot tallennettiin.');});
    panel.append(form);
    if(node.url)panel.append(el('p',{},[el('a',{href:node.url,target:'_blank',rel:'noopener noreferrer',text:'Avaa alkuperäislähde ↗'})]));
    panel.append(el('div',{class:'field-title',text:'Suorat yhteydet'}));
    const list=el('div',{class:'record-list'});
    for(const edge of model.edges.filter(e=>e.source===node.id||e.target===node.id))list.append(button((edge.source===node.id?'→ ':'← ')+(model.nodes.find(n=>n.id===(edge.source===node.id?edge.target:edge.source))?.label||'')+' · '+edge.label,()=>{selectedEdge=edge.id;renderInspector();renderGraph();}));
    if(!list.children.length)list.append(el('p',{class:'subtle',text:'Ei kirjattuja yhteyksiä. Tämä ei osoita tutkimusaukkoa.'}));
    panel.append(list);
    panel.append(button('Lisää yhteys tästä kohteesta',()=>edgeForm(panel,node)));
    panel.append(el('p',{class:'subtle',text:'Tunniste: '+node.id}));
    panel.append(button('Poista kohde ja sen yhteydet',()=>{const next=clone(model);if(next.nodes.length===1){message('Viimeistä kohdetta ei voi poistaa.',true);return;}next.nodes=next.nodes.filter(n=>n.id!==node.id);next.edges=next.edges.filter(e=>e.source!==node.id&&e.target!==node.id);selected=next.nodes[0].id;commit(next);message('Kohde poistettiin yhteyksineen. Toiminnon voi kumota.');},'delete'));
  }
  function edgeForm(panel,node){
    if(panel.querySelector('[data-edge-form]'))return;
    const form=el('form',{'data-edge-form':'true'});form.append(el('h3',{text:'Uusi yhteys'}));
    const target=field(form,'Päätepiste',model.nodes.find(n=>n.id!==node.id)?.id,'select',model.nodes.filter(n=>n.id!==node.id));
    const relation=field(form,'Merkitys','motivates','select',M.relations);
    const status=field(form,'Tiedollinen tila','adaptation','select',M.statuses);
    const rationale=field(form,'Perustelu','');
    form.append(el('div',{class:'actions'},[el('button',{type:'submit',text:'Lisää yhteys',class:'primary'})]));
    form.addEventListener('submit',ev=>{ev.preventDefault();if(!target.value)return;const next=clone(model);next.edges.push({id:newId('edge'),source:node.id,target:target.value,relation:relation.value,status:status.value,label:names[relation.value],rationale:rationale.value,locator:''});commit(next);message('Yhteys lisättiin.');});panel.append(form);form.scrollIntoView({block:'nearest',behavior:'smooth'});
  }
  function newId(prefix){let id;do{id=prefix+'_'+Math.random().toString(36).slice(2,10);}while(model.nodes.some(n=>n.id===id)||model.edges.some(e=>e.id===id));return id;}
  function addNode(){
    const panel=$('inspector');panel.replaceChildren(el('h2',{text:'Lisää tutkimuskohde'}));
    const form=el('form'),kind=field(form,'Kohdetyyppi','concept','select',M.kinds),label=field(form,'Nimi','','input'),description=field(form,'Sisältö tai määritelmä','');
    form.append(el('div',{class:'actions'},[el('button',{type:'submit',text:'Lisää kohde',class:'primary'})]));
    form.addEventListener('submit',ev=>{ev.preventDefault();const id=newId(kind.value),next=clone(model);next.nodes.push({id,kind:kind.value,label:label.value.trim(),description:description.value,boundary:'',status:kind.value==='question'?'hypothesis':'adaptation',access:kind.value==='source'?'not-recorded':'not-applicable',unit:'',basis:'',locator:'',url:'',notes:''});selected=id;selectedEdge=null;commit(next);});panel.append(form);label.focus();
  }
  const ns='http://www.w3.org/2000/svg';
  function svgEl(tag,attrs={},text){const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;}
  function wrap(text,max=25){const lines=[];let line='';for(const word of text.split(/\s+/)){if((line+' '+word).trim().length>max&&line){lines.push(line);line=word;}else line=(line+' '+word).trim();}if(line)lines.push(line);return lines;}
  function renderGraph(){
    const svg=$('graph'),query=$('search').value.trim().toLocaleLowerCase('fi'),status=$('status-filter').value;
    const scoped=focus?related(selected):new Set(model.nodes.map(n=>n.id));
    const nodes=model.nodes.filter(n=>scoped.has(n.id)&&(status==='all'||n.status===status)&&(!query||[n.label,n.description,n.notes,n.locator].some(s=>s.toLocaleLowerCase('fi').includes(query))));
    visibleIds=new Set(nodes.map(n=>n.id));positions=new Map();
    const counts={source:0,concept:0,criterion:0,question:0};
    for(const n of nodes){const column=M.kinds.indexOf(n.kind);positions.set(n.id,n.position||{x:25+column*270,y:35+counts[n.kind]*126});counts[n.kind]++;}
    const height=Math.max(440,...[...positions.values()].map(p=>p.y+130)),width=Math.max(1090,...[...positions.values()].map(p=>p.x+265));
    svg.replaceChildren(svgEl('title',{id:'graph-title'},'Ehdotettu lähde–käsite–kriteeri-kartta. Yhteydet eivät osoita kausaliteettia.'));
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.style.minWidth=width+'px';
    const defs=svgEl('defs'),marker=svgEl('marker',{id:'arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:6,markerHeight:6,orient:'auto-start-reverse'});marker.append(svgEl('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'#91a0b6'}));defs.append(marker);svg.append(defs);
    for(let c=1;c<4;c++)svg.append(svgEl('line',{x1:c*270-3,y1:0,x2:c*270-3,y2:height,stroke:'#edf0f5','stroke-width':1}));
    const edges=model.edges.filter(e=>visibleIds.has(e.source)&&visibleIds.has(e.target));
    for(const e of edges){
      const a=positions.get(e.source),b=positions.get(e.target),x1=a.x+230,y1=a.y+43,x2=b.x,y2=b.y+43;
      const d=x2>=x1?`M${x1},${y1} C${x1+45},${y1} ${x2-45},${y2} ${x2},${y2}`:`M${x1},${y1} C${x1+65},${y1+65} ${x2-65},${y2+65} ${x2},${y2}`;
      const g=svgEl('g',{class:'svg-edge-button'+(selectedEdge===e.id||trace?.edges.includes(e.id)?' edge-selected':'')+(trace&&!trace.edges.includes(e.id)?' edge-dim':''),role:'button',tabindex:0,'aria-label':`${e.label}: ${model.nodes.find(n=>n.id===e.source).label} → ${model.nodes.find(n=>n.id===e.target).label}`});
      g.append(svgEl('path',{d,fill:'none',stroke:'#91a0b6','stroke-width':1.3,'stroke-dasharray':e.status==='hypothesis'?'2 5':e.status==='adaptation'?'6 4':'none','marker-end':'url(#arrow)'}));
      g.append(svgEl('path',{d,fill:'none',stroke:'transparent','stroke-width':18}));
      const label=svgEl('text',{x:(x1+x2)/2,y:(y1+y2)/2-7,'text-anchor':'middle',class:'edge-label'},e.label);g.append(label);
      const activate=()=>{selectedEdge=e.id;renderInspector();renderGraph();};g.addEventListener('click',activate);g.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();activate();}});svg.append(g);
    }
    for(const n of nodes){
      const p=positions.get(n.id),active=n.id===selected&&!selectedEdge;
      const g=svgEl('g',{transform:`translate(${p.x},${p.y})`,class:'node svg-node-button'+(trace&&!trace.nodes.includes(n.id)?' node-dim':''),role:'button',tabindex:0,'aria-label':`${names[n.kind]}: ${n.label}`, 'data-node':n.id});
      g.append(svgEl('rect',{width:230,height:92,rx:9,fill:colors[n.kind],stroke:active?'#315cd7':'#d3dce8','stroke-width':active?2:1}));
      g.append(svgEl('text',{x:14,y:22,class:'node-type'},names[n.kind]+' · '+(n.status==='hypothesis'?'ehdotus':n.status==='adaptation'?'sovellus':'kirjallisuus')));
      const label=svgEl('text',{x:14,y:45,class:'node-label'});
      const lines=wrap(n.label);lines.slice(0,3).forEach((s,i)=>label.append(svgEl('tspan',{x:14,dy:i?16:0},s+(i===2&&lines.length>3?'…':''))));g.append(label);
      g.append(svgEl('title',{},n.label));
      g.addEventListener('click',ev=>{if(g.dataset.dragged==='yes'){delete g.dataset.dragged;return;}choose(n.id);});
      g.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();choose(n.id);}});
      g.addEventListener('pointerdown',ev=>{if(ev.button!==0||ev.pointerType==='touch')return;const point=svg.createSVGPoint();point.x=ev.clientX;point.y=ev.clientY;const start=point.matrixTransform(svg.getScreenCTM().inverse());drag={id:n.id,start,origin:p,moved:false};g.setPointerCapture(ev.pointerId);});
      g.addEventListener('pointermove',ev=>{if(!drag||drag.id!==n.id)return;const point=svg.createSVGPoint();point.x=ev.clientX;point.y=ev.clientY;const pos=point.matrixTransform(svg.getScreenCTM().inverse());if(Math.abs(pos.x-drag.start.x)+Math.abs(pos.y-drag.start.y)>5)drag.moved=true;if(!drag.moved)return;drag.next={x:Math.max(0,Math.min(width-240,drag.origin.x+pos.x-drag.start.x)),y:Math.max(0,Math.min(height-100,drag.origin.y+pos.y-drag.start.y))};g.setAttribute('transform',`translate(${drag.next.x},${drag.next.y})`);});
      g.addEventListener('pointerup',()=>{if(!drag||drag.id!==n.id)return;const old=drag;drag=null;if(old.moved){g.dataset.dragged='yes';const next=clone(model);next.nodes.find(x=>x.id===n.id).position=old.next;commit(next);}});
      g.addEventListener('pointercancel',()=>{drag=null;renderGraph();});svg.append(g);
    }
    if(!nodes.length)svg.append(svgEl('text',{x:35,y:60,fill:'#637188','font-size':14},'Ei hakua tai suodatusta vastaavia kohteita.'));
    $('graph-scope').textContent=focus?'Näytä koko kartta':'Näytä valitun perusteluketjut';
  }
  function table(columns,rows){const t=el('table'),head=el('thead'),hr=el('tr');columns.forEach(s=>hr.append(el('th',{scope:'col',text:s})));head.append(hr);const body=el('tbody');rows.forEach(cells=>{const tr=el('tr');cells.forEach(c=>tr.append(el('td',{},[c instanceof Node?c:String(c)])));body.append(tr);});t.append(head,body);return el('div',{class:'table-wrap'},[t]);}
  function renderMatrix(){
    const p=$('matrix-panel');p.replaceChildren(el('div',{class:'table-intro'},[el('p',{text:'Jokainen rivi yhdistää kriteerin määritelmään, lähdeketjuun ja avoimeen validointitarpeeseen. Yhteyden puuttuminen tarkoittaa, ettei sitä ole kirjattu tähän valikoituun lähtömalliin.'}),button('Vie kohteet CSV',()=>download(M.csv(model),'research-records.csv','text/csv;charset=utf-8'))]));
    const rows=model.nodes.filter(n=>n.kind==='criterion').map(n=>{
      const incoming=model.edges.filter(e=>e.target===n.id),concepts=incoming.map(e=>model.nodes.find(x=>x.id===e.source));
      const sources=[...new Set(concepts.flatMap(c=>model.edges.filter(e=>e.target===c.id).map(e=>e.source)))].map(id=>model.nodes.find(x=>x.id===id)).filter(x=>x?.kind==='source');
      const sourceCell=el('div');sources.forEach(s=>{sourceCell.append(button(s.label,()=>choose(s.id,true)),el('p',{class:'subtle',text:names[s.access]}));});if(!sources.length)sourceCell.textContent='Lähdeketjua täydennettävä';
      return [button(n.label,()=>choose(n.id,true)),concepts.map(c=>c.label).join('; '),sourceCell,n.description,n.boundary,n.unit];
    });
    p.append(table(['Kriteeri','Käsitteellinen yhteys','Lähteet perusteluketjussa','Ehdotettu menettely','Päätelmien rajaus','Arviointiyksikkö'],rows));
  }
  function renderCases(){
    const p=$('cases-panel');p.replaceChildren();const tabs=el('div',{class:'case-tabs','aria-label':'Rakennetut esimerkit'});
    model.cases.forEach(c=>{const b=button(c.title,()=>{caseId=c.id;renderCases();});b.setAttribute('aria-pressed',String(caseId===c.id));tabs.append(b);});p.append(tabs);
    const c=model.cases.find(c=>c.id===caseId)||model.cases[0];if(!c){p.append(el('p',{text:'Ei rakennettuja tapauksia.'}));return;}
    p.append(el('span',{class:'tag hypothesis',text:'Rakennettu analyyttinen esimerkki · Ei tutkimustulos'}),el('h2',{text:c.title}),el('p',{class:'case-task',text:c.task}),table(c.columns,c.rows));
    p.append(el('section',{class:'case-section'},[el('h3',{text:'Mitä erottelu tekee näkyväksi'}),el('p',{text:c.interpretation})]));
    p.append(el('section',{class:'case-section'},[el('h3',{text:'Tulkinnan rajat'}),el('p',{text:c.boundary}),el('p',{class:'subtle',text:c.basis})]));
  }
  function renderQuestions(){const p=$('questions-panel');p.replaceChildren(el('p',{class:'subtle',text:'Propositiot P1–P3 odottavat empiiristä testaamista. Näkymä ei esitä niiden tueksi tuloksia.'}));const list=el('div',{class:'question-list'});for(const n of model.nodes.filter(n=>n.kind==='question'))list.append(el('article',{class:'question-record'},[el('span',{class:'tag '+n.status,text:names[n.status]}),el('h2',{text:n.label}),el('p',{text:n.description}),el('p',{class:'subtle',text:n.boundary}),button('Tutki perusteluketjua',()=>choose(n.id,true))]));p.append(list);}
  function render(){
    const descriptions={graph:['Lähteistä arviointikriteereihin','Tutki, mihin käsitteet ja omat menetelmävalinnat perustuvat.'],matrix:['Arviointimatriisi','Käsitteet, kriteerit, näyttö ja päätelmien rajat samassa näkymässä.'],cases:['Mitä erottelu auttaa huomaamaan?','Kolme rakennettua tapausta havainnollistaa mallin käyttötapaa.'],questions:['Oletukset ja avoimet kysymykset','Säilytä ehdotetut suhteet erillään jo osoitetuista tuloksista.']};
    document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-current',b.dataset.view===view?'page':'false');});
    for(const v of Object.keys(descriptions))$(v+'-panel').hidden=v!==view;
    [$('view-title').textContent,$('view-description').textContent]=descriptions[view];
    $('undo').disabled=!undo.length;
    if(view==='graph'){renderGraph();renderInspector();options($('trace-start'),model.nodes,$('trace-start').value||model.nodes[0].id);options($('trace-end'),model.nodes,$('trace-end').value||model.nodes[model.nodes.length-1].id);}
    if(view==='matrix')renderMatrix();if(view==='cases')renderCases();if(view==='questions')renderQuestions();
  }
  function download(content,name,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=el('a',{href:url,download:name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
  function exportSvg(){
    if(view!=='graph'){message('SVG-vienti koskee graafia. Muita näkymiä voi tulostaa tai tallentaa PDF:nä selaimessa.');return;}
    const svg=$('graph').cloneNode(true);svg.removeAttribute('style');svg.setAttribute('width',svg.viewBox.baseVal.width);svg.setAttribute('height',svg.viewBox.baseVal.height);
    const desc=svgEl('desc',{},'Proposed conceptual mapping. Visible, filtered view. Solid: reported literature; dashed: study adaptation; dotted: hypothesis. No causal inference.');svg.prepend(desc);
    const style=svgEl('style',{},'.node-label{font:500 13px Arial;fill:#203047}.node-type{font:10px Arial;fill:#637188}.edge-label{font:10px Arial;fill:#637188;paint-order:stroke;stroke:white;stroke-width:4px}.node-dim,.edge-dim{opacity:.13}.edge-selected path{stroke:#315cd7;stroke-width:2.5px}');svg.prepend(style);
    const background=svgEl('rect',{width:'100%',height:'100%',fill:'white'});svg.insertBefore(background,svg.querySelector('defs'));
    download('<?xml version="1.0" encoding="UTF-8"?>\n'+new XMLSerializer().serializeToString(svg),'research-map.svg','image/svg+xml;charset=utf-8');
  }
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;location.hash=view;render();}));
  window.addEventListener('hashchange',()=>{const v=location.hash.slice(1);if(['graph','matrix','cases','questions'].includes(v)){view=v;render();}});
  $('undo').addEventListener('click',()=>{if(!undo.length)return;model=undo.pop();if(!model.nodes.some(n=>n.id===selected))selected=model.nodes[0].id;selectedEdge=null;trace=null;persist();render();message('Edellinen muutos kumottiin.');});
  $('search').addEventListener('input',()=>{trace=null;renderGraph();});$('status-filter').addEventListener('change',()=>{trace=null;renderGraph();});
  $('graph-scope').addEventListener('click',()=>{focus=!focus;trace=null;renderGraph();});
  $('fit').addEventListener('click',()=>{$('canvas-wrap').scrollTo({top:0,left:0,behavior:'smooth'});});
  $('reset-layout').addEventListener('click',()=>{const next=clone(model);next.nodes.forEach(n=>delete n.position);commit(next);});
  $('add-node').addEventListener('click',addNode);
  $('trace-run').addEventListener('click',()=>{focus=false;$('search').value='';$('status-filter').value='all';trace=M.path(model,$('trace-start').value,$('trace-end').value);$('trace-result').textContent=trace?trace.nodes.map(id=>model.nodes.find(n=>n.id===id).label).join(' → '):'Valituilla kohteilla ei ole kirjattua suunnattua ketjua. Tämä ei osoita käsitteellisen yhteyden puuttumista.';renderGraph();});
  $('trace-clear').addEventListener('click',()=>{trace=null;renderGraph();$('trace-result').textContent='Ketju seuraa suunnattuja yhteyksiä; se ei vahvista perustelujen pätevyyttä.';});
  $('export-json').addEventListener('click',()=>download(JSON.stringify(model,null,2),'research-workspace.json','application/json'));
  $('export-view').addEventListener('click',()=>$('export-dialog').showModal());$('about').addEventListener('click',()=>$('about-dialog').showModal());
  document.querySelectorAll('[data-export]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.export;if(k==='json')download(JSON.stringify(model,null,2),'research-workspace.json','application/json');if(k==='svg')exportSvg();if(k==='dot'){if(view!=='graph'){message('DOT-vienti koskee graafin viimeksi näkyvissä ollutta rajausta.');}download(M.dot(model,visibleIds),'research-map.dot','text/vnd.graphviz');}if(k==='csv')download(M.csv(model),'research-records.csv','text/csv;charset=utf-8');if(k==='print'){$('export-dialog').close();window.print();}}));
  $('import').addEventListener('click',()=>$('file-input').click());
  $('file-input').addEventListener('change',async ev=>{const file=ev.target.files[0];ev.target.value='';if(!file)return;if(file.size>2*1024*1024){message('Tiedosto ylittää 2 Mt:n tuontirajan.',true);return;}try{const next=M.validate(JSON.parse(await file.text()));commit(next);selected=model.nodes[0].id;selectedEdge=null;focus=false;render();message('Työtila tuotiin ja tarkastettiin. Edellisen työtilan voi palauttaa Kumoa-toiminnolla.');}catch(e){message('Tuonti hylättiin; nykyinen työtila säilyi. '+e.message,true);}});
  const initial=location.hash.slice(1);if(['graph','matrix','cases','questions'].includes(initial))view=initial;
  render();if(importedWarning)message(importedWarning,true);
})();
