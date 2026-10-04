/* ---------------------------------------------------------------
   Yang Zhang — personal homepage
   Independent pieces: section index, scroll reveal, theme toggle, the
   3Dmol pocket view, email reveal and the local clock. Each degrades
   quietly: the page is fully readable without any of them.
   --------------------------------------------------------------- */

var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
var systemDark = window.matchMedia("(prefers-color-scheme: dark)");

function pad(n) { return (n < 10 ? "0" : "") + n; }

function effectiveTheme() {
  return document.documentElement.dataset.theme || (systemDark.matches ? "dark" : "light");
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/* Rolling digits: each digit is a 0–9 strip that slides to its value.
   Returns a setter; the string passed to it must keep the same shape. */
function roller(el, initial) {
  el.classList.add("roll");
  el.textContent = "";
  var strips = initial.split("").map(function (ch) {
    if (!/\d/.test(ch)) {
      var plain = document.createElement("span");
      plain.textContent = ch;
      el.appendChild(plain);
      return null;
    }
    var cell = document.createElement("span");
    var strip = document.createElement("span");
    cell.className = "roll-cell";
    strip.className = "roll-strip";
    for (var d = 0; d <= 9; d++) {
      var digit = document.createElement("span");
      digit.textContent = d;
      strip.appendChild(digit);
    }
    cell.appendChild(strip);
    el.appendChild(cell);
    return strip;
  });
  function set(text) {
    text.split("").forEach(function (ch, i) {
      if (strips[i]) strips[i].style.transform = "translateY(" + -Number(ch) + "em)";
    });
  }
  set(initial);
  return set;
}

(function currentYear() {
  var el = document.getElementById("year");
  if (el) el.textContent = new Date().getFullYear();
})();

/* --- section index -----------------------------------------------
   Numbers each section from the nav, marks the nav link of the section
   being read, and drives the index in the left margin on wide screens.
   ------------------------------------------------------------------ */

(function sectionIndex() {
  var sections = Array.prototype.slice.call(document.querySelectorAll("main > section[id]"));
  if (!sections.length) return;

  var links = {};
  document.querySelectorAll('nav ul a[href^="#"]').forEach(function (a) {
    links[a.getAttribute("href").slice(1)] = a;
  });
  var names = sections.map(function (s) {
    var link = links[s.id];
    if (!link) return s.id;
    return (link.querySelector(".nav-en") || link).textContent.trim();
  });
  var total = pad(sections.length);

  // What each section holds, e.g. "05 files", for the right side of its label.
  var COUNTED = [
    [".field", "files"],
    ["ol.pubs > li", "entries"],
    [".repo", "repositories"],
    ["ul.timeline > li", "entries"]
  ];
  function tally(section) {
    for (var k = 0; k < COUNTED.length; k++) {
      var n = section.querySelectorAll(COUNTED[k][0]).length;
      if (n) return pad(n) + " " + COUNTED[k][1];
    }
    return "";
  }

  sections.forEach(function (section, i) {
    var heading = section.querySelector("h2");
    if (!heading) return;
    var label = document.createElement("p");
    var num = document.createElement("span");
    var of = document.createElement("i");
    var name = document.createElement("span");
    label.className = "sec-label";
    label.setAttribute("aria-hidden", "true");
    num.className = "sec-num";
    num.textContent = pad(i + 1) + " ";
    of.textContent = "/ " + total;
    name.textContent = tally(section);
    num.appendChild(of);
    label.appendChild(num);
    label.appendChild(name);
    heading.parentNode.insertBefore(label, heading);
  });

  // The index doubles as a control: arrows step between sections and every
  // tick jumps to its section. The arrows are real buttons; the ticks are a
  // pointer shortcut only, since the nav bar already offers the same jumps
  // to keyboard and screen-reader users.
  var hud = document.createElement("aside");
  hud.className = "hud";
  hud.setAttribute("aria-label", "Section index");
  // Compact pager: a large number cropped at its waist, the arrows, the
  // total, and the section name tucked under the crop line.
  hud.innerHTML =
    '<div class="hud-row">' +
      '<div class="hud-num" aria-hidden="true"><span class="hud-current"></span></div>' +
      '<div class="hud-step">' +
        '<button type="button" class="hud-up"><svg viewBox="0 0 10 7" aria-hidden="true"><path d="M5 0l5 7H0z"/></svg></button>' +
        '<button type="button" class="hud-down"><svg viewBox="0 0 10 7" aria-hidden="true"><path d="M0 0h10L5 7z"/></svg></button>' +
      '</div>' +
      '<div class="hud-total" aria-hidden="true"></div>' +
    '</div>' +
    '<div class="hud-name" aria-hidden="true"></div>' +
    '<div class="hud-ruler" aria-hidden="true"></div>';
  hud.querySelector(".hud-total").textContent = "/ " + total;
  var hudName = hud.querySelector(".hud-name");
  var up = hud.querySelector(".hud-up"), down = hud.querySelector(".hud-down");
  var setNumber = roller(hud.querySelector(".hud-current"), "01");
  var ticks = sections.map(function (section, j) {
    var tick = document.createElement("span");
    tick.addEventListener("click", function () { go(j); });
    // Hovering a tick previews where it leads.
    tick.addEventListener("mouseenter", function () {
      settleName(names[j]);
      hudName.classList.toggle("preview", j !== current);
    });
    tick.addEventListener("mouseleave", function () {
      settleName(names[Math.max(current, 0)]);
      hudName.classList.remove("preview");
    });
    hud.querySelector(".hud-ruler").appendChild(tick);
    return tick;
  });
  document.body.appendChild(hud);

  // The section name changes the way the page number's neighbours do on the
  // reference pager: the old name lifts away and fades, the new one rises in.
  function settleName(text) {
    hudName.getAnimations().forEach(function (a) { a.cancel(); });
    hudName.textContent = text;
  }
  function swapName(text) {
    hudName.dataset.next = text;
    if (hudName.textContent === text && !hudName.getAnimations().length) return;
    if (reduceMotion.matches || !hudName.animate) return settleName(text);
    hudName.getAnimations().forEach(function (a) { a.cancel(); });
    var out = hudName.animate(
      [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-6px)" }],
      { duration: 140, delay: 60, easing: "ease-in", fill: "forwards" }
    );
    out.onfinish = function () {
      hudName.textContent = hudName.dataset.next;
      out.cancel();
      hudName.animate(
        [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }],
        { duration: 240, easing: "cubic-bezier(.2, .7, .2, 1)" }
      );
    };
  }

  // While a smooth scroll is still travelling, "current" lags behind, so a
  // second click would aim at the same place. Step from the destination
  // instead until the scroll has settled.
  var pending = null, settle;
  function go(i) {
    pending = i;
    clearTimeout(settle);
    settle = setTimeout(function () { pending = null; }, 1000);
    if (i < 0) window.scrollTo({ top: 0 });
    else sections[i].scrollIntoView({ block: "start" });
  }
  window.addEventListener("scrollend", function () { pending = null; });
  up.addEventListener("click", function () {
    var from = pending !== null ? pending : current;
    if (from !== null && from >= 0) go(from - 1);
  });
  down.addEventListener("click", function () {
    var from = pending !== null ? pending : current;
    if (from !== null && from < sections.length - 1) go(from + 1);
  });

  var current = null;
  function activate(i) {
    if (i === current) return;
    current = i;
    Object.keys(links).forEach(function (id) { links[id].removeAttribute("aria-current"); });
    if (i < 0) {
      hud.classList.remove("on");
      return;
    }
    var link = links[sections[i].id];
    if (link) {
      link.setAttribute("aria-current", "true");
      // On narrow screens the nav scrolls sideways; keep the current item in view.
      var bar = link.closest("ul"), l = link.getBoundingClientRect(), b = bar.getBoundingClientRect();
      if (bar.scrollWidth > bar.clientWidth && (l.left < b.left || l.right > b.right - 28)) {
        bar.scrollBy({ left: l.left - b.left - 8, behavior: reduceMotion.matches ? "auto" : "smooth" });
      }
    }
    setNumber(pad(i + 1));
    swapName(names[i]);
    hudName.classList.remove("preview");
    ticks.forEach(function (tick, j) { tick.classList.toggle("on", j === i); });
    var last = i === sections.length - 1;
    up.setAttribute("aria-label", i === 0 ? "Back to top" : "Previous section: " + names[i - 1]);
    down.setAttribute("aria-label", last ? "Last section" : "Next section: " + names[i + 1]);
    down.setAttribute("aria-disabled", String(last));
    hud.classList.add("on");
  }

  if (!("IntersectionObserver" in window)) return;

  // A thin band a little above the middle of the viewport decides which
  // section is "being read"; the hero counts as no section at all.
  var hero = document.querySelector("header.hero");
  var band = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      activate(entry.target === hero ? -1 : sections.indexOf(entry.target));
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  if (hero) band.observe(hero);
  sections.forEach(function (s) { band.observe(s); });

  // The last section is short and may never reach the band.
  window.addEventListener("scroll", function () {
    var bottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    if (bottom) activate(sections.length - 1);
  }, { passive: true });
})();

