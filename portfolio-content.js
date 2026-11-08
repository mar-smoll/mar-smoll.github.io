'use strict';
(function(root){
  const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  function text(value,fallback=''){
    if(value==null)return fallback;
    if(typeof value!=='string'||value.length>10000)throw new Error('Некорректный текст');
    return value;
  }
  function imagePath(value,basePath='/'){
    if(typeof value!=='string'||value.length>2048||/%(?:2f|5c)/i.test(value))throw new Error('Некорректный путь изображения');
    let path;
    try{path=decodeURIComponent(value)}catch{throw new Error('Некорректный путь изображения')}
    if(/[%\\:?#<>"|*\u0000-\u001f\u007f]/.test(path)||path.startsWith('//'))throw new Error('Небезопасный путь изображения');
    if(basePath!=='/'&&path.startsWith(basePath+'assets/'))path=path.slice(basePath.length);
    else if(path.startsWith('/assets/'))path=path.slice(1);
    else if(path.startsWith('./assets/'))path=path.slice(2);
    const parts=path.split('/');
    if(parts[0]!=='assets'||parts.some(part=>!part||part==='.'||part==='..'||part.trim()!==part)||!/\.(jpe?g|png|webp)$/i.test(path))throw new Error('Разрешены только локальные JPEG, PNG и WebP');
    return path;
  }
  function normalize(data,{basePath='/'}={}){
    if(!object(data))throw new Error('Некорректные данные портфолио');
    const seriesList=data.series??[];
    if(!Array.isArray(seriesList)||seriesList.length>500)throw new Error('Некорректный список серий');
    const ids=new Set();
    const projects=seriesList.map(series=>{
      if(!object(series))throw new Error('Некорректная серия');
      const id=text(series.id)||text(series.uid);
      if(!/^[a-z0-9-]{1,100}$/.test(id)||ids.has(id))throw new Error('Некорректный или повторяющийся идентификатор серии');
      ids.add(id);
      const title=text(series.title,'Без названия');
      const items=series.photos??[];
      if(!Array.isArray(items)||items.length>5000)throw new Error('Некорректный список фотографий');
      const photoIds=new Set();
      const photos=items.map((photo,index)=>{
        if(!object(photo))throw new Error('Некорректная фотография');
        const src=imagePath(photo.src,basePath);
        const id=text(photo.id)||src;
        if(photoIds.has(id))throw new Error('Повторяющаяся фотография');
        photoIds.add(id);
        const prepared=photo.originalSrc&&imagePath(photo.originalSrc,basePath)===src;
        const dimensions=prepared&&[photo.width,photo.height].every(n=>Number.isInteger(n)&&n>0&&n<=50000);
        return {id,src,thumb:prepared&&photo.thumb?imagePath(photo.thumb,basePath):src,
          alt:text(photo.alt)||`${title}. Фотография ${index+1}`,
          ...(dimensions?{width:photo.width,height:photo.height}:{})};
      });
      const cover=series.cover?imagePath(series.cover,basePath):'';
      return {id,title,category:text(series.category,'Личное'),note:text(series.note),
        cover:(photos.find(photo=>photo.src===cover)||photos[0])?.id,photos};
    });
    if(data.hero!=null&&!Array.isArray(data.hero))throw new Error('Некорректные главные фотографии');
    const heroes=(data.hero||[]).slice(0,2).map(value=>{
      const src=imagePath(value,basePath);
      const project=projects.find(series=>series.photos.some(photo=>photo.src===src));
      return project?{seriesId:project.id,photoId:project.photos.find(photo=>photo.src===src).id}:null;
    }).filter(Boolean);
    return {projects,heroes};
  }
  const api={normalize};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PortfolioContent=api;
})(typeof window==='object'?window:globalThis);
