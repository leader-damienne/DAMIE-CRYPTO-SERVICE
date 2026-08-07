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

  var PUBLIC = {
    "signup.html": 1,
    "signin.html": 1,
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
  location.replace("signin.html?next=" + encodeURIComponent(path));
})();