/* --- welcome sequence ---------------------------------------------
   A short opening in the manner of an archive terminal: rings converge on
   "permission authorized", the view cuts to a welcome card, then it all
   shrinks out of focus and the page settles in underneath.

   Whether it plays was decided in the <head> (class "intro-pending"):
   once per browser session, never for reduced motion, a deep link or a
   background tab. Any click, key or scroll jumps straight to the exit.
   Every frame is a pure function of elapsed time, so skipping is exact.
   ------------------------------------------------------------------ */

var introDone = (function introSequence() {
  var root = document.documentElement;
  if (!root.classList.contains("intro-pending")) return Promise.resolve();
  try { sessionStorage.setItem("intro-seen", "1"); } catch (e) {}

  // Seconds from the start.
  var T = {
    rings: 0.05,    // arcs start converging from off-screen
    settle: 1.0,    // arcs reach their resting radius
    ornament: 0.5,  // inner arcs and amber dots appear
    blink: 0.84,    // brief zoom-and-fade of the rings
    cut: 1.65,      // inverted flash
    cutEnd: 1.73,
    name: 1.95,     // ink bar sweeps across the name
    sub: 2.45,      // "research archive" flickers on
    handover: 2.7,  // page starts revealing itself, still fully covered
    exit: 2.9,      // shrink, blur, fade
    end: 3.35
  };

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function span(t, a, b) { return clamp01((t - a) / (b - a)); }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function outCubic(p) { return 1 - Math.pow(1 - p, 3); }
  function outQuart(p) { return 1 - Math.pow(1 - p, 4); }
  function inOut(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  // Piecewise track through [time, value] keys, eased between each pair.
  function keyed(t, keys) {
    if (t <= keys[0][0]) return keys[0][1];
    for (var i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        var a = keys[i - 1], b = keys[i];
        return lerp(a[1], b[1], inOut((t - a[0]) / (b[0] - a[0])));
      }
    }
    return keys[keys.length - 1][1];
  }
  function arc(r, start, sweep) {
    if (sweep <= 0.001 || r <= 0) return "";
    function pt(a) { return (Math.cos(a) * r).toFixed(2) + "," + (Math.sin(a) * r).toFixed(2); }
    if (sweep >= Math.PI * 1.999) {
      return "M" + pt(start) + "A" + r + "," + r + " 0 1 1 " + pt(start + Math.PI) +
             "A" + r + "," + r + " 0 1 1 " + pt(start + 2 * Math.PI);
    }
    return "M" + pt(start) + "A" + r + "," + r + " 0 " + (sweep > Math.PI ? 1 : 0) + " 1 " + pt(start + sweep);
  }

  var overlay = document.createElement("div");
  overlay.className = "intro";
  overlay.innerHTML =
    '<div class="intro-stage" aria-hidden="true">' +
      '<span class="intro-corner intro-brand">🐑 Yang Zhang</span>' +
      '<span class="intro-corner intro-state">Verifying</span>' +
      '<span class="intro-corner intro-site">miemiemmmm.github.io</span>' +
      '<svg class="intro-rings" viewBox="-500 -500 1000 1000">' +
        '<path class="ring-outer"/><path class="ring-light"/>' +
        '<path class="ring-inner"/><path class="ring-inner"/>' +
        '<circle class="cap-outer"/><circle class="cap-light"/>' +
        '<circle class="intro-dot"/><circle class="intro-dot"/>' +
      '</svg>' +
      '<p class="intro-permission">Permission authorized</p>' +
      '<div class="intro-welcome">' +
        '<p class="intro-heading">Welcome to</p>' +
        '<p class="intro-name"><span class="intro-base">Yang Zhang</span>' +
          '<span class="intro-bar">Yang Zhang</span></p>' +
        '<p class="intro-cn" lang="zh-Hans">张杨</p>' +
        '<p class="intro-sub">Research archive</p>' +
        '<div class="intro-flash">Welcome to</div>' +
      '</div>' +
    '</div>' +
    '<button class="intro-skip" type="button">Enter ↗</button>';
  document.body.appendChild(overlay);
  root.classList.add("intro-lock");
  root.classList.remove("intro-pending");

  function q(s) { return overlay.querySelector(s); }
  var stage = q(".intro-stage"), rings = q(".intro-rings");
  var outer = q(".ring-outer"), light = q(".ring-light");
  var inner = overlay.querySelectorAll(".ring-inner");
  var capOuter = q(".cap-outer"), capLight = q(".cap-light");
  var dots = overlay.querySelectorAll(".intro-dot");
  var permission = q(".intro-permission"), welcome = q(".intro-welcome");
  var heading = q(".intro-heading"), name = q(".intro-name"), base = q(".intro-base"), bar = q(".intro-bar");
  var cn = q(".intro-cn"), sub = q(".intro-sub"), flash = q(".intro-flash"), state = q(".intro-state");
  var soft = null;   // blurred copy of the card, made at the handover

  // Only touch the DOM when a value changes. Rewriting identical styles or
  // text every frame still invalidates style and layout, which is what
  // made the first second stutter.
  var memo = new Map();
  function put(el, key, value) {
    var seen = memo.get(el);
    if (!seen) memo.set(el, seen = {});
    if (seen[key] === value) return;
    seen[key] = value;
    if (key === "text") el.textContent = value;
    else if (key.charAt(0) === "@") el.setAttribute(key.slice(1), value);
    else el.style[key] = value;
  }
  function dot(el, r, a, size) {
    put(el, "@cx", (Math.cos(a) * r).toFixed(1));
    put(el, "@cy", (Math.sin(a) * r).toFixed(1));
    put(el, "@r", size.toFixed(2));
  }

  function render(t) {
    // Permission: two arcs fall in from far outside, fast then slow, and
    // keep drifting once settled; the caption's tracking closes up.
    var scan = t < T.cut;
    put(rings, "display", scan ? "" : "none");
    put(permission, "display", scan ? "" : "none");
    if (scan) {
      var p = outQuart(span(t, T.rings, T.settle));
      var pl = outCubic(span(t, T.rings + 0.06, T.settle + 0.05));
      var drift = Math.max(0, t - T.settle) * 0.35;
      var oR = lerp(980, 300, p), oStart = lerp(-2.2, -0.25, p) + drift, oSweep = lerp(1.1, 1.82, p) * Math.PI;
      var lR = lerp(720, 258, pl), lStart = lerp(2.6, 1.05, pl) - drift * 0.6, lSweep = lerp(0.55, 1.55, pl) * Math.PI;
      put(outer, "@d", arc(oR, oStart, oSweep));
      put(light, "@d", arc(lR, lStart, lSweep));
      dot(capOuter, oR, oStart + oSweep, lerp(9, 4.2, p));
      dot(capLight, lR, lStart, lerp(5, 3.2, pl));

      var blink = t > T.blink && t < T.blink + 0.08;
      put(rings, "transform", blink ? "scale(1.035)" : "");
      put(rings, "opacity", blink ? "0.55" : "1");

      var po = outCubic(span(t, T.ornament, T.ornament + 0.7));
      var iStart = -0.9 - t * 0.9, iSweep = po * 0.62 * Math.PI;
      put(inner[0], "@d", arc(112, iStart, iSweep));
      put(inner[1], "@d", arc(112, iStart + Math.PI, iSweep));
      var orbit = 0.3 + t * 0.85;
      dot(dots[0], 192, orbit, 6 * po);
      dot(dots[1], 192, orbit + Math.PI, 6 * po);

      var pt = span(t, 0.12, 0.95);
      put(permission, "letterSpacing", lerp(0.95, 0.16, outCubic(pt)).toFixed(3) + "em");
      put(permission, "opacity", span(t, 0.12, 0.45).toFixed(3));
    }

    // Welcome: one inverted frame, then the card assembles.
    put(welcome, "display", scan ? "none" : "");
    put(flash, "display", t >= T.cut && t < T.cutEnd ? "" : "none");
    put(heading, "opacity", t >= T.cut ? "1" : "0");
    put(state, "text", scan ? "Verifying" : "Session authorized");
    if (!scan) state.classList.add("authorized");

    var pn = t - T.name;
    put(name, "opacity", pn >= 0 ? "1" : "0");
    var sweep = keyed(pn, [[0, 0], [0.05, 0.07], [0.12, 0.48], [0.24, 0.85], [0.6, 1]]);
    put(bar, "clipPath", "inset(0 " + (100 * (1 - sweep)).toFixed(2) + "% 0 0)");
    var grey = pn > 0.07 && pn < 0.12;   // a brief half-inverted frame mid-sweep
    put(bar, "opacity", grey ? "0.45" : "1");
    put(base, "opacity", grey ? "0.2" : "1");
    put(cn, "opacity", span(t, T.name + 0.1, T.name + 0.4).toFixed(3));

    var ps = t - T.sub;
    put(sub, "opacity", ps >= 0 && (ps < 0.04 || (ps >= 0.08 && ps < 0.12) || ps >= 0.16) ? "1" : "0");

    // Exit: the card shrinks and loses focus while the cover lifts.
    // Animating a blur radius re-renders the filter every frame, which
    // stutters on integrated GPUs. Instead a copy of the finished card with a
    // fixed blur is made at the handover (still under the opaque cover, so
    // its one-off render is unseen) and the two are cross-faded.
    if (t >= T.handover && !soft) {
      soft = welcome.cloneNode(true);
      soft.classList.add("intro-soft");
      welcome.parentNode.insertBefore(soft, welcome.nextSibling);
    }
    var pe = inOut(span(t, T.exit, T.end));
    var scale = pe ? "scale(" + (1 - 0.06 * pe).toFixed(4) + ")" : "";
    var defocus = clamp01(pe * 1.8);
    put(welcome, "transform", scale);
    put(welcome, "opacity", (1 - defocus).toFixed(3));
    if (soft) {
      put(soft, "transform", scale);
      put(soft, "opacity", Math.max(0.01, defocus).toFixed(3));
    }
    put(stage, "opacity", (1 - pe).toFixed(3));
    // From the handover the cover is 99.9% opaque: no visible change, but the
    // browser must start compositing the page beneath now, out of sight,
    // instead of on the first frame of the fade.
    var cover = 1 - span(t, T.exit + 0.1, T.end);
    put(overlay, "opacity", (t >= T.handover ? Math.min(0.999, cover) : 1).toFixed(3));
  }

  return new Promise(function (resolve) {
    var start = null, skipped = false;

    function skip() {
      if (start === null) { skipped = true; return; }
      var elapsed = (performance.now() - start) / 1000;
      if (elapsed < T.exit) start = performance.now() - T.exit * 1000;
    }
    var events = ["keydown", "wheel", "touchstart"];
    events.forEach(function (e) { window.addEventListener(e, skip, { passive: true }); });
    overlay.addEventListener("click", skip);

    function finish() {
      events.forEach(function (e) { window.removeEventListener(e, skip); });
      overlay.remove();
      resolve();
    }

    function frame(now) {
      var t = (now - start) / 1000;
      render(Math.min(t, T.end));
      // Hand over while the card is holding still and the cover is still
      // opaque: the page's first paint of its revealed content happens out of
      // sight, so the exit itself only has to fade.
      if (t >= T.handover) {
        root.classList.remove("intro-lock");
        resolve();
      }
      if (t >= T.end) finish();
      else requestAnimationFrame(frame);
    }
    // A freshly loaded page does one-off work in its first frames: creating
    // layers, compiling GPU shaders, swapping in web fonts, decoding images.
    // Let that happen on a still screen and only then start the clock, so
    // no hitch can land in the middle of the motion.
    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function frames(n) {
      return new Promise(function (r) {
        (function step() { if (n-- <= 0) r(); else requestAnimationFrame(step); })();
      });
    }
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    render(0);
    Promise.race([fonts, wait(800)])
      .then(function () { return frames(2); })
      .then(function () { return wait(120); })
      .then(function () {
        start = performance.now() - (skipped ? T.exit * 1000 : 0);
        requestAnimationFrame(frame);
      });
  });
})();

