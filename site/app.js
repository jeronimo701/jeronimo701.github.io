'use strict';
(() => {
  const $ = s => document.querySelector(s);
  const platforms = {windows:'Windows', android:'Android', scripts:'Tampermonkey', switch:'Nintendo Switch', other:'Другое'};
  const paths = {
    wave:'<path d="M3 10v4m4-8v12m5-16v20m5-16v12m4-8v4"/>',
    tv:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>',
    magnet:'<path d="M4 3h5v9a3 3 0 0 0 6 0V3h5v9a8 8 0 0 1-16 0Zm0 5h5m6 0h5"/>',
    play:'<path d="m9 5 12 7-12 7Z"/><path d="M4 5v14"/>',
    document:'<path d="M14 3H6v18h13V8Zm0 0v5h5M9 12h7M9 16h5"/>',
    scan:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5M7 8v8m3-8v8m4-8v8m3-8v8"/>',
    sliders:'<path d="M5 3v8m0 5v5M12 3v3m0 5v10M19 3v12m0 5v1M2 12h6M9 7h6m1 9h6"/>',
    robot:'<circle cx="12" cy="12" r="9"/><path d="M8 8h8v4H8Zm-1 9h10M12 3v2"/>',
    drive:'<path d="m5 4-3 12v4h20v-4L19 4Zm-3 12h20M6 18h.01M10 18h.01"/>',
    clean:'<path d="m15 3-4 9m-5-2 11 5-4 7-11-5Zm0 7 2-5m2 7 2-5M19 5l2-1m-1 5 2 1"/>',
    phone:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 5h4m-3 14h2"/>',
    spark:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
    message:'<path d="M3 4h18v13H9l-6 4Zm4 5h10M7 13h7"/>',
    folder:'<path d="M3 6h7l2 3h10l-3 11H2V6Zm0 0V3h7l3 3h7v3"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 17h7m-3.5-3.5v7"/>',
    link:'<path d="m9 15 6-6m-8 3-3 3a4 4 0 0 0 6 6l3-3m-2-12 3-3a4 4 0 0 1 6 6l-3 3"/>',
    game:'<path d="M8 5H6a4 4 0 0 0-4 4v6a4 4 0 0 0 4 4h3V5Zm7 0h3a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-3Z"/><circle cx="5.5" cy="10" r="1"/><circle cx="18.5" cy="14" r="1"/>',
    layers:'<path d="m12 2 10 6-10 6L2 8Zm-9 11 9 6 9-6M3 18l9 5 9-5"/>',
    image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><path d="m4 19 5-6 4 4 3-4 5 6"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
    terminal:'<rect x="2" y="3" width="20" height="18" rx="2"/><path d="m6 8 4 4-4 4m7 0h5"/>'
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const url = value => {try {const u=new URL(value);return u.protocol==='https:' && ['github.com','raw.githubusercontent.com'].includes(u.hostname) ? esc(u.href) : '#';} catch{return '#';}};
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.terminal}</svg>`;
  const formatDate = value => new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Moscow'}).format(new Date(value));
  const version = tag => /^(snapshot|release)-/.test(tag) ? tag.replace(/^(snapshot|release)-/,'') : tag.replace(/^android-v/,'Android ').replace(/^v/,'v');
  const size = bytes => bytes >= 1024*1024 ? `${(bytes/1024/1024).toFixed(1)} МБ` : `${Math.max(1,Math.round(bytes/1024))} КБ`;
  let catalogue = null;
  const initial = new URLSearchParams(location.search);
  const state = {query:initial.get('q') || '',filter:initial.get('platform') || 'all',sort:initial.get('sort') || 'curated'};
  if (!['all',...Object.keys(platforms)].includes(state.filter)) state.filter='all';
  if (!['curated','updated','name'].includes(state.sort)) state.sort='curated';
  function syncURL() {
    const params=new URLSearchParams();
    if(state.query) params.set('q',state.query);
    if(state.filter!=='all') params.set('platform',state.filter);
    if(state.sort!=='curated') params.set('sort',state.sort);
    const next=location.pathname+(params.size?'?'+params.toString():'')+location.hash;
    history.replaceState(null,'',next);
  }
  function projectCard(p) {
    const latest=p.latest || p.preview;
    const isPreview=!p.latest && Boolean(p.preview);
    const releaseURL=p.latestUrl || p.preview?.url;
    const binaryAssets=latest?.assets.filter(a => /\.(exe|msi|apk|zip|7z|nro|user\.js)$/i.test(a.name)) || [];
    const release = latest ? `<span class="release-version" title="${esc(latest.tag)}"><i${isPreview?' class="preview-dot"':''}></i>${esc(version(latest.tag))}</span><a class="release-button" href="${url(releaseURL)}" aria-label="${isPreview?'Предварительный':'Последний'} релиз ${esc(p.title)}">${isPreview?'Пререлиз':'Скачать'} <span aria-hidden="true">↗</span></a>` : `<span class="release-version">Пока без готового релиза</span><a class="release-button secondary" href="${url(p.url)}">Исходники ↗</a>`;
    const channels=p.channels.length>1 ? `<div class="card-channels">${p.channels.map(c=>`<a href="${url(c.url)}" aria-label="${esc(p.title)} — выпуск для ${esc(platforms[c.platform])}">${esc(platforms[c.platform])} ↗</a>`).join('')}</div>` : '';
    const files=binaryAssets.length ? `<details class="files-details"><summary>Файлы ${isPreview?'предварительного':'последнего'} выпуска · ${binaryAssets.length}</summary><ul class="asset-list">${binaryAssets.map(a=>`<li><a href="${url(a.url)}"><span class="asset-name">${esc(a.name)}</span><span class="asset-size">${size(a.size)} ↓</span></a></li>`).join('')}</ul></details>` : `<div class="files-details"><span class="source-link" style="margin:0;padding:12px 0;color:var(--muted)">${latest?'Описание и файлы в релизе':'Инструкции — в README'}</span></div>`;
    return `<article class="project-card" data-project="${esc(p.id)}"><div class="card-top"><span class="project-icon ${esc(p.color)}">${icon(p.icon)}</span><div class="card-category">${esc(p.category)}<a class="source-link" href="${url(p.url)}" aria-label="Исходники ${esc(p.title)}">Исходники ↗</a></div></div><h3>${esc(p.title)}</h3><p class="card-description">${esc(p.description)}${p.note?`<span class="note">${esc(p.note)}</span>`:''}</p><div class="platform-badges">${p.platforms.map(x=>`<span>${esc(platforms[x] || x)}</span>`).join('')}${p.fork?'<span class="fork">⑂ Форк</span>':''}${p.archived?'<span>Архив</span>':''}</div><div class="card-release">${release}</div>${channels}${files}</article>`;
  }
  function render() {
    if (!catalogue) return;
    const q=state.query.trim().toLocaleLowerCase('ru-RU');
    let projects=catalogue.projects.filter(p => (state.filter==='all' || (p.collections || p.platforms).includes(state.filter)) && [p.title,p.id,p.description,p.category,p.note,...p.platforms,...p.platforms.map(x=>platforms[x])].join(' ').toLocaleLowerCase('ru-RU').includes(q));
    if(state.sort==='name') projects.sort((a,b)=>a.title.localeCompare(b.title,'ru'));
    if(state.sort==='updated') projects.sort((a,b)=>(b.updated || '').localeCompare(a.updated || ''));
    $('#project-grid').innerHTML=projects.map(projectCard).join('');
    $('#empty-state').hidden=projects.length>0;
    $('#result-count').textContent=`Показано ${projects.length} из ${catalogue.projects.length} проектов`;
    document.querySelectorAll('[data-filter]').forEach(button => {
      const filter=button.dataset.filter;const active=filter===state.filter;
      button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
      button.querySelector('span').textContent=filter==='all'?catalogue.projects.length:catalogue.projects.filter(p=>(p.collections || p.platforms).includes(filter)).length;
    });
  }
  let disposeFeatured=()=>{};
  function renderFeatured() {
    disposeFeatured();
    const recent=catalogue.projects.filter(p=>p.latest && !p.archived).sort((a,b)=>b.latest.date.localeCompare(a.latest.date));
    const defaults=['NeonPlayer-Android','mpv-neon','KomandDok'].map(id=>catalogue.projects.find(p=>p.id===id && p.latest)).filter(Boolean);
    const picks=[...new Map([...recent.slice(0,5),...defaults,...recent].map(p=>[p.id,p])).values()].slice(0,8);
    if(!picks.length) return;
    const region=$('#featured-carousel'),track=$('#featured-track'),dots=$('#carousel-dots');
    const previous=$('#carousel-prev'),next=$('#carousel-next'),play=$('#carousel-play');
    track.innerHTML=picks.map((p,i)=>{
      const separate=p.channels.length>1 && new Set(p.channels.map(c=>c.url)).size>1;
      const downloads=separate?p.channels.map(c=>`<a href="${url(c.url)}">${esc(platforms[c.platform])} ↗</a>`).join(''):`<a href="${url(p.latestUrl)}">Скачать ${esc(version(p.latest.tag))} ↗</a>`;
      return `<article class="feature-slide feature-slide-${esc(p.color)}" role="group" aria-roledescription="слайд" aria-label="${i+1} из ${picks.length}: ${esc(p.title)}" data-featured-project="${esc(p.id)}"><div class="feature-copy"><span class="feature-slide-kicker">${esc(p.platforms.map(x=>platforms[x]).join(' / '))} · ${esc(version(p.latest.tag))}</span><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p><div class="feature-slide-actions">${downloads}<a class="feature-slide-about" href="${url(p.url)}">О проекте ↗</a></div></div><div class="feature-slide-art" aria-hidden="true"><span class="feature-art-ring"></span>${icon(p.icon)}<small>J701 / PROJECTS</small></div></article>`;
    }).join('');
    dots.innerHTML=picks.map((p,i)=>`<button type="button" aria-label="Показать ${esc(p.title)}" aria-controls="featured-track" data-slide="${i}"><span></span></button>`).join('');
    const cards=[...track.children],dotButtons=[...dots.children];
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let index=0,automatic=!reduced.matches,hovering=false,focused=false,inView=true,timer=null;
    const removers=[];
    function listen(target,type,callback,options){target.addEventListener(type,callback,options);removers.push(()=>target.removeEventListener(type,callback,options));}
    function paint(){
      cards.forEach((card,i)=>{card.inert=i!==index;card.setAttribute('aria-hidden',String(i!==index));});
      dotButtons.forEach((button,i)=>{button.classList.toggle('active',i===index);if(i===index)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');});
      $('#carousel-count').textContent=String(index+1).padStart(2,'0')+' / '+String(picks.length).padStart(2,'0');
      play.textContent=automatic?'Ⅱ':'▶';play.setAttribute('aria-pressed',String(automatic));play.setAttribute('aria-label',automatic?'Приостановить автосмену':'Включить автосмену');
      $('#carousel-status').textContent=!automatic?'Автосмена выключена':hovering||focused?'Пауза во время выбора':'Смена каждые 7 секунд · можно листать вручную';
    }
    function schedule(){
      clearTimeout(timer);
      if(automatic && !hovering && !focused && inView && document.visibilityState==='visible' && picks.length>1){
        timer=setTimeout(()=>{go(index+1);},7000);
      }
    }
    function go(value){
      const target=(value+picks.length)%picks.length,wrap=Math.abs(target-index)>1;index=target;
      track.scrollTo({left:cards[index].offsetLeft,behavior:reduced.matches||wrap?'auto':'smooth'});paint();schedule();
    }
    previous.disabled=next.disabled=play.disabled=picks.length<2;
    previous.onclick=()=>go(index-1);next.onclick=()=>go(index+1);play.onclick=()=>{automatic=!automatic;paint();schedule();};
    dotButtons.forEach((button,i)=>{button.onclick=()=>go(i);});
    listen(region,'pointerenter',()=>{hovering=true;paint();schedule();});
    listen(region,'pointerleave',()=>{hovering=false;paint();schedule();});
    listen(region,'focusin',()=>{focused=true;paint();schedule();});
    listen(region,'focusout',()=>{setTimeout(()=>{focused=region.matches(':focus-within');paint();schedule();},0);});
    listen(document,'visibilitychange',schedule);
    listen(track,'scroll',()=>{const width=cards[0].getBoundingClientRect().width;if(!width)return;const value=Math.max(0,Math.min(picks.length-1,Math.round(track.scrollLeft/width)));if(value!==index){index=value;paint();}} ,{passive:true});
    listen(window,'resize',()=>{track.scrollTo({left:cards[index].offsetLeft,behavior:'auto'});});
    listen(reduced,'change',()=>{if(reduced.matches)automatic=false;paint();schedule();});
    let observer;
    if('IntersectionObserver' in window){observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting && entries[0].intersectionRatio>=.2; schedule();},{threshold:.2});observer.observe(region);}
    paint();schedule();
    disposeFeatured=()=>{clearTimeout(timer);observer?.disconnect();removers.forEach(remove=>remove());};
  }
  function renderUpdates() {
    const projects=catalogue.projects.filter(p=>p.latest).sort((a,b)=>b.latest.date.localeCompare(a.latest.date)).slice(0,5);
    $('#updates-list').innerHTML=projects.map((p,index)=>`<a class="update-row" href="${url(p.latestUrl)}"><span class="update-index">${String(index+1).padStart(2,'0')}</span><div><h3>${esc(p.title)}</h3><p>${esc(p.platforms.map(x=>platforms[x]).join(' / '))}</p></div><span class="update-version">${esc(version(p.latest.tag))}</span><time class="update-date" datetime="${esc(p.latest.date)}">${formatDate(p.latest.date)}</time><span class="update-arrow" aria-hidden="true">↗</span></a>`).join('');
  }
  async function load() {
    $('#error-state').hidden=true;
    try {
      const response=await fetch('catalog.json',{cache:'no-cache'});
      if(!response.ok) throw new Error('Catalogue unavailable');
      const data=await response.json();
      if(!Array.isArray(data.projects)) throw new Error('Invalid catalogue');
      catalogue=data;
      $('#project-total').textContent=data.projects.length;
      $('#catalog-total').textContent=String(data.projects.length).padStart(2,'0');
      $('#sync-date').textContent='Данные проверены: '+formatDate(data.generatedAt)+', '+new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}).format(new Date(data.generatedAt))+' МСК';
      render();renderUpdates();renderFeatured();
    } catch(error) {
      $('#error-state').hidden=false;$('#result-count').textContent='Не удалось загрузить каталог';$('#sync-date').textContent='Дата проверки недоступна';
    }
  }
  $('#search').value=state.query;$('#sort').value=state.sort;
  $('#search').addEventListener('input',event => {state.query=event.target.value;render();syncURL();});
  $('#sort').addEventListener('change',event => {state.sort=event.target.value;render();syncURL();});
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click',()=>{state.filter=button.dataset.filter;render();syncURL();}));
  document.querySelectorAll('[data-quick-filter]').forEach(link => link.addEventListener('click',()=>{state.filter=link.dataset.quickFilter;state.query='';$('#search').value='';render();syncURL();}));
  $('#reset-filters').addEventListener('click',()=>{state.query='';state.filter='all';$('#search').value='';render();syncURL();$('#search').focus();});
  $('#retry').addEventListener('click',load);
  document.addEventListener('keydown',event => {
    if(event.key==='/' && !event.ctrlKey && !event.metaKey && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)){event.preventDefault();$('#search').focus();$('#catalog').scrollIntoView({block:'start'});}
    if(event.key==='Escape' && document.activeElement===$('#search')){state.query='';$('#search').value='';render();syncURL();}
  });
  function setTheme(theme){document.documentElement.dataset.theme=theme;$('#theme-toggle').setAttribute('aria-label',theme==='dark'?'Включить светлую тему':'Включить тёмную тему');$('meta[name="theme-color"]').content=theme==='dark'?'#181c18':'#f5f4ef';}
  let savedTheme=null;try{savedTheme=localStorage.getItem('j701-theme');}catch{}
  setTheme(savedTheme==='light'?'light':'dark');
  $('#theme-toggle').addEventListener('click',()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';setTheme(theme);try{localStorage.setItem('j701-theme',theme);}catch{}});
  load();
})();
