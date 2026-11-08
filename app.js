'use strict';
// Both rendering and motion start only after the editable JSON is validated.
function initializePortfolio(){
function imageDimensions(image,photo){
  if(photo.width&&photo.height){image.width=photo.width;image.height=photo.height}
  else{image.removeAttribute('width');image.removeAttribute('height')}
}
(() => {
  const projects=(window.PORTFOLIO||[]).filter(project=>project.photos?.length>0);
  const grid=document.querySelector('#project-grid');
  const heroes=window.PORTFOLIO_HERO||[];
  document.querySelectorAll('.hero-picture').forEach((anchor,index)=>{
    const reference=heroes[index];
    const project=reference&&projects.find(p=>p.id===reference.seriesId);
    const photo=project&&project.photos.find(p=>p.id===reference.photoId);
    anchor.hidden=!photo;
    if(!photo)return;
    anchor.href='#series/'+encodeURIComponent(project.id);
    anchor.setAttribute('aria-label',`Открыть серию «${project.title}»`);
    const img=anchor.querySelector('img');
    img.src=photo.src;img.alt=photo.alt;imageDimensions(img,photo);
    anchor.querySelector('.photo-caption span').textContent=project.title;
    anchor.querySelector('.photo-caption span:last-child').textContent=project.category;
  });
  for(const project of projects){
    const cover=project.photos.find(photo=>photo.id===project.cover);
    const card=document.createElement('a');
    card.className='project-card';
    card.href='#series/'+encodeURIComponent(project.id);
    card.dataset.category=project.category;
    card.dataset.project=project.id;
    card.setAttribute('aria-label',`Открыть серию «${project.title}», ${project.photos.length} фотографий`);
    const frame=document.createElement('div');frame.className='project-photo';
    const thumbnail=document.createElement('img');
    thumbnail.src=cover.thumb;imageDimensions(thumbnail,cover);
    thumbnail.loading='lazy';thumbnail.decoding='async';thumbnail.alt=cover.alt;
    const arrow=document.createElement('span');arrow.className='project-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent='↗';
    frame.append(thumbnail,arrow);
    const info=document.createElement('div');info.className='project-info';
    const labels=document.createElement('div');
    const title=document.createElement('h3');title.textContent=project.title;
    const category=document.createElement('p');category.textContent=project.category;
    labels.append(title,category);
    const count=document.createElement('span');count.className='project-count';count.textContent=`${project.photos.length} фото`;
    info.append(labels,count);card.append(frame,info);
    grid.append(card);
  }
  // An editorial selection from saved collections, not a second set of assets.
  const collage=document.querySelector('#collage');
  const board=document.querySelector('#collage-board');
  if(collage&&board){
    const preferred=['character-61','white-37','amber-12','outside-19','liza-46','light-124'];
    const available=projects.flatMap(project=>project.photos.map(photo=>({project,photo})));
    const selected=[];
    const used=new Set();
    function addPhoto(entry){
      if(!entry||used.has(entry.photo.src)||selected.length>=6)return;
      used.add(entry.photo.src);selected.push(entry);
    }
    for(const id of preferred)addPhoto(available.find(entry=>entry.photo.id===id));
    for(const entry of available.filter(entry=>entry.photo.id!==entry.project.cover))addPhoto(entry);
    for(const entry of available)addPhoto(entry);
    for(const {project,photo} of selected){
      const anchor=document.createElement('a');anchor.className='collage-photo';
      anchor.href='#series/'+encodeURIComponent(project.id);
      anchor.setAttribute('aria-label',`Открыть серию «${project.title}»`);
      const img=document.createElement('img');img.src=photo.src;img.alt=photo.alt;
      imageDimensions(img,photo);img.loading='lazy';img.decoding='async';
      const caption=document.createElement('span');caption.className='collage-caption';caption.textContent=project.title;
      const arrow=document.createElement('span');arrow.setAttribute('aria-hidden','true');arrow.textContent=' ↗';caption.append(arrow);
      anchor.append(img,caption);board.append(anchor);
    }
    board.classList.toggle('collage-compact',selected.length<6);
    collage.hidden=selected.length===0;
  }
  for(const button of document.querySelectorAll('.filter')){
    const count=button.dataset.filter==='Все'?projects.length:projects.filter(p=>p.category===button.dataset.filter).length;
    button.querySelector('span').textContent=String(count);
    button.addEventListener('click',()=>{
      const category=button.dataset.filter;
      for(const tab of document.querySelectorAll('.filter')){
        const active=tab===button;
        tab.classList.toggle('active',active);
        tab.setAttribute('aria-pressed',String(active));
      }
      let count=0;
      for(const card of grid.children){
        card.hidden=category!=='Все'&&card.dataset.category!==category;
        if(!card.hidden)count++;
      }
      grid.classList.toggle('filtered',category!=='Все');
      document.querySelector('#filter-status').textContent=`Показано серий: ${count}`;
    });
  }
  const series=document.querySelector('#series-dialog');
  const viewer=document.querySelector('#viewer');
  const seriesGrid=document.querySelector('#series-grid');
  const image=document.querySelector('#viewer-image');
  const error=document.querySelector('.image-error');
  const prev=document.querySelector('.viewer-prev');
  const next=document.querySelector('.viewer-next');
  let current=null;
  let photoIndex=0;
  let generation=0;
  let returnFocus=null;

  function closeViewer(){
    generation++;
    if(viewer.open)viewer.close();
  }
  function closeSeries(){
    closeViewer();
    if(series.open)series.close();
    document.body.classList.remove('locked');
    if(location.hash.startsWith('#series/'))history.replaceState(null,'','#portfolio');
    returnFocus?.focus({preventScroll:true});
  }
  function showPhoto(index){
    if(!current||!current.photos.length)return;
    photoIndex=(index+current.photos.length)%current.photos.length;
    const photo=current.photos[photoIndex];
    const token=++generation;
    image.classList.add('loading');
    error.hidden=true;
    image.hidden=false;
    image.src=photo.src;
    image.alt=photo.alt;
    document.querySelector('#viewer-title').textContent=current.title;
    document.querySelector('#viewer-count').textContent=`${photoIndex+1} / ${current.photos.length}`;
    prev.hidden=next.hidden=current.photos.length<2;
    if(!viewer.open)viewer.showModal();
    image.decode().then(()=>{
      if(token===generation){
        image.classList.remove('loading');
        image.dispatchEvent(new CustomEvent('portfolio:photo-ready',{bubbles:true}));
      }
    }).catch(()=>{
      if(token!==generation)return;
      image.hidden=true;error.hidden=false;
    });
  }
  function showSeries(project){
    if(!series.open)returnFocus=document.activeElement;
    current=project;
    document.querySelector('#series-title').textContent=project.title;
    document.querySelector('#series-category').textContent=project.category;
    document.querySelector('#series-note').textContent=project.note;
    document.querySelector('#series-total').textContent=`Избранное: ${project.photos.length} фото`;
    seriesGrid.replaceChildren();
    project.photos.forEach((photo,index)=>{
      const button=document.createElement('button');
      button.className='series-photo';
      button.setAttribute('aria-label',`Открыть фотографию ${index+1} из ${project.photos.length}`);
      const thumbnail=document.createElement('img');
      thumbnail.src=photo.thumb;thumbnail.alt=photo.alt;
      imageDimensions(thumbnail,photo);
      thumbnail.loading=index<3?'eager':'lazy';thumbnail.decoding='async';
      button.append(thumbnail);
      button.addEventListener('click',()=>showPhoto(index));
      seriesGrid.append(button);
    });
    if(!series.open)series.showModal();
    document.body.classList.add('locked');
    series.scrollTo({top:0,behavior:'instant'});
    document.querySelector('#close-series').focus({preventScroll:true});
  }
  function route(){
    const match=location.hash.match(/^#series\/([a-z0-9-]+)$/);
    const project=match&&projects.find(item=>item.id===match[1]);
    if(project)showSeries(project);
    else if(series.open)closeSeries();
  }
  function nextSeries(){
    const index=projects.indexOf(current);
    location.hash='series/'+projects[(index+1)%projects.length].id;
  }
  document.querySelector('#close-series').addEventListener('click',closeSeries);
  document.querySelector('#series-home').addEventListener('click',closeSeries);
  document.querySelector('#close-viewer').addEventListener('click',closeViewer);
  document.querySelector('#next-series').addEventListener('click',nextSeries);
  document.querySelector('#bottom-next').addEventListener('click',nextSeries);
  series.addEventListener('cancel',event=>{event.preventDefault();closeSeries()});
  viewer.addEventListener('cancel',event=>{event.preventDefault();closeViewer()});
  prev.addEventListener('click',()=>showPhoto(photoIndex-1));
  next.addEventListener('click',()=>showPhoto(photoIndex+1));
  viewer.addEventListener('keydown',event=>{
    if(event.key==='ArrowRight'){event.preventDefault();showPhoto(photoIndex+1)}
    if(event.key==='ArrowLeft'){event.preventDefault();showPhoto(photoIndex-1)}
  });
  let touch=null;
  const stage=document.querySelector('.viewer-image-area');
  stage.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse')return;
    touch={x:event.clientX,y:event.clientY};
  });
  stage.addEventListener('pointerup',event=>{
    if(!touch)return;
    const dx=event.clientX-touch.x,dy=event.clientY-touch.y;
    touch=null;
    if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4)showPhoto(photoIndex+(dx<0?1:-1));
  });
  stage.addEventListener('pointercancel',()=>{touch=null});
  window.addEventListener('hashchange',route);
  route();
})();