/* --- scroll reveal ---------------------------------------------- */

(function scrollReveal() {
  var groups = [
    ".hero-id > *",
    ".hero-portrait",
    ".hero-text > *",
    ".sec-label",
    "section h2",
    "section .section-note",
    ".fields > details",
    ".viewer-shell",
    "ol.pubs li",
    ".repo-grid .repo",
    "ul.timeline li",
    "#contact .reveal-mail, #contact .contact-mail, #contact .links"
  ];

  var targets = [];
  groups.forEach(function (selector) {
    var nodes = document.querySelectorAll(selector);
    nodes.forEach(function (el) {
      // Stagger each element against the siblings it shares a selector with.
      var siblings = Array.prototype.filter.call(el.parentElement.children, function (c) {
        return c.matches(selector);
      });
      el.style.setProperty("--d", siblings.indexOf(el) * 70 + "ms");
      el.classList.add("reveal");
      targets.push(el);
    });
  });

  if (!("IntersectionObserver" in window)) {
    targets.forEach(function (el) { el.classList.add("in"); });
    return;
  }

  // A heading that is wiped in starts fully clipped, and IntersectionObserver
  // counts a clipped element as invisible, so it would never be revealed.
  // Watch its container instead and reveal the heading through it.
  var watched = new Map();
  targets.forEach(function (el) {
    var proxy = el.matches("section h2") ? el.parentElement : el;
    if (!watched.has(proxy)) watched.set(proxy, []);
    watched.get(proxy).push(el);
  });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var els = watched.get(entry.target);
      if (!entry.isIntersecting || !els) return;
      els.forEach(function (el) { el.classList.add("in"); });
      watched.delete(entry.target);
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });

  introDone.then(function () {
    watched.forEach(function (_, proxy) { observer.observe(proxy); });
  });

  // The reveal line sits a little above the bottom edge, so content at the
  // very end of the page could stay hidden; release everything at the bottom.
  function flushAtBottom() {
    if (window.scrollY + window.innerHeight < document.documentElement.scrollHeight - 4) return;
    watched.forEach(function (els, proxy) {
      els.forEach(function (el) { el.classList.add("in"); });
      observer.unobserve(proxy);
    });
    watched.clear();
    window.removeEventListener("scroll", flushAtBottom);
  }
  window.addEventListener("scroll", flushAtBottom, { passive: true });
})();

