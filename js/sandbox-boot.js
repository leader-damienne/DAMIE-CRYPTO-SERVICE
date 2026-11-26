/* Capture piSandbox AVANT gate/redirects — Pi Browser peut dropper la query. */
(function () {
  "use strict";
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
      window.__dcsPiSandboxForced = true;
    } else if (flag === "0" || flag === "false") {
      localStorage.removeItem("dcs_pi_sandbox");
      sessionStorage.removeItem("dcs_pi_sandbox");
      window.__dcsPiSandboxForced = false;
    }
  } catch (e) {}
})();
