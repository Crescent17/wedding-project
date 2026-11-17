(function(){
  /* Громкость музыки: от 0 (тишина) до 1 (максимум) */
  var MUSIC_VOLUME=0.1;

  var root=document.documentElement, body=document.body;
  var loader=document.getElementById('loader'), stage=document.getElementById('stage'),
      seal=document.getElementById('seal'), main=document.getElementById('main');
  root.classList.add('locked');

  var shown=false;
  function show(){
    if(shown) return; shown=true;
    body.classList.add('ready');
    loader.classList.add('hide');
    setTimeout(function(){ loader.remove(); },700);
  }
  var loaded=new Promise(function(r){ document.readyState==='complete'?r():window.addEventListener('load',r); });
  var fonts=(document.fonts&&document.fonts.load)
    ? Promise.race([document.fonts.load('48px "Passions Conflict RUS"'),new Promise(function(r){setTimeout(r,3000)})]).catch(function(){})
    : Promise.resolve();
  var minimum=new Promise(function(r){ setTimeout(r,1200); });
  Promise.all([loaded,fonts,minimum]).then(show);
  setTimeout(show,6000);

  /* ---- Music ---- */
  var audio=document.getElementById('music'), musicBtn=document.getElementById('musicBtn');
  audio.volume=MUSIC_VOLUME;
  function syncMusicUI(){
    var on=!audio.paused;
    musicBtn.classList.toggle('is-playing',on);
    musicBtn.setAttribute('aria-pressed',on?'true':'false');
    musicBtn.setAttribute('aria-label',on?'Выключить музыку':'Включить музыку');
  }
  function startMusic(){
    var p=audio.play();
    if(p&&p.catch) p.catch(syncMusicUI);
  }
  audio.addEventListener('play',syncMusicUI);
  audio.addEventListener('pause',syncMusicUI);
  audio.addEventListener('error',syncMusicUI);
  musicBtn.addEventListener('click',function(){
    if(audio.paused) startMusic(); else audio.pause();
  });

  var opened=false;
  seal.addEventListener('click',function(){
    if(opened) return; opened=true;
    startMusic(); /* запуск прямо по клику — так браузеры разрешают звук */
    stage.classList.add('opening');
    body.classList.add('opening');
    setTimeout(function(){
      stage.hidden=true;
      root.classList.remove('locked');
      main.focus({preventScroll:true});
      if(window.__updateHeart) window.__updateHeart(true);
    },1700);
  });
  /* ---- Heart moving along the line while scrolling ---- */
  (function(){
    var line=document.getElementById('tlLine'), path=document.getElementById('tlPath'), heart=document.getElementById('tlHeart');
    if(!line||!path||!heart||!path.getTotalLength) return;
    var VB_W=300, N=480, len=path.getTotalLength(), xs=[], ys=[];
    for(var i=0;i<=N;i++){ var pt=path.getPointAtLength(len*i/N); xs.push(pt.x); ys.push(pt.y); }
    var cx=null, cy=null, tx=0, ty=0, raf=0;

    function target(){
      var r=line.getBoundingClientRect(), u=r.width/VB_W;
      if(!u) return;
      var y=(window.innerHeight/2-r.top)/u;          /* сердце держится на середине экрана */
      y=Math.max(ys[0],Math.min(ys[N],y));
      var lo=0, hi=N;
      while(hi-lo>1){ var m=(lo+hi)>>1; if(ys[m]<y) lo=m; else hi=m; }
      var k=(ys[hi]-ys[lo])?(y-ys[lo])/(ys[hi]-ys[lo]):0;
      tx=(xs[lo]+(xs[hi]-xs[lo])*k)*u;
      ty=(ys[lo]+(ys[hi]-ys[lo])*k)*u;
    }
    function draw(){
      cx+=(tx-cx)*0.2; cy+=(ty-cy)*0.2;
      var done=Math.abs(tx-cx)<0.1&&Math.abs(ty-cy)<0.1;
      if(done){ cx=tx; cy=ty; }
      heart.style.transform='translate('+cx+'px,'+cy+'px) translate(-50%,-50%)';
      raf=done?0:requestAnimationFrame(draw);
    }
    function update(snap){
      target();
      if(cx===null||snap===true){ cx=tx; cy=ty; }
      if(!raf) raf=requestAnimationFrame(draw);
    }
    window.addEventListener('scroll',update,{passive:true});
    window.addEventListener('resize',function(){ update(true); });
    update(true);
    window.__updateHeart=update;
  })();
  /* ---- Инерционная прокрутка колесом мыши ----
     Целевая позиция меняется сразу, а фактическая догоняет её через LERP.
     На сенсорных устройствах и при prefers-reduced-motion остаётся нативный скролл. */
  (function(){
    if(!window.requestAnimationFrame || !window.scrollTo ||
       window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var current=window.scrollY, target=current, raf=0, lastTime=0, active=false;
    /* Меньший коэффициент даёт более мягкое, но всё ещё отзывчивое затухание. */
    var LERP=0.1, STOP_EPSILON=0.35;

    function maxScroll(){
      return Math.max(0, document.documentElement.scrollHeight-window.innerHeight);
    }
    function clamp(value){ return Math.max(0,Math.min(maxScroll(),value)); }
    function frame(time){
      if(!lastTime) lastTime=time;
      /* Корректируем коэффициент для мониторов с разной частотой обновления. */
      var alpha=1-Math.pow(1-LERP,Math.min(3,(time-lastTime)/16.67));
      lastTime=time;
      current+=(target-current)*alpha;
      if(Math.abs(target-current)<=STOP_EPSILON){
        current=target;
        window.scrollTo(0,current);
        raf=0; active=false; lastTime=0;
        return;
      }
      window.scrollTo(0,current);
      raf=requestAnimationFrame(frame);
    }
    function start(){
      if(raf) return;
      active=true;
      raf=requestAnimationFrame(frame);
    }
    function onWheel(event){
      if(root.classList.contains('locked') || event.ctrlKey || !event.deltaY) return;
      event.preventDefault();
      if(!active){
        current=window.scrollY;
        target=current;
      }
      var multiplier=event.deltaMode===1 ? 16 : event.deltaMode===2 ? window.innerHeight : 1;
      target=clamp(target+event.deltaY*multiplier);
      start();
    }
    function isEditable(element){
      return element && (element.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(element.tagName));
    }
    function onKeydown(event){
      if(root.classList.contains('locked') || event.ctrlKey || event.altKey || event.metaKey || isEditable(document.activeElement)) return;

      if(!active){
        current=window.scrollY;
        target=current;
      }
      var step=Math.max(120,window.innerHeight*0.14), distance=0;
      switch(event.key){
        case 'ArrowDown': distance=step; break;
        case 'ArrowUp': distance=-step; break;
        case 'PageDown': distance=window.innerHeight*0.86; break;
        case 'PageUp': distance=-window.innerHeight*0.86; break;
        case ' ': distance=event.shiftKey ? -window.innerHeight*0.86 : window.innerHeight*0.86; break;
        case 'Home': target=0; break;
        case 'End': target=maxScroll(); break;
        default: return;
      }
      event.preventDefault();
      if(distance) target=clamp(target+distance);
      start();
    }
    window.addEventListener('wheel',onWheel,{passive:false});
    window.addEventListener('keydown',onKeydown,{passive:false});
    window.addEventListener('scroll',function(){
      if(!active){ current=target=window.scrollY; }
    },{passive:true});
    window.addEventListener('resize',function(){ target=clamp(target); });
  })();
  /* ---- RSVP form (Netlify Forms) ---- */
  (function(){
    var form=document.getElementById('rsvpForm'), status=document.getElementById('rsvpStatus'), done=document.getElementById('rsvpDone');
    if(!form) return;
    var btn=form.querySelector('button[type=submit]');
    form.addEventListener('submit',function(e){
      e.preventDefault();
      if(!form.checkValidity()){ form.reportValidity(); return; }
      btn.disabled=true; status.textContent='Отправляем…';
      fetch('/',{
        method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams(new FormData(form)).toString()
      }).then(function(r){
        if(!r.ok) throw new Error(r.status);
        form.hidden=true; done.hidden=false;
      }).catch(function(){
        status.textContent='Не получилось отправить. Попробуйте ещё раз.';
        btn.disabled=false;
      });
    });
  })();
  /* ---- Countdown ---- */
  (function(){
    var box=document.getElementById('timer');
    if(!box) return;
    var target=new Date(box.getAttribute('data-target')).getTime();
    if(isNaN(target)) return;
    var words={days:['день','дня','дней'],hours:['час','часа','часов'],minutes:['минута','минуты','минут'],seconds:['секунду','секунды','секунд']};
    function plural(n,f){
      var a=n%100, b=n%10;
      if(a>=11&&a<=14) return f[2];
      if(b===1) return f[0];
      if(b>=2&&b<=4) return f[1];
      return f[2];
    }
    function pad(n){ return n<10?'0'+n:String(n); }
    function set(unit,n){
      box.querySelector('[data-num="'+unit+'"]').textContent=pad(n);
      box.querySelector('[data-label="'+unit+'"]').textContent=plural(n,words[unit]);
    }
    function tick(){
      var diff=Math.max(0,target-Date.now());
      set('days',Math.floor(diff/864e5));
      set('hours',Math.floor(diff%864e5/36e5));
      set('minutes',Math.floor(diff%36e5/6e4));
      set('seconds',Math.floor(diff%6e4/1e3));
    }
    tick();
    setInterval(tick,1000);
  })();
})();