/* --- rack wave ----------------------------------------------------
   Publications and software behave like folders in a rack: the one under
   the pointer (or keyboard focus) is pulled out, and the pull ripples to
   its neighbours, weaker and later the further away they are. Letting go
   settles the rack in the same order, outward from the last one touched.
   ------------------------------------------------------------------ */

(function rackWave() {
  if (reduceMotion.matches || !("IntersectionObserver" in window)) return;

  var AMPLITUDE = [1, 0.4, 0.14]; // by distance from the active item
  var DIM = 0.5;                  // brightness of items far from it
  var STEP = 55;                  // ms of delay per step of distance

  function rack(container, items, distanceFn) {
    var active = -1;
    function apply(index) {
      var dist = distanceFn();
      var origin = index >= 0 ? index : active;
      items.forEach(function (item, j) {
        var amp = index >= 0 ? (AMPLITUDE[dist(index, j)] || 0) : 0;
        var delay = origin >= 0 ? dist(origin, j) * STEP : 0;
        item.style.setProperty("--wave", amp);
        item.style.setProperty("--dim", index >= 0 ? DIM + (1 - DIM) * amp : 1);
        item.style.setProperty("--active", j === index ? 1 : 0);
        item.style.setProperty("--wave-delay", delay + "ms");
      });
      active = index;
    }
    items.forEach(function (item, i) {
      item.addEventListener("pointerenter", function (e) {
        if (e.pointerType === "mouse") apply(i);
      });
      item.addEventListener("focusin", function () { apply(i); });
    });
    container.addEventListener("pointerleave", function () { apply(-1); });
    container.addEventListener("focusout", function (e) {
      if (!container.contains(e.relatedTarget)) apply(-1);
    });
  }

  // --- research files: the same rack; opening a file selects it ---
  var files = document.querySelector(".fields");
  if (files) {
    var entries = Array.prototype.slice.call(files.children).filter(function (el) {
      return el.matches("details.field");
    });
    rack(files, entries, function () {
      return function (a, b) { return Math.abs(a - b); };
    });
  }

  // --- publications: a one-dimensional rack ----------------------
  var list = document.querySelector("ol.pubs");
  if (list) {
    var rows = Array.prototype.slice.call(list.children);
    rack(list, rows, function () {
      return function (a, b) { return Math.abs(a - b); };
    });

    // Index numbers roll up from 00 when the list comes into view.
    var setters = rows.map(function (row) {
      var idx = document.createElement("span");
      idx.className = "pub-idx";
      idx.setAttribute("aria-hidden", "true");
      row.insertBefore(idx, row.firstChild);
      return roller(idx, "00");
    });
    list.classList.add("has-roll");
    var counter = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      counter.disconnect();
      setters.forEach(function (set, i) {
        setTimeout(function () { set(pad(i + 1)); }, 250 + i * 90);
      });
    }, { rootMargin: "0px 0px -15% 0px" });
    counter.observe(list);
  }

  // --- software: a two-dimensional rack --------------------------
  var grid = document.querySelector(".repo-grid");
  if (grid) {
    var cells = Array.prototype.slice.call(grid.querySelectorAll("a.repo"));
    var columns = function () {
      var n = 0;
      while (n < cells.length && cells[n].offsetTop === cells[0].offsetTop) n++;
      return n || 1;
    };
    rack(grid, cells, function () {
      var cols = columns();
      return function (a, b) {
        return Math.max(
          Math.abs(Math.floor(a / cols) - Math.floor(b / cols)),
          Math.abs((a % cols) - (b % cols))
        );
      };
    });

    // Cells arrive in a diagonal sweep instead of one by one.
    var cols = columns();
    cells.forEach(function (cell, i) {
      cell.style.setProperty("--d", (Math.floor(i / cols) + (i % cols)) * 90 + "ms");
    });
  }
})();

