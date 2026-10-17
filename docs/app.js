(() => {
  const doc = document;
  doc.documentElement.classList.add("js");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 导航：滚动后出现毛玻璃底
  const nav = doc.getElementById("nav");
  const onScroll = () => nav.classList.toggle("solid", window.scrollY > 24);

  // 首页大图：随滚动从“斜放”渐渐摆正
  const win = doc.getElementById("heroWin");
  const tilt = () => {
    if (reduce || !win) return;
    const p = Math.min(1, Math.max(0, window.scrollY / 520));
    const rot = 9 * (1 - p);
    const sc = 0.95 + 0.05 * p;
    win.style.transform = `rotateX(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
  };
  const frame = () => {
    onScroll();
    tilt();
  };
  window.addEventListener("scroll", frame, { passive: true });
  frame();

  // 滚动出现
  const items = [...doc.querySelectorAll(".reveal")];
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add("in"));
  }

  // 视频章节：点击跳转并播放；播放时高亮当前章节
  const video = doc.getElementById("demo");
  const chapterBox = doc.getElementById("chapters");
  if (video && chapterBox) {
    const btns = [...chapterBox.querySelectorAll("button")];
    const times = btns.map((b) => Number(b.dataset.t));
    btns.forEach((b, i) => {
      b.addEventListener("click", () => {
        video.currentTime = times[i];
        video.play().catch(() => undefined);
        video.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      });
    });
    const mark = () => {
      let on = 0;
      times.forEach((t, i) => {
        if (video.currentTime >= t - 0.05) on = i;
      });
      btns.forEach((b, i) => b.classList.toggle("on", i === on));
    };
    const player = doc.getElementById("player");
    const big = doc.getElementById("bigplay");
    big.addEventListener("click", () => video.play().catch(() => undefined));
    video.addEventListener("play", () => player.classList.add("playing"));
    video.addEventListener("pause", () => player.classList.remove("playing"));
    video.addEventListener("ended", () => player.classList.remove("playing"));
    video.addEventListener("timeupdate", mark);
    video.addEventListener("seeked", mark);
  }

  // 终端画面切换
  const tabs = [...doc.querySelectorAll(".tabs button")];
  const shot = doc.getElementById("termShot");
  tabs.forEach((t) =>
    t.addEventListener("click", () => {
      tabs.forEach((x) => x.classList.toggle("on", x === t));
      shot.style.opacity = "0";
      setTimeout(() => {
        shot.src = t.dataset.img;
        shot.onload = () => (shot.style.opacity = "1");
        setTimeout(() => (shot.style.opacity = "1"), 400);
      }, 180);
    }),
  );
  if (shot) shot.style.transition = "opacity 0.25s";

  // AI 演示：进入视野后，像真人一样敲命令
  const viz = doc.getElementById("aiviz");
  if (viz) {
    const cmdEl = doc.getElementById("aiCmd");
    const out = doc.getElementById("aiOut");
    const done = doc.getElementById("aiDone");
    const flo = viz.querySelector(".float");
    const text = cmdEl.dataset.text;
    const showAll = () => {
      cmdEl.textContent = text;
      out.classList.add("show");
      done.classList.add("show");
      flo.classList.add("show");
    };
    if (reduce) {
      showAll();
    } else {
      cmdEl.textContent = "";
      let started = false;
      const run = () => {
        if (started) return;
        started = true;
        let i = 0;
        const tick = () => {
          cmdEl.textContent = text.slice(0, ++i);
          if (i < text.length) {
            setTimeout(tick, 45 + Math.random() * 40);
          } else {
            setTimeout(() => flo.classList.add("show"), 250);
            setTimeout(() => out.classList.add("show"), 1100);
            setTimeout(() => done.classList.add("show"), 1900);
          }
        };
        setTimeout(tick, 500);
      };
      if ("IntersectionObserver" in window) {
        const io2 = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && (run(), io2.disconnect())), { threshold: 0.45 });
        io2.observe(viz);
      } else {
        run();
      }
    }
  }
})();
