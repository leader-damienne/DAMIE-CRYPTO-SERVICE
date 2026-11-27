/* Redirection auth + correctif viewport Pi Browser / WebView */
(function () {
  try {
    var content =
      "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";
    var vp = document.querySelector('meta[name="viewport"]');
    if (!vp) {
      vp = document.createElement("meta");
      vp.setAttribute("name", "viewport");
      (document.head || document.documentElement).appendChild(vp);
    }
    vp.setAttribute("content", content);
    document.documentElement.style.width = "100%";
    document.documentElement.style.maxWidth = "100%";
    document.documentElement.style.overflowX = "hidden";
    if (document.body) {
      document.body.style.width = "100%";
      document.body.style.maxWidth = "100%";
      document.body.style.overflowX = "hidden";
      document.body.style.margin = "0";
    } else {
      document.addEventListener("DOMContentLoaded", function () {
        document.body.style.width = "100%";
        document.body.style.maxWidth = "100%";
        document.body.style.overflowX = "hidden";
        document.body.style.margin = "0";
      });
    }
  } catch (e) {}

  /* Persister piSandbox dès l’entrée (avant tout redirect) */
  function captureSandboxFlag() {
    try {
      var qp = new URLSearchParams(location.search || "");
      var hash = String(location.hash || "").replace(/^#/, "");
      var hp = new URLSearchParams(hash.indexOf("=") >= 0 ? hash : "");
      var path = String(location.pathname || "").toLowerCase();
      var flag =
        qp.get("piSandbox") ||
        qp.get("sandbox") ||
        hp.get("piSandbox") ||
        hp.get("sandbox") ||
        "";
      if (
        /signin-testnet\.html$/i.test(path) ||
        /\/signin-testnet\/?$/i.test(path)
      ) {
        flag = "1";
      }
      if (flag === "1" || flag === "true") {
        localStorage.setItem("dcs_pi_sandbox", "1");
        sessionStorage.setItem("dcs_pi_sandbox", "1");
        return true;
      }
      if (flag === "0" || flag === "false") {
        localStorage.removeItem("dcs_pi_sandbox");
        sessionStorage.removeItem("dcs_pi_sandbox");
        return false;
      }
    } catch (eCap) {}
    return null;
  }
  captureSandboxFlag();

  function sandboxActive() {
    try {
      if (localStorage.getItem("dcs_pi_sandbox") === "1") return true;
      if (sessionStorage.getItem("dcs_pi_sandbox") === "1") return true;
    } catch (e) {}
    return false;
  }

  /** Construit une URL signin. Sandbox = DCS_CONFIG / localStorage — pas de ?piSandbox forcé. */
  function buildSigninUrl(nextPage) {
    var qs = new URLSearchParams();
    if (nextPage) qs.set("next", nextPage);
    try {
      var cur = new URLSearchParams(location.search || "");
      /* Conserver verify/stay/ref si présents ; ne PAS injecter piSandbox=1 */
      ["verify", "stay", "force_pi_auth", "ref", "u"].forEach(function (k) {
        var v = cur.get(k);
        if (v != null && v !== "" && !qs.has(k)) qs.set(k, v);
      });
    } catch (eQ) {}
    var base = sandboxActive() ? "signin-testnet.html" : "signin.html";
    var s = qs.toString();
    return s ? base + "?" + s : base;
  }
  try {
    window.__dcsBuildSigninUrl = buildSigninUrl;
  } catch (eW) {}

  /* Pi Browser : bloquer seulement les sorties hors site pendant Verify.
     Ne PAS neutraliser window.open partout — le SDK Pi (Allow / paiement) en a besoin. */
  try {
    var _dcsOpen = window.open.bind(window);
    window.open = function (url, name, features) {
      try {
        var qp = new URLSearchParams(location.search || "");
        var verifyMode =
          qp.get("verify") === "1" ||
          qp.get("stay") === "1";
        var u = url == null ? "" : String(url);
        if (
          verifyMode &&
          u &&
          u !== "about:blank" &&
          u.indexOf("javascript:") !== 0
        ) {
          var abs = u;
          try {
            abs = new URL(u, location.href).href;
          } catch (eAbs) {}
          var sameHost = false;
          try {
            sameHost = new URL(abs).hostname === location.hostname;
          } catch (eHost) {}
          var piRelated =
            /minepi\.com|pinet\.com|pi\.net|sdk\.minepi/i.test(abs);
          if (!sameHost && !piRelated) {
            return null;
          }
        }
      } catch (eGate) {}
      return _dcsOpen(url, name, features);
    };
  } catch (eOpen) {}

  /* Capturer parrainage : /=pseudo · ?ref= · ?=pseudo · host=pseudo */
  try {
    var ref = "";
    var params = new URLSearchParams(location.search || "");
    ref = params.get("ref") || params.get("u") || params.get("") || "";
    if (!ref && location.search) {
      var sm = String(location.search).match(/^[?&]=([^&#]+)/);
      if (sm) ref = decodeURIComponent(sm[1]);
    }
    if (!ref) {
      var pm = String(location.pathname || "").match(/\/=([^\/?#]+)/);
      if (pm) ref = decodeURIComponent(pm[1]);
    }
    if (!ref) {
      var href = String(location.href || "");
      var hm = href.match(/\.pinet\.com=([^\/?#&]+)/i);
      if (hm) ref = decodeURIComponent(hm[1]);
    }
    ref = String(ref || "")
      .trim()
      .replace(/^@+/, "");
    if (ref && ref !== "—") {
      localStorage.setItem("dcs_ref", ref);
      localStorage.setItem("dcs_ref_user", ref);
    }
  } catch (eRef) {}

  var PUBLIC = {
    "signup.html": 1,
    "signin.html": 1,
    "signin-testnet.html": 1,
    "join.html": 1,
    "contact.html": 1,
    "privacy.html": 1,
    "terms.html": 1
  };
  var path = (location.pathname || "").replace(/\/+$/, "");
  path = (path.split("/").pop() || "index.html").split("?")[0].toLowerCase();
  if (!path || path === "/" || path === ".") path = "index.html";
  if (!/\.html$/i.test(path)) path += ".html";
  if (PUBLIC[path]) return;

  /* App Studio Verify / Pi Browser : NE PAS rediriger vers signin
     (sinon on quitte l’URL ouverte par App Studio et Verify échoue). */
  try {
    var qpGate = new URLSearchParams(location.search || "");
    var piUa = /PiBrowser|PiNetwork|pinetwork/i.test(navigator.userAgent || "");
    if (
      piUa ||
      qpGate.get("verify") === "1" ||
      qpGate.get("stay") === "1" ||
      qpGate.get("force_pi_auth") === "1"
    ) {
      return;
    }
  } catch (ePi) {}

  function hasSupabaseSession() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf("sb-") !== 0 || k.indexOf("auth-token") < 0) continue;
        var v = JSON.parse(localStorage.getItem(k) || "null");
        if (v && (v.access_token || (v.currentSession && v.currentSession.access_token))) {
          return true;
        }
      }
    } catch (e2) {}
    return false;
  }

  /* Ne plus faire confiance à dcs_session seul (peut être périmé) */
  if (hasSupabaseSession()) return;
  try {
    localStorage.removeItem("dcs_session");
  } catch (e3) {}
  location.replace(buildSigninUrl(path));
})();
