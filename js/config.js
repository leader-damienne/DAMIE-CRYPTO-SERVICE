/* Configuration production DCS — projet Supabase damie-crypto-service */
window.DCS_CONFIG = {
  supabaseUrl: "https://ednllwrfxkoouqparqjx.supabase.co",
  supabaseAnonKey: "sb_publishable_roPk4hoMqF5V7aczuOknjQ_Qch20W1z",
  /*
   * URL PiNet (App Studio / partage) — ne pas confondre avec l’URL d’hébergement.
   * Hébergement vérifié (validation-key.txt) :
   *   https://appdcs.com/
   *   https://damie-crypto-service.netlify.app/
   * Dans Developer Portal → Production URL : une de ces URLs (idéalement appdcs.com).
   */
  piNetBaseUrl: "https://damiecryptoservi2345.pinet.com/",
  /* true = Testnet / Test-Pi (entrée PiApps normale, sans ?piSandbox=1).
   * Override App Studio seulement : ?piSandbox=0|1 ou signin-testnet.html
   */
  piSandbox: true,
  /* true = auth Pi + dépôt Pi SDK ; mode listing Ecosystem */
  piEcosystemMode: true
};

/* Sandbox dès le boot : config prod + Pi Browser, sans URL spéciale */
(function () {
  try {
    var path = String(location.pathname || "").toLowerCase();
    var qp = new URLSearchParams(location.search || "");
    var flag = qp.get("piSandbox") || qp.get("sandbox");
    if (flag === "0" || flag === "false") {
      localStorage.removeItem("dcs_pi_sandbox");
      sessionStorage.removeItem("dcs_pi_sandbox");
      window.DCS_CONFIG.piSandbox = false;
      return;
    }
    if (
      flag === "1" ||
      flag === "true" ||
      /signin-testnet\.html$/i.test(path) ||
      /\/signin-testnet\/?$/i.test(path) ||
      localStorage.getItem("dcs_pi_sandbox") === "1" ||
      sessionStorage.getItem("dcs_pi_sandbox") === "1" ||
      window.__dcsPiSandboxForced === true ||
      window.DCS_CONFIG.piSandbox === true
    ) {
      window.DCS_CONFIG.piSandbox = true;
      try {
        localStorage.setItem("dcs_pi_sandbox", "1");
        sessionStorage.setItem("dcs_pi_sandbox", "1");
      } catch (eSet) {}
    }
  } catch (e) {}
})();
