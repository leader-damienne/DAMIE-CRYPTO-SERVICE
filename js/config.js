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
  /* false = Mainnet production (claim .pi / App Studio Verify) ; true = Sandbox Develop only */
  piSandbox: false,
  /* true = auth Pi + dépôt Pi SDK ; mode listing Ecosystem */
  piEcosystemMode: true
};
