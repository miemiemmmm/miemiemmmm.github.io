/* ---------------------------------------------------------------
   Yang Zhang — personal homepage
   Two independent pieces: scroll reveal, and the 3Dmol pocket view.
   Both degrade quietly: the page is fully readable without either.
   --------------------------------------------------------------- */

(function currentYear() {
  var el = document.getElementById("year");
  if (el) el.textContent = new Date().getFullYear();
})();

/* --- scroll reveal ---------------------------------------------- */

(function scrollReveal() {
  var groups = [
    ".hero .wrap > *",
    "section h2",
    "section .section-note",
    ".fields > details",
    ".viewer-shell",
    "ol.pubs li",
    ".repo-grid .repo",
    "ul.timeline li",
    "#contact .contact-mail, #contact .links"
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

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("in");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });

  targets.forEach(function (el) { observer.observe(el); });
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

  var darkMode = window.matchMedia("(prefers-color-scheme: dark)");

  function backgroundColor() {
    return darkMode.matches ? "#1b2221" : "#f4f2ec";
  }

  function fail(message) {
    if (fallback) fallback.textContent = message;
  }

  if (typeof $3Dmol === "undefined") {
    fail("The 3D viewer could not be loaded. The structure is available in this repository under data/.");
    return;
  }

  fetch(structureUrl)
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.text();
    })
    .then(function (pdb) {
      if (fallback) fallback.remove();

      var viewer = $3Dmol.createViewer(host, { backgroundColor: backgroundColor() });
      viewer.addModel(pdb, "pdb");
      viewer.setStyle({}, { cartoon: { color: "#9aa3a0" } });
      viewer.setStyle(
        { resn: "LIG", byres: true, expand: 5 },
        { stick: { colorscheme: "greenCarbon" }, cartoon: {} }
      );

      viewer.addBox({
        center: { x: BOX_CENTER[0], y: BOX_CENTER[1], z: BOX_CENTER[2] },
        dimensions: { w: BOX_SIZE, h: BOX_SIZE, d: BOX_SIZE },
        color: "#adf7d1",
        opacity: 0.5
      });

      BLOCK_CENTERS.forEach(function (c) {
        viewer.addBox({
          center: { x: c[0], y: c[1], z: c[2] },
          dimensions: { w: BLOCK_SIZE, h: BLOCK_SIZE, d: BLOCK_SIZE },
          color: "#8971d0",
          opacity: 0.9
        });
      });

      viewer.zoomTo();
      viewer.rotate(195, { x: 0, y: 1, z: 0 });
      viewer.render();

      // 3Dmol binds its own wheel handler, which would otherwise swallow page
      // scrolling whenever the cursor crosses the viewer. Only let it zoom while
      // a modifier is held; a plain wheel event scrolls the page as usual.
      host.addEventListener("wheel", function (event) {
        if (!event.ctrlKey && !event.metaKey) event.stopPropagation();
      }, true);

      // 3Dmol sizes its canvas once; re-measure when the layout or theme changes.
      function resize() {
        viewer.resize();
        viewer.render();
      }
      window.addEventListener("resize", resize);
      if (darkMode.addEventListener) {
        darkMode.addEventListener("change", function () {
          viewer.setBackgroundColor(backgroundColor());
          viewer.render();
        });
      }
      resize();
    })
    .catch(function (error) {
      fail("The structure could not be loaded (" + error.message + ").");
    });
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
