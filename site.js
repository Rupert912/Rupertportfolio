/* site.js — the one script every page links.
   Handles: dark/light mode, accordions, Open all / Close all (Experience),
   project filter chips, the Gallery accordion + lightbox, and the visit log. */
(function () {
  "use strict";

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ---------- dark / light mode (remembered across pages) ---------- */
  var track = '<div class="toggle-track"><div class="toggle-thumb"></div></div>';
  var modeBtn = document.getElementById("modeBtn");
  function applyMode(light) {
    document.body.classList.toggle("light-mode", light);
    if (modeBtn) modeBtn.innerHTML = (light ? "☀️ Light " : "🌙 Dark ") + track;
  }
  function saved() { try { return localStorage.getItem("siteMode"); } catch (e) { return null; } }
  function save(light) { try { localStorage.setItem("siteMode", light ? "light" : "dark"); } catch (e) {} }
  if (saved() === "light") applyMode(true);
  if (modeBtn) modeBtn.addEventListener("click", function () {
    var light = !document.body.classList.contains("light-mode");
    applyMode(light); save(light);
  });

  /* ---------- accordions (one open at a time) ---------- */
  $$(".accordion-btn").forEach(function (btn) {
    var panel = btn.nextElementSibling;
    if (!panel) return;
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", function () {
      var open = panel.style.display === "block";
      $$(".accordion-content").forEach(function (p) {
        p.style.display = "none";
        if (p.previousElementSibling) p.previousElementSibling.setAttribute("aria-expanded", "false");
      });
      if (!open) { panel.style.display = "block"; btn.setAttribute("aria-expanded", "true"); }
    });
  });

  /* ---------- Experience: Open all / Close all ---------- */
  var xpOpen = document.getElementById("xpOpen"), xpClose = document.getElementById("xpClose");
  if (xpOpen && xpClose) {
    var cards = $$(".xp-card");
    xpOpen.addEventListener("click", function () { cards.forEach(function (c) { c.open = true; }); });
    xpClose.addEventListener("click", function () { cards.forEach(function (c) { c.open = false; }); });
  }

  /* ---------- Projects: filter chips ---------- */
  var chips = $$("#pgFilters .pg-chip"), items = $$("#pgGrid .pg-item");
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var f = chip.getAttribute("data-filter");
      chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c === chip)); });
      items.forEach(function (it) { it.hidden = !(f === "all" || it.getAttribute("data-cat") === f); });
    });
  });

  /* ---------- Gallery: accordion + lightbox ---------- */
  var gBtns = $$(".gallery-btn");
  if (gBtns.length) {
    gBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var panel = btn.nextElementSibling;
        $$(".gallery-content").forEach(function (c) { if (c !== panel) c.style.maxHeight = null; });
        panel.style.maxHeight = panel.style.maxHeight ? null : panel.scrollHeight + "px";
      });
    });
    var lightbox = document.getElementById("lightbox"), lbImg = document.getElementById("lightbox-img");
    var images = [], current = 0;
    function show() { lbImg.src = images[current]; }
    $$(".thumb").forEach(function (img) {
      img.addEventListener("click", function (e) {
        var group = $$(".thumb", e.target.parentElement);
        images = group.map(function (i) { return i.src; });
        current = group.indexOf(e.target);
        show(); lightbox.style.display = "flex";
      });
    });
    $(".right").onclick = function () { current = (current + 1) % images.length; show(); };
    $(".left").onclick = function () { current = (current - 1 + images.length) % images.length; show(); };
    document.getElementById("close-btn").onclick = function () { lightbox.style.display = "none"; };
    lightbox.onclick = function (e) { if (e.target === lightbox) lightbox.style.display = "none"; };
    document.addEventListener("keydown", function (e) {
      if (lightbox.style.display !== "flex") return;
      if (e.key === "Escape") lightbox.style.display = "none";
      if (e.key === "ArrowRight") $(".right").onclick();
      if (e.key === "ArrowLeft") $(".left").onclick();
    });
  }

  /* ---------- visit log (only on pages whose script tag has data-visit-log) ---------- */
  var me = document.currentScript;
  if (me && me.hasAttribute("data-visit-log")) {
    var s = document.createElement("script");
    s.src = "visit-log.js";
    s.defer = true;
    document.head.appendChild(s);
  }
})();
