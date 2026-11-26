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
  /* true = Testnet / Test-Pi (app PiApps actuelle). false = Mainnet.
   * Override :
   *   - ?piSandbox=0 force Mainnet
   *   - ?piSandbox=1 / signin-testnet.html force Testnet
   */
  piSandbox: true,
  /* true = auth Pi + dépôt Pi SDK ; mode listing Ecosystem */
  piEcosystemMode: true
};

/* Appliquer override localStorage immédiatement (query souvent droppée par Pi Browser) */
(function () {
  try {
    var path = String(location.pathname || "").toLowerCase();
    if (
      /signin-testnet\.html$/i.test(path) ||
      /\/signin-testnet\/?$/i.test(path) ||
      localStorage.getItem("dcs_pi_sandbox") === "1" ||
      sessionStorage.getItem("dcs_pi_sandbox") === "1" ||
      window.__dcsPiSandboxForced === true
    ) {
      window.DCS_CONFIG.piSandbox = true;
    }
    var qp = new URLSearchParams(location.search || "");
    var flag = qp.get("piSandbox") || qp.get("sandbox");
    if (flag === "1" || flag === "true") {
      localStorage.setItem("dcs_pi_sandbox", "1");
      window.DCS_CONFIG.piSandbox = true;
    } else if (flag === "0" || flag === "false") {
      localStorage.removeItem("dcs_pi_sandbox");
      sessionStorage.removeItem("dcs_pi_sandbox");
      window.DCS_CONFIG.piSandbox = false;
    }
  } catch (e) {}
})();