// Progressive enhancement: native scrolling and fully readable static fallback.
(() => {
  const root=document.documentElement;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const pending=new Set();
  const animations=new Set();
  const activeAnimations=new WeakMap();
  const heroImages=[...document.querySelectorAll('.hero .photo-frame img')];
  const parallax=window.matchMedia('(min-width:701px) and (pointer:fine)');
  let frame=0;
  let observer=null;
  const progress=document.createElement('div');
  progress.className='scroll-progress';progress.setAttribute('aria-hidden','true');
  document.body.append(progress);
  function play(element,keyframes,options={}){
    if(reduced.matches||!element?.animate)return;
    activeAnimations.get(element)?.cancel();
    const animation=element.animate(keyframes,{duration:650,easing:'cubic-bezier(.16,1,.3,1)',...options});
    activeAnimations.set(element,animation);
    animations.add(animation);
    animation.finished.catch(()=>{}).finally(()=>animations.delete(animation));
    return animation;
  }
  function opening(){
    play(document.querySelector('.header'),[{opacity:0,transform:'translateY(-10px)'},{opacity:1,transform:'translateY(0)'}],{duration:500});
    play(document.querySelector('.intro-title h1'),[{opacity:0,transform:'translateY(34px)'},{opacity:1,transform:'translateY(0)'}],{duration:900,delay:60});
    play(document.querySelector('.handwritten'),[{opacity:0,transform:'rotate(-4deg) translateX(-24px)'},{opacity:1,transform:'rotate(-4deg) translateX(0)'}],{duration:700,delay:220});
    play(document.querySelector('.intro-note'),[{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],{duration:650,delay:180});
    document.querySelectorAll('.hero .photo-frame').forEach((element,index)=>play(element,[{opacity:0,clipPath:'inset(9% 0 91% 0)'},{opacity:1,clipPath:'inset(0 0 0 0)'}],{duration:950,delay:80+index*110}));
  }
  function reveal(element){
    if(element.hidden||!element.getClientRects().length)return;
    element.classList.add('is-revealed');pending.delete(element);observer?.unobserve(element);
  }
  function update(){
    frame=0;
    const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);
    progress.style.transform=`scaleX(${Math.min(1,Math.max(0,scrollY/max))})`;
    for(const image of heroImages){
      const box=image.parentElement.getBoundingClientRect();
      const drift=!reduced.matches&&parallax.matches?Math.max(-14,Math.min(14,((innerHeight/2)-(box.top+box.height/2))/innerHeight*28)):0;
      image.style.setProperty('--parallax-y',`${drift.toFixed(2)}px`);
    }
    for(const element of pending){
      const box=element.getBoundingClientRect();
      if(box.height>0&&box.top<innerHeight-24&&box.bottom>0)reveal(element);
    }
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(update)}
  function register(elements){
    elements.forEach((element,index)=>{
      if(element.hasAttribute('data-reveal'))return;
      element.setAttribute('data-reveal','');
      element.style.setProperty('--reveal-delay',`${Math.min(index%3,2)*70}ms`);
      if(reduced.matches){element.classList.add('is-revealed');return}
      pending.add(element);observer?.observe(element);
    });
  }
  try{
    if(typeof window.IntersectionObserver==='function')observer=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting)reveal(entry.target);
    },{rootMargin:'0px 0px -24px 0px',threshold:.08});
    register(document.querySelectorAll('.project-card,.section-top,.approach>.eyebrow,.approach>div,.collage-title,.collage-photo,.contact>.eyebrow,.contact h2,.contact-details,.footer'));
    root.classList.toggle('motion-ready',!reduced.matches);
    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule,{passive:true});
    window.addEventListener('load',schedule,{once:true});
    const seriesDialog=document.querySelector('#series-dialog');
    const seriesGrid=document.querySelector('#series-grid');
    let collectionNode;
    function collectionMotion(){
      if(!seriesDialog.open)return;
      for(const element of pending)if(!element.isConnected){pending.delete(element);observer?.unobserve(element)}
      if(collectionNode!==seriesGrid.firstElementChild){
        collectionNode=seriesGrid.firstElementChild;
        register(seriesGrid.querySelectorAll('.series-photo'));
        play(document.querySelector('.series-heading'),[{opacity:0,transform:'translateY(15px)'},{opacity:1,transform:'translateY(0)'}],{duration:500});
      }
      schedule();
    }
    new MutationObserver(collectionMotion).observe(seriesGrid,{childList:true});
    new MutationObserver(collectionMotion).observe(seriesDialog,{attributes:true,attributeFilter:['open']});
    seriesDialog.addEventListener('scroll',schedule,{passive:true});
    document.addEventListener('portfolio:photo-ready',event=>play(event.target,[{opacity:0,transform:'scale(1.018)'},{opacity:1,transform:'scale(1)'}],{duration:300}));
    document.querySelector('.filters').addEventListener('click',()=>{
      play(document.querySelector('#project-grid'),[{opacity:.45,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:340});
      schedule();
    });
    collectionMotion();
    document.addEventListener('focusin',event=>{
      const element=event.target.closest('[data-reveal]');
      if(element)reveal(element);
    });
    reduced.addEventListener('change',()=>{
      root.classList.toggle('motion-ready',!reduced.matches);
      if(reduced.matches){
        for(const animation of animations)animation.cancel();
        for(const element of pending)reveal(element);
      }
      schedule();
    });
    update();
    opening();
  }catch{
    root.classList.remove('motion-ready');
    observer?.disconnect();
  }
})();
}

(() => {
  let loading=false;
  let started=false;
  const status=document.querySelector('#portfolio-loading');
  const error=document.querySelector('#portfolio-load-error');
  const retry=document.querySelector('#portfolio-retry');
  async function load(){
    if(loading)return;
    if(started){location.reload();return}
    loading=true;retry.disabled=true;error.hidden=true;status.hidden=false;
    try{
      const base=new URL('.',location.href);
      const response=await fetch(new URL('portfolio.json',base),{cache:'no-store',signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error('HTTP '+response.status);
      const raw=await response.text();
      if(raw.length>10000000)throw new Error('Слишком большой файл');
      const {projects,heroes}=window.PortfolioContent.normalize(JSON.parse(raw),{basePath:base.pathname});
      window.PORTFOLIO=projects;window.PORTFOLIO_HERO=heroes;
      started=true;
      initializePortfolio();
      document.querySelector('#portfolio-empty').hidden=projects.some(project=>project.photos.length);
      window.PORTFOLIO_READY=true;
      window.dispatchEvent(new Event('portfolio:ready'));
    }catch{
      error.hidden=false;
    }finally{
      loading=false;retry.disabled=false;status.hidden=true;
    }
  }
  retry.addEventListener('click',load);
  load();
})();
