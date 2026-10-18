(() => {
  const KEY='sshadmin.language';
  const read=()=>{try{return localStorage.getItem(KEY);}catch{return null;}};
  const save=value=>{try{if(value==='system')localStorage.removeItem(KEY);else localStorage.setItem(KEY,value);}catch{}};
  const resolve=()=>{for(const language of navigator.languages||[navigator.language]){if(/^zh(?:-|$)/i.test(language))return 'zh';if(/^en(?:-|$)/i.test(language))return 'en';}return 'en';};
  const explicit=/\/(zh|en)\/(?:index\.html|manual\.html)?$/.test(location.pathname);
  const requested=new URLSearchParams(location.search).get('lang');
  if(['system','zh-CN','en'].includes(requested))save(requested);
  if(!explicit){const stored=read();const language=requested==='system'?resolve():requested==='en'?'en':requested==='zh-CN'?'zh':stored==='en'?'en':stored==='zh-CN'?'zh':resolve();const page=location.pathname.endsWith('manual.html')?'manual.html':'index.html';location.replace(language+'/'+page+location.hash);return;}
  document.addEventListener('DOMContentLoaded',()=>{for(const link of document.querySelectorAll('[data-language]'))link.addEventListener('click',()=>{save(link.dataset.language);if(location.hash)link.href=link.href.split("#")[0]+location.hash;});});
})();
