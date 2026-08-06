/* Redirection auth immédiate — avant CSS/images lourds */
(function () {
  var PUBLIC = {
    "signup.html": 1,
    "signin.html": 1,
    "join.html": 1,
    "contact.html": 1
  };
  var path = (location.pathname || "").replace(/\/+$/, "");
  path = (path.split("/").pop() || "index.html").split("?")[0].toLowerCase();
  if (!path || path === "/" || path === ".") path = "index.html";
  if (!/\.html$/i.test(path)) path += ".html";
  if (PUBLIC[path]) return;

  function hasSession() {
    try {
      var raw = localStorage.getItem("dcs_session");
      if (raw) {
        var s = JSON.parse(raw);
        if (s && (s.username || s.userId)) return true;
      }
    } catch (e) {}
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

  if (hasSession()) return;
  location.replace("signin.html?next=" + encodeURIComponent(path));
})();
