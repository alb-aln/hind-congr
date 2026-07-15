(() => {
  const FREEZE_TIME = 5.0; // Barbie driving, then freeze the frame

  const startScreen = document.getElementById('startScreen');
  const startBtn    = document.getElementById('startBtn');
  const stage       = document.getElementById('stage');
  const video       = document.getElementById('bgVideo');
  const freezeCanvas= document.getElementById('freezeCanvas');
  const vignette    = document.getElementById('vignette');
  const sparkleCanvas = document.getElementById('sparkleCanvas');
  const newsBanner  = document.getElementById('newsBanner');
  const popup       = document.getElementById('popup');
  const replayBtn   = document.getElementById('replayBtn');
  const bgMusic     = document.getElementById('bgMusic');
  const musicToggle = document.getElementById('musicToggle');

  const fctx = freezeCanvas.getContext('2d');
  const sctx = sparkleCanvas.getContext('2d');

  let frozen = false;
  let sparkleRAF = null;
  let particles = [];
  let musicStarted = false;
  let musicFadeRAF = null;
  const MUSIC_TARGET_VOLUME = 0.55;

  function sizeCanvases(){
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    [freezeCanvas, sparkleCanvas].forEach(c => {
      c.width = w * window.devicePixelRatio;
      c.height = h * window.devicePixelRatio;
    });
  }
  window.addEventListener('resize', sizeCanvases);

  function drawFrozenFrame(){
    const w = freezeCanvas.width;
    const h = freezeCanvas.height;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if(!vw || !vh) return;

    // object-fit: cover math
    const canvasRatio = w / h;
    const videoRatio = vw / vh;
    let drawW, drawH, offsetX, offsetY;
    if (videoRatio > canvasRatio){
      drawH = h;
      drawW = h * videoRatio;
      offsetX = (w - drawW) / 2;
      offsetY = 0;
    } else {
      drawW = w;
      drawH = w / videoRatio;
      offsetX = 0;
      offsetY = (h - drawH) / 2;
    }
    fctx.clearRect(0,0,w,h);
    fctx.drawImage(video, offsetX, offsetY, drawW, drawH);
  }

  function startSparkles(){
    const w = sparkleCanvas.width;
    const h = sparkleCanvas.height;
    particles = [];
    const count = Math.floor((w*h) / 60000) + 24;
    const colors = ['#ffffff', '#ffd23f', '#ff8fc7', '#ffe0f0'];

    for (let i=0; i<count; i++){
      particles.push({
        x: Math.random()*w,
        y: Math.random()*h,
        r: Math.random()*3 + 1.5,
        speedY: Math.random()*0.4 + 0.15,
        speedX: (Math.random()-0.5)*0.3,
        alpha: Math.random()*0.6+0.4,
        twinkleSpeed: Math.random()*0.05+0.02,
        phase: Math.random()*Math.PI*2,
        color: colors[Math.floor(Math.random()*colors.length)],
        isStar: Math.random() > 0.6
      });
    }

    function drawStar(ctx, x, y, r, color, alpha){
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x,y);
      ctx.beginPath();
      for(let i=0;i<4;i++){
        ctx.rotate(Math.PI/2);
        ctx.moveTo(0,0);
        ctx.lineTo(0, -r*2.4);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = r*0.5;
      ctx.stroke();
      ctx.restore();
    }

    function loop(){
      sctx.clearRect(0,0,w,h);
      particles.forEach(p => {
        p.phase += p.twinkleSpeed;
        const a = p.alpha * (0.55 + 0.45*Math.sin(p.phase));
        if (p.isStar){
          drawStar(sctx, p.x, p.y, p.r, p.color, a);
        } else {
          sctx.beginPath();
          sctx.globalAlpha = a;
          sctx.fillStyle = p.color;
          sctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
          sctx.fill();
        }
        p.y -= p.speedY;
        p.x += p.speedX;
        if (p.y < -10){ p.y = h+10; p.x = Math.random()*w; }
        if (p.x < -10) p.x = w+10;
        if (p.x > w+10) p.x = -10;
      });
      sctx.globalAlpha = 1;
      sparkleRAF = requestAnimationFrame(loop);
    }
    loop();
  }

  function fadeMusicIn(){
    if (musicFadeRAF) cancelAnimationFrame(musicFadeRAF);
    bgMusic.volume = 0;
    bgMusic.play().catch(() => {});
    const start = performance.now();
    const duration = 1400;
    function step(now){
      const t = Math.min(1, (now - start) / duration);
      bgMusic.volume = t * MUSIC_TARGET_VOLUME;
      if (t < 1) musicFadeRAF = requestAnimationFrame(step);
    }
    musicFadeRAF = requestAnimationFrame(step);
  }

  function startBackgroundMusic(){
    if (musicStarted) return;
    musicStarted = true;
    musicToggle.classList.add('show');
    musicToggle.removeAttribute('aria-hidden');
    musicToggle.textContent = '🔊';
    fadeMusicIn();
  }

  function triggerFreeze(){
    if (frozen) return;
    frozen = true;

    drawFrozenFrame();
    freezeCanvas.classList.add('show');
    vignette.classList.add('show');

    // slow settle of the zoom after the initial punch-in
    setTimeout(() => {
      freezeCanvas.style.transition = 'transform 3.2s ease, opacity 0.6s ease';
      freezeCanvas.style.transform = 'scale(1.02)';
    }, 900);

    startSparkles();
    sparkleCanvas.classList.add('show');

    setTimeout(() => newsBanner.classList.add('show'), 500);
    setTimeout(() => {
      popup.classList.add('show');
      // Background music starts only after the congratulation message appears
      startBackgroundMusic();
    }, 1500);

    // NOTE: video is intentionally NOT paused — audio keeps playing
    // naturally underneath the frozen frame until the clip ends.
  }

  function onTimeUpdate(){
    if (!frozen && video.currentTime >= FREEZE_TIME){
      triggerFreeze();
    }
  }

  function resetExperience(){
    frozen = false;
    if (sparkleRAF) cancelAnimationFrame(sparkleRAF);
    freezeCanvas.classList.remove('show');
    freezeCanvas.style.transition = 'opacity 1.1s ease, transform 2.6s ease, filter 1.4s ease';
    freezeCanvas.style.transform = '';
    vignette.classList.remove('show');
    sparkleCanvas.classList.remove('show');
    newsBanner.classList.remove('show');
    popup.classList.remove('show');
    video.currentTime = 0;
    video.play().catch(()=>{});

    if (musicFadeRAF) cancelAnimationFrame(musicFadeRAF);
    bgMusic.pause();
    bgMusic.currentTime = 0;
    bgMusic.volume = 0;
    musicStarted = false;
    musicToggle.classList.remove('show');
  }

  startBtn.addEventListener('click', () => {
    startScreen.style.transition = 'opacity .5s ease';
    startScreen.style.opacity = '0';
    setTimeout(() => { startScreen.style.display = 'none'; }, 500);
    stage.removeAttribute('aria-hidden');
    document.body.classList.add('started');

    sizeCanvases();
    video.muted = false;
    video.volume = 1;
    const p = video.play();
    if (p && p.catch) p.catch(() => {
      // Fallback: if unmuted autoplay is blocked, retry muted then unmute on next tick
      video.muted = true;
      video.play().then(() => { video.muted = false; });
    });
  });

  video.addEventListener('timeupdate', onTimeUpdate);
  video.addEventListener('loadedmetadata', sizeCanvases);
  video.addEventListener('ended', () => {
    // keep last frame visible / frozen state persists via canvas already shown
  });

  replayBtn.addEventListener('click', resetExperience);

  musicToggle.addEventListener('click', () => {
    bgMusic.muted = !bgMusic.muted;
    musicToggle.textContent = bgMusic.muted ? '🔇' : '🔊';
  });

  sizeCanvases();
})();