/* --- theme toggle -------------------------------------------------
   Follows the system until the visitor picks; the choice is remembered.
   Fires "themechange" so the 3D viewer can recolour itself.
   ------------------------------------------------------------------ */

(function themeToggle() {
  var button = document.querySelector(".theme-toggle");
  var root = document.documentElement;

  function announce() { document.dispatchEvent(new CustomEvent("themechange")); }
  if (systemDark.addEventListener) systemDark.addEventListener("change", announce);
  if (!button) return;

  function label() {
    button.setAttribute("aria-label", effectiveTheme() === "dark" ? "Switch to light theme" : "Switch to dark theme");
  }
  label();
  button.hidden = false;

  button.addEventListener("click", function () {
    var next = effectiveTheme() === "dark" ? "light" : "dark";
    if (!reduceMotion.matches) root.classList.add("theme-anim");
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
    label();
    announce();
    setTimeout(function () { root.classList.remove("theme-anim"); }, 450);
  });
  if (systemDark.addEventListener) systemDark.addEventListener("change", label);
})();

/* --- binding pocket viewer --------------------------------------- */

(function pocketViewer() {
  var host = document.getElementById("viewer");
  if (!host) return;

  var fallback = document.getElementById("viewer-fallback");
  var structureUrl = host.dataset.structure;

  // Geometry of the example pocket: one bounding box cut into molecule blocks.
  var BOX_CENTER = [22.0947246, 36.49708133, 21.81810805];
  var BOX_SIZE = 16;
  var BLOCK_SIZE = 6;
  var BLOCK_CENTERS = [
    [34.88775634765625, 38.64504623413086, 18.944740295410156],
    [30.713611602783203, 42.00475311279297, 19.096406936645508],
    [28.294567108154297, 44.30536651611328, 17.057537078857422],
    [27.101287841796875, 45.99188232421875, 21.745433807373047],
    [21.747516632080078, 46.85906219482422, 26.61472511291504],
    [19.334928512573242, 44.54450225830078, 35.28935623168945],
    [16.974706649780273, 41.76900100708008, 31.347522735595703],
    [17.396854400634766, 37.726806640625, 27.266767501831055]
  ];

  function fail(message) {
    if (fallback) fallback.textContent = message;
  }

  // The 3D library is ~500 KB and its start-up work blocks the main thread
  // for a good half second, which stalled the opening animation. Fetch it
  // only after the opening, once the viewer is getting close to the screen;
  // most visits never scroll this far and never pay for it.
  var LIBRARY = "https://3Dmol.org/build/3Dmol-min.js";
  function hasWebGL() {
    try {
      var probe = document.createElement("canvas");
      return !!(probe.getContext("webgl2") || probe.getContext("webgl"));
    } catch (e) {
      return false;
    }
  }
  function loadLibrary() {
    // Without WebGL there is nothing 3Dmol can draw; say why, and skip the download.
    if (!hasWebGL()) {
      return fail("The 3D view needs WebGL, which is turned off or unavailable in this browser. " +
                  "The structure itself is in this repository under data/.");
    }
    if (typeof $3Dmol !== "undefined") return start();
    var tag = document.createElement("script");
    tag.src = LIBRARY;
    tag.async = true;
    tag.onload = start;
    tag.onerror = function () {
      fail("The 3D viewer could not be loaded. The structure is available in this repository under data/.");
    };
    document.head.appendChild(tag);
  }
  introDone.then(function () {
    if (!("IntersectionObserver" in window)) return loadLibrary();
    var near = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      near.disconnect();
      loadLibrary();
    }, { rootMargin: "800px 0px" });
    near.observe(host);
  });

  function start() {

  // Ligand and pocket residues are drawn in "ink": element colours as
  // usual, but carbon takes the page's text colour.
  function inkScheme() {
    var base = $3Dmol.elementColors && $3Dmol.elementColors.Jmol;
    if (!base) return "grayCarbon";
    var map = Object.assign({}, base, { C: parseInt(cssVar("--mol-ink").slice(1), 16) });
    return { prop: "elem", map: map };
  }

  fetch(structureUrl)
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.text();
    })
    .then(function (pdb) {
      var viewer = $3Dmol.createViewer(host, { backgroundColor: cssVar("--viewer-bg") });
      // 3Dmol returns nothing when the browser has no WebGL (disabled, blocked,
      // or no GPU); say so instead of leaving an empty box.
      if (!viewer) throw new Error("this browser has WebGL turned off or unavailable");
      viewer.addModel(pdb, "pdb");

      // Colours come from CSS custom properties, so the viewer follows the theme.
      function paint() {
        var protein = cssVar("--mol-protein");
        viewer.setBackgroundColor(cssVar("--viewer-bg"));
        viewer.setStyle({}, { cartoon: { color: protein } });
        viewer.setStyle(
          { resn: "LIG", byres: true, expand: 5 },
          { stick: { colorscheme: inkScheme() }, cartoon: { color: protein } }
        );

        viewer.removeAllShapes();
        viewer.addBox({
          center: { x: BOX_CENTER[0], y: BOX_CENTER[1], z: BOX_CENTER[2] },
          dimensions: { w: BOX_SIZE, h: BOX_SIZE, d: BOX_SIZE },
          color: cssVar("--mol-box"),
          opacity: 0.16
        });
        BLOCK_CENTERS.forEach(function (c) {
          viewer.addBox({
            center: { x: c[0], y: c[1], z: c[2] },
            dimensions: { w: BLOCK_SIZE, h: BLOCK_SIZE, d: BLOCK_SIZE },
            color: cssVar("--mol-block"),
            opacity: 0.85
          });
        });
        viewer.render();
      }

      paint();
      viewer.zoomTo();
      viewer.rotate(195, { x: 0, y: 1, z: 0 });
      viewer.render();

      // 3Dmol binds its own wheel handler, which would otherwise swallow page
      // scrolling whenever the cursor crosses the viewer. Only let it zoom while
      // a modifier is held; a plain wheel event scrolls the page as usual.
      host.addEventListener("wheel", function (event) {
        if (!event.ctrlKey && !event.metaKey) event.stopPropagation();
      }, true);

      // 3Dmol sizes its canvas once; re-measure when the layout changes.
      function resize() {
        viewer.resize();
        viewer.render();
      }
      window.addEventListener("resize", resize);
      document.addEventListener("themechange", paint);
      resize();
      // Only now is there something to show in place of the placeholder.
      if (fallback) fallback.remove();
    })
    .catch(function (error) {
      var reason = (error && error.message) || "unexpected error";
      fail("The 3D structure could not be shown (" + reason + ").");
    });
  }
})();

