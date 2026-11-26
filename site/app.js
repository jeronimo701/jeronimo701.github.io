'use strict';
(() => {
  const $ = s => document.querySelector(s);
  const platforms = {windows:'Windows', android:'Android', scripts:'Tampermonkey', switch:'Nintendo Switch', other:'Другое'};
  const paths = {
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
      render();renderUpdates();
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
