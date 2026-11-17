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
      if(root.classList.contains('locked') || body.classList.contains('lightbox-open') || event.ctrlKey || !event.deltaY) return;
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
      if(root.classList.contains('locked') || body.classList.contains('lightbox-open') || event.ctrlKey || event.altKey || event.metaKey || isEditable(document.activeElement)) return;

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
  /* ---- Галерея дресс-кода ---- */
  (function(){
    var box=document.getElementById('dressLightbox'), image=document.getElementById('dressLightboxImage'),
        title=document.getElementById('dressLightboxTitle'), counter=document.getElementById('dressLightboxCounter'),
        zoom=document.getElementById('dressLightboxZoom');
    if(!box||!image) return;
    var activeLinks=[], index=0, lastFocus=null, closeTimer=0, zoomed=false, panX=0, panY=0,
        dragging=false, dragMoved=false, dragStartX=0, dragStartY=0, dragPanX=0, dragPanY=0;
    document.querySelectorAll('.dress-gallery').forEach(function(gallery){
      var galleryLinks=Array.prototype.slice.call(gallery.querySelectorAll('.dress-photo-link'));
      var previewIndex=0, isHovered=false;
      galleryLinks[0].classList.add('is-preview-active');
      function switchPreview(step){
        previewIndex=(previewIndex+step+galleryLinks.length)%galleryLinks.length;
        galleryLinks.forEach(function(link){
          link.classList.remove('is-preview-active','is-preview-enter-next','is-preview-enter-prev');
        });
        var nextLink=galleryLinks[previewIndex], enterClass=step>0?'is-preview-enter-next':'is-preview-enter-prev';
        nextLink.classList.add('is-preview-active',enterClass);
        requestAnimationFrame(function(){
          requestAnimationFrame(function(){ nextLink.classList.remove(enterClass); });
        });
      }
      galleryLinks.forEach(function(link){
        link.addEventListener('click',function(event){
          event.preventDefault();
          activeLinks=galleryLinks;
          index=galleryLinks.indexOf(link);
          open(link);
        });
      });
      gallery.querySelectorAll('.dress-preview-control').forEach(function(control){
        control.addEventListener('click',function(){
          var step=Number(control.getAttribute('data-preview-step'));
          switchPreview(step);
        });
      });
      gallery.querySelector('.dress-gallery-grid').addEventListener('mouseenter',function(){ isHovered=true; });
      gallery.querySelector('.dress-gallery-grid').addEventListener('mouseleave',function(){ isHovered=false; });
      setInterval(function(){
        if(!isHovered && !body.classList.contains('lightbox-open') && document.visibilityState==='visible') switchPreview(1);
      },4000);
    });
    function open(link){
      clearTimeout(closeTimer);
      lastFocus=document.activeElement;
      title.textContent=link.closest('.dress-gallery').querySelector('.dress-gallery-title').textContent;
      box.hidden=false;
      box.classList.remove('is-open');
      body.classList.add('lightbox-open');
      render();
      requestAnimationFrame(function(){ box.classList.add('is-open'); });
      box.querySelector('.dress-lightbox-close').focus();
    }
    function close(){
      if(box.hidden) return;
      box.classList.remove('is-open');
      clearTimeout(closeTimer);
      closeTimer=setTimeout(function(){
        box.hidden=true;
        body.classList.remove('lightbox-open');
        if(lastFocus) lastFocus.focus();
      },300);
    }
    function render(direction){
      var img=activeLinks[index].querySelector('img');
      resetZoom();
      image.classList.remove('is-changing','is-next','is-prev');
      void image.offsetWidth;
      image.classList.add('is-changing');
      if(direction) image.classList.add(direction==='next'?'is-next':'is-prev');
      image.src=img.src;
      image.alt=img.alt;
      counter.textContent=(index+1)+' из '+activeLinks.length;
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){ image.classList.remove('is-changing'); });
      });
    }
    function move(step){
      index=(index+step+activeLinks.length)%activeLinks.length;
      title.textContent=activeLinks[index].closest('.dress-gallery').querySelector('.dress-gallery-title').textContent;
      render(step>0?'next':'prev');
    }
    box.addEventListener('click',function(event){
      if(event.target.closest('[data-lightbox-close]')) close();
      else if(event.target.closest('.dress-lightbox-prev')) move(-1);
      else if(event.target.closest('.dress-lightbox-next')) move(1);
    });
    box.addEventListener('keydown',function(event){
      if(event.key==='Escape'){ event.preventDefault(); close(); }
      else if(event.key==='ArrowLeft'){ event.preventDefault(); move(-1); }
      else if(event.key==='ArrowRight'){ event.preventDefault(); move(1); }
    });
    function resetPan(){
      panX=0; panY=0;
      image.style.setProperty('--pan-x','0px');
      image.style.setProperty('--pan-y','0px');
    }
    function resetZoom(){
      zoomed=false; dragging=false; dragMoved=false;
      resetPan();
      image.classList.remove('is-zoomed','is-dragging');
      zoom.setAttribute('aria-pressed','false');
      zoom.setAttribute('aria-label','Увеличить фото');
    }
    function toggleZoom(){
      zoomed=!zoomed;
      if(!zoomed) resetPan();
      image.classList.toggle('is-zoomed',zoomed);
      zoom.setAttribute('aria-pressed',zoomed?'true':'false');
      zoom.setAttribute('aria-label',zoomed?'Уменьшить фото':'Увеличить фото');
    }
    function limitPan(){
      var content=image.parentElement;
      var scale=1.5;
      var maxX=Math.max(0,(image.clientWidth*scale-content.clientWidth)/2);
      var maxY=Math.max(0,(image.clientHeight*scale-content.clientHeight)/2);
      panX=Math.max(-maxX,Math.min(maxX,panX));
      panY=Math.max(-maxY,Math.min(maxY,panY));
      image.style.setProperty('--pan-x',panX+'px');
      image.style.setProperty('--pan-y',panY+'px');
    }
    zoom.addEventListener('click',toggleZoom);
    image.addEventListener('click',function(event){
      if(dragMoved){ dragMoved=false; return; }
      event.preventDefault();
      toggleZoom();
    });
    image.addEventListener('pointerdown',function(event){
      if(!zoomed) return;
      dragging=true; dragMoved=false;
      dragStartX=event.clientX; dragStartY=event.clientY;
      dragPanX=panX; dragPanY=panY;
      image.classList.add('is-dragging');
      image.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    image.addEventListener('pointermove',function(event){
      if(!dragging) return;
      var dx=event.clientX-dragStartX, dy=event.clientY-dragStartY;
      if(Math.abs(dx)>3||Math.abs(dy)>3) dragMoved=true;
      panX=dragPanX+dx; panY=dragPanY+dy;
      limitPan();
    });
    image.addEventListener('pointerup',function(event){
      dragging=false;
      image.classList.remove('is-dragging');
      if(image.hasPointerCapture(event.pointerId)) image.releasePointerCapture(event.pointerId);
    });
    image.addEventListener('pointercancel',function(){
      dragging=false;
      image.classList.remove('is-dragging');
    });
  })();
  /* ---- RSVP form (Telegram via Netlify Function) ---- */
  (function(){
    var form=document.getElementById('rsvpForm'), status=document.getElementById('rsvpStatus'), done=document.getElementById('rsvpDone');
    if(!form) return;
    var btn=form.querySelector('button[type=submit]');
    form.addEventListener('submit',function(e){
      e.preventDefault();
      if(!form.checkValidity()){ form.reportValidity(); return; }
      btn.disabled=true; status.textContent='Отправляем…';
      fetch('/.netlify/functions/send-rsvp',{
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
