(() => {
  const root = document.documentElement;
  root.classList.add("js");

  // ----- Menu (hamburger morph + staggered overlay) -----
  const burger = document.querySelector(".burger");
  const menu = document.getElementById("menu");
  // While open, everything behind the overlay is inert, so Tab stays within the nav + menu.
  const behind = document.querySelectorAll("main, footer, .skip");
  const isOpen = () => document.body.classList.contains("menu-open");
  const setMenu = (open, { restoreFocus = true } = {}) => {
    document.body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    behind.forEach((el) => (el.inert = open));
    document.body.style.overflow = open ? "hidden" : "";
    if (open) menu.querySelector("a").focus();
    else if (restoreFocus) burger.focus();
  };
  burger.addEventListener("click", () => setMenu(!isOpen()));
  // Following a link: let focus move to the target section instead of back to the burger.
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false, { restoreFocus: false })));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen()) setMenu(false); });
  // Close the overlay if the viewport grows past the mobile breakpoint while it's open.
  window.matchMedia("(min-width: 961px)").addEventListener("change", (e) => { if (e.matches && isOpen()) setMenu(false, { restoreFocus: false }); });

  // ----- Scroll reveals (IntersectionObserver, staggered per batch) -----
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const items = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.filter((e) => e.isIntersecting).forEach((e, i) => {
        e.target.style.transitionDelay = `${i * 80}ms`;
        e.target.classList.add("is-in");
        e.target.addEventListener("transitionend", () => (e.target.style.transitionDelay = ""), { once: true });
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    items.forEach((el) => io.observe(el));
  }

  // ----- Count-up stats -----
  const counters = document.querySelectorAll("[data-count]");
  const run = (el) => {
    const end = Number(el.dataset.count);
    const start = end > 100 ? end - 40 : 0;
    const dur = 1400;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(start + (end - start) * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (!reduce && "IntersectionObserver" in window) {
    const co = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { run(e.target); co.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach((c) => co.observe(c));
  }

  // ----- Plates gallery: show first batch, reveal the rest on demand -----
  const gallery = document.getElementById("gallery");
  const toggle = document.getElementById("gallery-toggle");
  const tiles = [...gallery.querySelectorAll(".g-btn")];
  const extra = gallery.querySelectorAll(".g-more");
  toggle.querySelector("[data-total]").textContent = tiles.length;
  if (!extra.length) toggle.parentElement.hidden = true;
  toggle.addEventListener("click", () => {
    const open = gallery.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.innerHTML = open ? "Show fewer plates" : `See all <span data-total>${tiles.length}</span> plates`;
    if (open) extra[0].querySelector("button").focus({ preventScroll: true });
    else gallery.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
  });

  // ----- Lightbox -----
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lb-img");
  const lbCap = document.getElementById("lb-cap");
  let current = 0;
  const visible = () => tiles.filter((t) => t.offsetParent !== null);
  const show = (i) => {
    const list = visible();
    current = (i + list.length) % list.length;
    const t = list[current];
    const thumb = t.querySelector("img");
    lbImg.src = t.dataset.full;
    lbImg.alt = thumb.alt;
    lbCap.textContent = `${thumb.alt} · ${current + 1} / ${list.length}`;
    // Warm the cache for the next plate
    const next = list[(current + 1) % list.length];
    if (next) new Image().src = next.dataset.full;
  };
  let opener = null;
  tiles.forEach((t) => t.addEventListener("click", () => {
    opener = t;
    show(visible().indexOf(t));
    lb.showModal();
    document.body.style.overflow = "hidden";
  }));
  lb.addEventListener("close", () => {
    document.body.style.overflow = "";
    lbImg.removeAttribute("src");
    if (opener) opener.focus();
  });
  lb.addEventListener("click", (e) => {
    const act = e.target.closest("[data-lb]")?.dataset.lb;
    if (act === "close") lb.close();
    else if (act === "prev") show(current - 1);
    else if (act === "next") show(current + 1);
    else if (e.target === lb || e.target.classList.contains("lightbox__fig")) lb.close();
  });
  lb.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") show(current - 1);
    if (e.key === "ArrowRight") show(current + 1);
  });
  let x0 = null;
  lb.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    x0 = null;
  });

  // ----- TV show: load YouTube only when asked (privacy + speed) -----
  const play = document.getElementById("show-play");
  play.addEventListener("click", () => {
    const f = document.createElement("iframe");
    f.src = "https://www.youtube-nocookie.com/embed/videoseries?list=PLcqcKUiAN8gGpWHgOqpdnjxK9WVaL8ImU&autoplay=1&rel=0";
    f.title = "Nahar Ramadan episodes, Al-Rabiaa TV";
    f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    f.allowFullscreen = true;
    play.replaceWith(f);
    f.focus();
  });

  // ----- Auto-updating years -----
  const now = new Date().getFullYear();
  document.getElementById("year").textContent = now;

  const words = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty"];
  const years = now - 2014; // first kitchen: June 2014
  document.getElementById("years").textContent = (words[years] || String(years)).toLowerCase();
})();
