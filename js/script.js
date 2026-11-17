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