/* --- email reveal -------------------------------------------------
   The address is XOR-ed against a key, so neither the markup nor this
   file contains it as readable text. That defeats harvesters that scrape
   for an address pattern; it is obfuscation, not access control.
   ------------------------------------------------------------------ */

(function revealEmail() {
  var holder = document.getElementById("mail-reveal");
  var button = document.getElementById("mail-button");
  var out = document.getElementById("mail-out");
  if (!holder || !button || !out) return;

  var CIPHER = [17, 84, 3, 3, 87, 71, 50, 10, 30, 13, 77, 7, 10];
  var KEY = "h5md-trajectory-metadata";

  // Only offer the button once we know the script is running.
  holder.hidden = false;

  button.addEventListener("click", function () {
    var address = CIPHER.map(function (byte, i) {
      return String.fromCharCode(byte ^ KEY.charCodeAt(i % KEY.length));
    }).join("");

    var link = document.createElement("a");
    link.href = "mailto:" + address;
    link.textContent = address;
    out.replaceChildren(link);
    out.hidden = false;
    holder.hidden = true;
  });
})();

/* --- local time in Stockholm ------------------------------------
   Useful when writing from another time zone. Decorative for screen
   readers (it changes every second), so the footer hides it from them.
   ------------------------------------------------------------------ */

(function clock() {
  var holder = document.querySelector("footer .clock");
  if (!holder || !window.Intl) return;

  var format;
  try {
    format = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Stockholm",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZoneName: "short"
    });
  } catch (e) {
    return;
  }

  function now() {
    var parts = {};
    format.formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    return parts;
  }

  var tz = holder.querySelector(".clock-tz");
  var first = now();
  var setTime = roller(holder.querySelector(".clock-time"), first.hour + ":" + first.minute + ":" + first.second);
  tz.textContent = first.timeZoneName || "";
  holder.hidden = false;

  function tick() {
    var p = now();
    setTime(p.hour + ":" + p.minute + ":" + p.second);
    tz.textContent = p.timeZoneName || "";
    setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
  }
  setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
})();
