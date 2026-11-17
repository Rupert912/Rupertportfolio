/*
 * ============================================================
 *  RUPERT BURGER — VISIT LOGGER
 *  Add this to every page with one line, just before </body>:
 *      <script src="visit-log.js" defer></script>
 * ============================================================
 *
 *  What it records: page visited, time, how long they stayed,
 *  city + country, the company or ISP their network belongs to,
 *  device and browser, and where they came from.
 *
 *  It does NOT record names, emails, or anything you type.
 *
 *  To stop logging your own visits, open your site once with:
 *      rupertitcyberx.co.za/index.html?rbx=off
 *  To start logging yourself again:
 *      rupertitcyberx.co.za/index.html?rbx=on
 */

(function () {
  "use strict";

  /* ---------- 1. Settings — fill these in ---------- */

  var ENDPOINT    = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";
  var WRITE_TOKEN = "rb-site-2026";   // must match WRITE_TOKEN in Code.gs
  var LOG_LOCAL   = false;            // true = also log visits while testing on your own PC


  /* ---------- 2. Should we log this visit at all? ---------- */

  var params = new URLSearchParams(window.location.search);
  if (params.get("rbx") === "off") {
    try { localStorage.setItem("rbx_off", "1"); } catch (e) {}
    console.log("Visit logging turned off on this device.");
  }
  if (params.get("rbx") === "on") {
    try { localStorage.removeItem("rbx_off"); } catch (e) {}
    console.log("Visit logging turned back on for this device.");
  }

  var optedOut = false;
  try { optedOut = localStorage.getItem("rbx_off") === "1"; } catch (e) {}
  if (optedOut) return;

  var host = window.location.hostname;
  var isLocal = !host || host === "localhost" || host === "127.0.0.1" || window.location.protocol === "file:";
  if (isLocal && !LOG_LOCAL) return;

  if (ENDPOINT.indexOf("PASTE_YOUR") === 0) {
    console.warn("visit-log.js: web app URL not set yet.");
    return;
  }


  /* ---------- 3. Who is this, roughly ---------- */

  function makeId() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  var visitorId, visitorType, sessionId;

  try {
    visitorId = localStorage.getItem("rbx_vid");
    if (!visitorId) {
      visitorId = makeId();
      localStorage.setItem("rbx_vid", visitorId);
      visitorType = "new";
    } else {
      visitorType = "returning";
    }
  } catch (e) {
    visitorId = makeId();
    visitorType = "unknown";
  }

  try {
    sessionId = sessionStorage.getItem("rbx_sid");
    if (!sessionId) {
      sessionId = makeId();
      sessionStorage.setItem("rbx_sid", sessionId);
    }
  } catch (e) {
    sessionId = makeId();
  }

  var hitId = makeId() + makeId();


  /* ---------- 4. Device and browser ---------- */

  var ua = navigator.userAgent;

  function readDevice() {
    if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return "Tablet";
    if (/Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua)) return "Phone";
    return "Computer";
  }

  function readBrowser() {
    if (/Edg\//.test(ua))                       return "Edge";
    if (/OPR\/|Opera/.test(ua))                 return "Opera";
    if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return "Chrome";
    if (/Firefox\//.test(ua))                   return "Firefox";
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
    if (/bot|crawl|spider|slurp|bing|duckduck/i.test(ua)) return "Bot";
    return "Other";
  }

  function readOs() {
    if (/Windows NT 10/.test(ua))  return "Windows 10/11";
    if (/Windows/.test(ua))        return "Windows";
    if (/Android/.test(ua))        return "Android";
    if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
    if (/Mac OS X/.test(ua))       return "macOS";
    if (/Linux/.test(ua))          return "Linux";
    return "Other";
  }


  /* ---------- 5. Where in the world, and whose network ---------- */
  /*  ipwho.is is free and needs no key. ipapi.co is the backup.
      The result is cached for the session so we only ask once
      per visitor, no matter how many pages they open.          */

  function lookUpLocation() {
    var cached;
    try { cached = sessionStorage.getItem("rbx_geo"); } catch (e) {}
    if (cached) {
      try { return Promise.resolve(JSON.parse(cached)); } catch (e) {}
    }

    function save(geo) {
      try { sessionStorage.setItem("rbx_geo", JSON.stringify(geo)); } catch (e) {}
      return geo;
    }

    return fetch("https://ipwho.is/")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || d.success === false) throw new Error("ipwho failed");
        var c = d.connection || {};
        return save({
          ip:      d.ip     || "",
          city:    d.city   || "",
          region:  d.region || "",
          country: d.country || "",
          company: c.org || c.isp || "",
          domain:  c.domain || "",
          asn:     c.asn ? ("AS" + c.asn) : ""
        });
      })
      .catch(function () {
        return fetch("https://ipapi.co/json/")
          .then(function (r) { return r.json(); })
          .then(function (d) {
            return save({
              ip:      d.ip || "",
              city:    d.city || "",
              region:  d.region || "",
              country: d.country_name || "",
              company: d.org || "",
              domain:  "",
              asn:     d.asn || ""
            });
          });
      })
      .catch(function () {
        return { ip: "", city: "", region: "", country: "", company: "", domain: "", asn: "" };
      });
  }


  /* ---------- 6. Sending ---------- */
  /*  text/plain avoids a CORS preflight, which Apps Script cannot answer. */

  function send(payload) {
    payload.token = WRITE_TOKEN;
    var body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      var blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
      if (navigator.sendBeacon(ENDPOINT, blob)) return;
    }

    fetch(ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: body
    }).catch(function () {});
  }


  /* ---------- 7. Log the page view ---------- */

  var pageName = window.location.pathname.split("/").pop() || "index.html";

  lookUpLocation().then(function (geo) {
    send({
      type:        "view",
      hitId:       hitId,
      page:        decodeURIComponent(pageName),
      title:       document.title || "",
      referrer:    document.referrer || "",
      country:     geo.country,
      city:        geo.city,
      region:      geo.region,
      company:     geo.company,
      domain:      geo.domain,
      asn:         geo.asn,
      ip:          geo.ip,
      device:      readDevice(),
      browser:     readBrowser(),
      os:          readOs(),
      screen:      window.screen.width + "x" + window.screen.height,
      language:    navigator.language || "",
      visitorId:   visitorId,
      sessionId:   sessionId,
      visitorType: visitorType
    });
  });


  /* ---------- 8. Log how long they stayed ---------- */

  var arrived = Date.now();
  var reported = false;

  function reportTime() {
    if (reported) return;
    reported = true;
    var seconds = Math.round((Date.now() - arrived) / 1000);
    if (seconds < 1 || seconds > 7200) return;
    send({ type: "leave", hitId: hitId, seconds: seconds });
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") reportTime();
  });
  window.addEventListener("pagehide", reportTime);

})();
