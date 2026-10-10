/* TrialStats Mind Map – zero-dependency SVG editor.
   Browser drafts are LOCAL ONLY. Never put private clinical data into this public-site editor. */
(() => {
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const STORAGE='trialstats.public-mindmap.draft.v1';
  const $=id=>document.getElementById(id);
  const svg=$('mapCanvas'), edges=$('links'), graphics=$('nodes');
  const W=282,H=65,ROOT_W=238,CAT_W=268;
  let map, questions=[], byQ=new Map(), selected='root', search='', view={x:-30,y:-10,w:1600,h:1050};
  let undos=[], redos=[], pointer=null, dirty=false;
  const clone=x=>JSON.parse(JSON.stringify(x));
  const node=id=>map.nodes.find(n=>n.id===id);
  const children=id=>map.nodes.filter(n=>n.parent===id);
  const width=n=>n.parent===null?ROOT_W:node(n.parent)?.parent===null?CAT_W:W;
  const level=n=>{let d=0,p=n;while(p?.parent && d<50){d++;p=node(p.parent);}return d;};
  const canEdit=el=>el && (el.matches('input,textarea,select')||el.isContentEditable);
  const svgEl=(name,attrs={},text)=>{const e=document.createElementNS(NS,name);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));if(text!==undefined)e.textContent=text;return e;};
  const html=(tag,attrs={},content)=>{const e=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>{if(k==='class')e.className=v;else if(k==='text')e.textContent=v;else e.setAttribute(k,v);});if(content!==undefined)e.textContent=content;return e;};
  const save=()=>{dirty=true;try{localStorage.setItem(STORAGE,JSON.stringify(map));$('saveState').textContent='已保存在本机 · 未发布';}catch(e){$('saveState').textContent='⚠ 本地保存失败：请导出备份';}};
  const snapshot=()=>{undos.push(JSON.stringify(map));if(undos.length>60)undos.shift();redos=[];toolbar();};
  const toolbar=()=>{$('undo').disabled=!undos.length;$('redo').disabled=!redos.length;};
  function validate(input){
    if(!input||input.version!==1||!Array.isArray(input.nodes)||input.nodes.length<1||input.nodes.length>1500)throw Error('仅支持版本1的导图，节点数范围为1–1500');
    let ids=new Set(),roots=0;
    input.nodes.forEach(n=>{if(typeof n.id!=='string'||n.id.length>80||ids.has(n.id))throw Error('发现无效或重复节点编号');ids.add(n.id);if(n.parent===null)roots++;
      if(typeof n.title!=='string'||!n.title.trim()||n.title.length>120)throw Error('节点名称不能为空且不超过120字符');
      if(!Number.isFinite(n.x)||!Number.isFinite(n.y)||Math.abs(n.x)>1e6||Math.abs(n.y)>1e6)throw Error('节点坐标不合法');
      if(!Array.isArray(n.questionIds)||n.questionIds.length>300||n.questionIds.some(q=>typeof q!=='string'||q.length>50))throw Error('关联问题编号不合法');
    });
    if(roots!==1)throw Error('导图必须有且仅有一个根节点');
    const root=input.nodes.find(n=>n.parent===null).id, lookup=new Map(input.nodes.map(n=>[n.id,n]));
    for(const n of input.nodes){const seen=new Set();let p=n;while(p.parent!==null){if(seen.has(p.id))throw Error('节点中存在循环引用');seen.add(p.id);if(!lookup.has(p.parent))throw Error('缺失父节点：'+p.parent);p=lookup.get(p.parent);}if(p.id!==root)throw Error('所有节点必须归属于同一根节点');}
    return clone({version:1,title:String(input.title||'Clinical Trial Knowledge Map').slice(0,140),nodes:input.nodes.map(n=>({id:n.id,parent:n.parent,title:n.title,x:n.x,y:n.y,collapsed:!!n.collapsed,questionIds:[...new Set(n.questionIds)]}))});
  }
  const descendants=(id)=>{let found=[id];for(let i=0;i<found.length;i++)for(const kid of children(found[i]))found.push(kid.id);return found;};
  const shown=()=>{let visible=[];const walk=id=>{const n=node(id);if(!n)return;visible.push(n);if(!n.collapsed)children(id).forEach(k=>walk(k.id));};walk(map.nodes.find(n=>n.parent===null).id);return visible;};
  const vbox=()=>svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);
  function fit(){const ns=shown(),x1=Math.min(...ns.map(n=>n.x)),x2=Math.max(...ns.map(n=>n.x+width(n))),y1=Math.min(...ns.map(n=>n.y)),y2=Math.max(...ns.map(n=>n.y+H));
    const cw=Math.max(300,svg.clientWidth),ch=Math.max(250,svg.clientHeight),aspect=cw/ch,pad=110;
    let w=(x2-x1)+pad*2,h=(y2-y1)+pad*2;if(w/h<aspect)w=h*aspect;else h=w/aspect;
    view={x:(x1+x2-w)/2,y:(y1+y2-h)/2,w,h};vbox();
  }
  function toWorld(evt){const mat=svg.getScreenCTM();if(!mat)return{x:0,y:0};const p=new DOMPoint(evt.clientX,evt.clientY).matrixTransform(mat.inverse());return{x:p.x,y:p.y};}
  function zoom(f,center){const x=center?.x??view.x+view.w/2,y=center?.y??view.y+view.h/2;let w=Math.max(260,Math.min(12000,view.w*f)),h=w*view.h/view.w;
    view={x:x-(x-view.x)*(w/view.w),y:y-(y-view.y)*(h/view.h),w,h};vbox();}
  function draw(){
    edges.replaceChildren();graphics.replaceChildren();let vis=shown(),vs=new Set(vis.map(n=>n.id));
    for(const n of vis){if(!n.parent||!vs.has(n.parent))continue;const p=node(n.parent),start=p.x+width(p),end=n.x,sy=p.y+H/2,ey=n.y+H/2,mid=Math.max(45,Math.abs(end-start)*.46);
      edges.append(svgEl('path',{class:'edge',d:`M ${start} ${sy} C ${start+mid} ${sy},${end-mid} ${ey},${end} ${ey}`}));}
    for(const n of vis){const lv=level(n),nw=width(n),g=svgEl('g',{class:`map-node level-${Math.min(lv,2)}${n.id===selected?' selected':''}`,transform:`translate(${n.x},${n.y})`,'data-id':n.id,role:'button',tabindex:'-1','aria-label':n.title});
      g.append(svgEl('rect',{class:'node-bg',x:0,y:0,width:nw,height:H,rx:lv===0?15:11}));
      let label=n.title,lines=[];const limit=lv===0?12:lv===1?15:18;while(label.length>limit&&lines.length<2){lines.push(label.slice(0,limit));label=label.slice(limit);}if(label)lines.push(label);if(lines.length>2){lines[1]=lines[1].slice(0,limit-1)+'…';lines=lines.slice(0,2);}
      const txt=svgEl('text',{class:'node-label',x:17,y:lines.length>1?25:30});lines.forEach((l,i)=>txt.append(svgEl('tspan',{x:17,dy:i?21:0},l)));g.append(txt);
      let num=n.questionIds.length;if(num){const metric=svgEl('text',{class:'node-metric',x:nw-14,y:H-12,'text-anchor':'end'},`${num} 问`);g.append(metric);}
      if(children(n.id).length){const bx=nw-2,by=H/2;g.append(svgEl('circle',{class:'fold-circle',cx:bx,cy:by,r:12,'data-fold':n.id}));g.append(svgEl('text',{class:'fold-sign',x:bx,y:by+5,'text-anchor':'middle'},n.collapsed?'+':'−'));}
      graphics.append(g);
    }
    $('nodeCount').textContent=map.nodes.length+' 节点';$('branchStat').textContent=map.nodes.length;$('linkStat').textContent=map.nodes.reduce((s,n)=>s+n.questionIds.length,0);toolbar();
  }
  function tree(){const holder=$('treeList');holder.replaceChildren();const matches=n=>{const s=search.toLowerCase();return n.title.toLowerCase().includes(s)||n.questionIds.some(id=>{const q=byQ.get(id);return id.toLowerCase().includes(s)||(q&&JSON.stringify([q.question,q.short,q.tags]).toLowerCase().includes(s));});};
    const display=new Set();if(search){map.nodes.filter(matches).forEach(n=>{let p=n;while(p){display.add(p.id);p=p.parent?node(p.parent):null;}});}else map.nodes.forEach(n=>display.add(n.id));
    function add(id,d){const n=node(id);if(!n||!display.has(id))return;const item=html('div',{class:'tree-row'+(selected===id?' selected':''),role:'treeitem',style:`padding-left:${Math.min(d,6)*13+4}px`});
      const b=html('span',{class:'expander'},children(id).length?(n.collapsed?'+':'⌄'):'·');b.onclick=e=>{e.stopPropagation();if(children(id).length)toggle(id);};item.append(b,html('span',{class:'tree-dot'}),html('span',{class:'tree-name',title:n.title},n.title));
      if(n.questionIds.length)item.append(html('span',{class:'tree-qty'},String(n.questionIds.length)));
      item.onclick=()=>{select(id);focusOnNode(n)};holder.append(item);
      if(search||!n.collapsed)children(id).forEach(k=>add(k.id,d+1));}
    add(map.nodes.find(n=>n.parent===null).id,0);
    if(!holder.children.length)holder.append(html('p',{class:'empty-qa'},'没有找到匹配节点'));
  }
  function focusOnNode(n){let x=n.x+width(n)/2,y=n.y+H/2;view.x=x-view.w/2;view.y=y-view.h/2;vbox();}
  function select(id){if(!node(id))return;selected=id;draw();tree();inspector();}
  function toggle(id){snapshot();node(id).collapsed=!node(id).collapsed;save();draw();tree();}
  function pathSafe(id,pid){return !descendants(id).includes(pid);}
  function newNode(parent){const p=node(parent);if(!p)return;let count=children(parent).length;const id='node-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6);
    snapshot();p.collapsed=false;const n={id,parent,title:'新知识点',x:p.x+width(p)+102,y:p.y+count*83,collapsed:false,questionIds:[]};map.nodes.push(n);save();select(id);focusOnNode(n);}
  function removeNode(){const n=node(selected);if(!n?.parent){alert('中心主题不能删除');return;}let ids=descendants(selected);if(!confirm(`确定删除「${n.title}」及其 ${ids.length-1} 个子节点吗？此操作不会删除原有公开问答。`))return;
    snapshot();let gone=new Set(ids);map.nodes=map.nodes.filter(x=>!gone.has(x.id));selected=n.parent;save();draw();tree();inspector();}
  function autoLayout(){let current=0;const root=map.nodes.find(n=>n.parent===null);
    function arrange(id,depth){const n=node(id);n.x=70+depth*366;const kids=children(id);if(kids.length){const ys=kids.map(k=>arrange(k.id,depth+1));n.y=(Math.min(...ys)+Math.max(...ys))/2;}else{n.y=current;current+=112;}return n.y;}
    arrange(root.id,0);if(map.nodes.length===1)root.y=150;}
  function moveParent(n,val){if(!node(val)||val===n.id||!pathSafe(n.id,val)){alert('不能把节点移动到自身或其后代节点之下');return;}snapshot();n.parent=val;save();draw();tree();inspector();}
  function addInspectorBtn(parent,label,onClick,cls=''){const b=html('button',{type:'button',class:cls},label);b.addEventListener('click',onClick);parent.append(b);return b;}
  function inspector(){const area=$('inspector');area.replaceChildren();const n=node(selected);if(!n){area.append(html('p',{class:'empty-inspector'},'点击一个节点开始编辑'));return;}
    area.append(html('div',{class:'eyebrow'},'SELECTED NODE · '+n.id));
    let field=html('div',{class:'field'});field.append(html('label',{for:'nodeTitle'},'节点名称'));const input=html('input',{id:'nodeTitle',maxlength:'120',value:n.title});input.addEventListener('focus',snapshot,{once:true});input.addEventListener('input',()=>{n.title=input.value||'未命名节点';save();draw();tree();});field.append(input);area.append(field);
    let par=html('div',{class:'field'});par.append(html('label',{for:'nodeParent'},'所属分支'));if(n.parent===null){par.append(html('p',{class:'empty-qa'},'导图中心主题'));}else{const sel=html('select',{id:'nodeParent'});for(const option of map.nodes){if(option.id===n.id||descendants(n.id).includes(option.id))continue;const opt=html('option',{value:option.id},option.title);if(option.id===n.parent)opt.selected=true;sel.append(opt);}sel.onchange=()=>moveParent(n,sel.value);par.append(sel);}area.append(par);
    const actions=html('div',{class:'inspect-actions'});addInspectorBtn(actions,'＋ 子节点',()=>newNode(n.id));if(n.parent)addInspectorBtn(actions,'＋ 同级',()=>newNode(n.parent));
    if(children(n.id).length)addInspectorBtn(actions,n.collapsed?'⊞ 展开':'⊟ 折叠',()=>{toggle(n.id);inspector();});if(n.parent)addInspectorBtn(actions,'✕ 删除',removeNode,'delete');area.append(actions);
    const attached=html('div',{class:'qa-heading'});attached.append(html('strong',{},'关联的临床试验问答'),html('small',{},n.questionIds.length+' 条'));area.append(attached);
    if(!n.questionIds.length)area.append(html('div',{class:'empty-qa'},'尚未关联问题。可在下方搜索 Q001–Q033 并添加。'));
    for(const id of n.questionIds){const q=byQ.get(id),d=html('details',{class:'question-card'}),s=html('summary',{},`${id} · ${q?.question||'关联问答未发布'}`);d.append(s);
      if(q){let content=html('div',{class:'q-body'});for(const [title,value] of [['简明回答',q.short],['进一步解释',q.detail],['注意',q.pitfall]]){content.append(html('strong',{},title),html('p',{},value));}
        for(const ref of q.sources||[]){if(typeof ref.url==='string'&&/^https?:\/\//i.test(ref.url)){const a=html('a',{href:ref.url,target:'_blank',rel:'noopener noreferrer'},'↗ '+ref.name);content.append(a);}}
        d.append(content);}area.append(d);const remove=addInspectorBtn(area,'解除关联 '+id,()=>{snapshot();n.questionIds=n.questionIds.filter(x=>x!==id);save();draw();tree();inspector();},'remove-q');remove.setAttribute('aria-label','解除关联 '+id);}
    const heading=html('div',{class:'qa-heading'});heading.append(html('strong',{},'添加已有问题'));area.append(heading);
    const wrap=html('div',{class:'attach-tools'});const qSearch=html('input',{type:'search',placeholder:'搜索 Q 编号 / PZ / MMRM…','aria-label':'搜索可关联的问答'});wrap.append(qSearch);area.append(wrap);
    const matches=html('div',{class:'attach-candidates'});area.append(matches);
    function fill(){matches.replaceChildren();let s=qSearch.value.trim().toLowerCase();let filtered=questions.filter(q=>!n.questionIds.includes(q.id)&&(!s||JSON.stringify([q.id,q.question,q.short,q.tags]).toLowerCase().includes(s))).slice(0,14);
      filtered.forEach(q=>{let div=html('div',{class:'candidate'});div.append(html('span',{},`${q.id} · ${q.question}`));addInspectorBtn(div,'＋',()=>{snapshot();n.questionIds.push(q.id);save();draw();tree();inspector();});matches.append(div);});if(!filtered.length)matches.append(html('div',{class:'empty-qa',style:'padding:10px'},'没有匹配的待关联问题'));}
    qSearch.oninput=fill;fill();area.append(html('p',{class:'empty-qa'},'问题正文来自公开 questions/questions.json。新增正式问答仍需在该文件审核发布。'));
  }
  function actionUndo(isUndo){const from=isUndo?undos:redos,to=isUndo?redos:undos;if(!from.length)return;to.push(JSON.stringify(map));map=validate(JSON.parse(from.pop()));if(!node(selected))selected=map.nodes[0].id;save();draw();tree();inspector();}
  function exportMap(){const blob=new Blob([JSON.stringify(map,null,2)+'\n'],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=html('a',{href:url,download:'trialstats-mindmap.json'});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function importMap(file){if(!file||file.size>1500000){alert('文件超过1.5 MB或文件不可用');return;}try{let loaded=validate(JSON.parse(await file.text()));if(!confirm(`即将导入 ${loaded.nodes.length} 个节点，并覆盖当前本地导图。确定继续？`))return;snapshot();map=loaded;selected=map.nodes.find(n=>n.parent===null).id;save();draw();tree();inspector();fit();}catch(err){alert('导入失败：'+err.message);}}
  function eventHandlers(){
    $('nodeSearch').oninput=e=>{search=e.target.value.trim();tree();};
    $('undo').onclick=()=>actionUndo(true);$('redo').onclick=()=>actionUndo(false);$('fit').onclick=fit;
    $('reflow').onclick=()=>{if(confirm('自动排版将覆盖所有节点的当前拖拽位置。确定继续？')){snapshot();autoLayout();save();draw();tree();fit();}};
    $('zoomIn').onclick=()=>zoom(.8);$('zoomOut').onclick=()=>zoom(1.25);
    $('newRootBranch').onclick=()=>newNode(map.nodes.find(n=>n.parent===null).id);
    $('expandAll').onclick=()=>{snapshot();map.nodes.forEach(n=>n.collapsed=false);save();draw();tree();};
    $('collapseAll').onclick=()=>{snapshot();map.nodes.forEach(n=>n.collapsed=n.parent!==null?true:false);save();draw();tree();};
    $('exportMap').onclick=exportMap;$('importMap').onclick=()=>$('mapFile').click();$('mapFile').onchange=e=>{importMap(e.target.files[0]);e.target.value='';};
    $('resetMap').onclick=async()=>{if(!confirm('将清除当前浏览器内的导图草稿，恢复仓库已发布版本。请先导出需要保留的修改。'))return;try{const fresh=validate(await (await fetch('map.json',{cache:'no-store'})).json());snapshot();map=fresh;selected=map.nodes[0].id;localStorage.removeItem(STORAGE);dirty=false;$('saveState').textContent='已恢复公开版';draw();tree();inspector();fit();}catch(e){alert('无法恢复：'+e.message);}};
    $('dismissBanner').onclick=e=>e.currentTarget.parentElement.remove();
    svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;const fold=e.target.closest('[data-fold]');if(fold){toggle(fold.getAttribute('data-fold'));inspector();return;}
      const g=e.target.closest('g[data-id]'),p=toWorld(e);pointer={type:g?'node':'pan',id:g?.getAttribute('data-id'),start:p,last:p,lastScreen:{x:e.clientX,y:e.clientY},hasMoved:false};if(g){select(pointer.id);}try{svg.setPointerCapture(e.pointerId);}catch(_){}e.preventDefault();});
    svg.addEventListener('pointermove',e=>{if(!pointer)return;let p=toWorld(e),dx=p.x-pointer.last.x,dy=p.y-pointer.last.y;if(Math.hypot(p.x-pointer.start.x,p.y-pointer.start.y)>5){if(!pointer.hasMoved&&pointer.type==='node')snapshot();pointer.hasMoved=true;}
      if(pointer.hasMoved){if(pointer.type==='node'){const ids=new Set(descendants(pointer.id));map.nodes.filter(n=>ids.has(n.id)).forEach(n=>{n.x+=dx;n.y+=dy;});draw();}else{const rect=svg.getBoundingClientRect();view.x-=(e.clientX-pointer.lastScreen.x)*view.w/Math.max(rect.width,1);view.y-=(e.clientY-pointer.lastScreen.y)*view.h/Math.max(rect.height,1);vbox();}}pointer.last=p;pointer.lastScreen={x:e.clientX,y:e.clientY};});
    const end=()=>{if(pointer?.type==='node'&&pointer.hasMoved){save();tree();}pointer=null;};svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);
    svg.addEventListener('dblclick',e=>{const g=e.target.closest('g[data-id]');if(g&&children(g.getAttribute('data-id')).length){toggle(g.getAttribute('data-id'));inspector();}});
    svg.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY>0?1.12:.89,toWorld(e));},{passive:false});
    document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();actionUndo(true);return;}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();actionUndo(false);return;}if(canEdit(document.activeElement))return;
      if(e.key==='Tab'){e.preventDefault();newNode(selected);}else if(e.key==='Enter'&&node(selected)?.parent){e.preventDefault();newNode(node(selected).parent);}else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removeNode();}});
    window.addEventListener('resize',()=>vbox());
  }
  async function init(){try{const [a,b]=await Promise.all([fetch('map.json'),fetch('../questions/questions.json')]);if(!a.ok||!b.ok)throw Error('无法加载导图或问答数据。请通过网站链接或本地 HTTP 服务器打开。');
      const publicMap=validate(await a.json());questions=await b.json();if(!Array.isArray(questions))throw Error('问答文件格式错误');byQ=new Map(questions.map(q=>[q.id,q]));
      let draft=null;try{draft=JSON.parse(localStorage.getItem(STORAGE));}catch(_){localStorage.removeItem(STORAGE);}if(draft){try{map=validate(draft);dirty=true;}catch(_){map=publicMap;}}else map=publicMap;
      selected=map.nodes.find(n=>n.parent===null).id;eventHandlers();draw();tree();inspector();requestAnimationFrame(fit);$('saveState').textContent=dirty?'已恢复本机草稿 · 未发布':'已加载网站公开版';
    }catch(e){$('inspector').replaceChildren(html('div',{class:'error'},e.message));$('saveState').textContent='载入失败';console.error(e);}}
  init();
})();
