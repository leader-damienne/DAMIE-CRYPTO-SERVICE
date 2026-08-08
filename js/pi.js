/* DAMIE CRYPTO SERVICE — intégration Pi Network SDK (frontend) */
(function (global) {
  "use strict";

  var DCS = (global.DCS = global.DCS || {});

  function cfg() {
    return global.DCS_CONFIG || {};
  }

  function functionsUrl(name) {
    var base = (cfg().supabaseUrl || "").replace(/\/$/, "");
    return base + "/functions/v1/" + (name || "pi-payment");
  }

  function ecosystemMode() {
    return cfg().piEcosystemMode !== false;
  }

  function getAccessToken() {
    try {
      if (DCS.backend && DCS.backend.client) {
        return DCS.backend.client.auth.getSession().then(function (res) {
          return (res.data && res.data.session && res.data.session.access_token) || "";
        });
      }
    } catch (e) {}
    return Promise.resolve("");
  }

  function callPiBackend(action, body) {
    return getAccessToken().then(function (token) {
      if (!token) {
        return { ok: false, error: "Connectez-vous à DCS d'abord." };
      }
      return fetch(functionsUrl("pi-payment"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
          apikey: cfg().supabaseAnonKey || ""
        },
        body: JSON.stringify(Object.assign({ action: action }, body || {}))
      }).then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok || !data.ok) {
            return {
              ok: false,
              error: (data && data.error) || "Erreur serveur Pi (" + res.status + ")"
            };
          }
          return data;
        });
      });
    });
  }

  function isPiBrowser() {
    try {
      return !!(global.Pi && typeof global.Pi.init === "function");
    } catch (e) {
      return false;
    }
  }

  function ensurePiSdk() {
    return new Promise(function (resolve, reject) {
      if (isPiBrowser()) return resolve(global.Pi);
      var existing =
        document.querySelector('script[data-pi-sdk="1"]') ||
        document.querySelector('script[src*="sdk.minepi.com/pi-sdk"]');
      if (existing) {
        var tries = 0;
        var timer = setInterval(function () {
          tries += 1;
          if (isPiBrowser()) {
            clearInterval(timer);
            resolve(global.Pi);
          } else if (tries > 40) {
            clearInterval(timer);
            reject(new Error("SDK Pi chargé mais window.Pi indisponible (ouvrez dans Pi Browser)."));
          }
        }, 100);
        return;
      }
      var s = document.createElement("script");
      s.src = "https://sdk.minepi.com/pi-sdk.js";
      s.async = true;
      s.setAttribute("data-pi-sdk", "1");
      s.onload = function () {
        if (isPiBrowser()) resolve(global.Pi);
        else reject(new Error("SDK Pi chargé mais window.Pi indisponible."));
      };
      s.onerror = function () {
        reject(new Error("Impossible de charger sdk.minepi.com/pi-sdk.js"));
      };
      document.head.appendChild(s);
    });
  }

  var initPromise = null;

  function initPi() {
    if (initPromise) return initPromise;
    initPromise = ensurePiSdk().then(function (Pi) {
      var sandbox = cfg().piSandbox !== false;
      return Promise.resolve(Pi.init({ version: "2.0", sandbox: sandbox })).then(function () {
        return Pi;
      });
    });
    return initPromise;
  }

  function onIncompletePaymentFound(payment) {
    if (!payment || !payment.identifier) return;
    var paymentId = payment.identifier;
    var amount = Number(payment.amount) || 0;
    return callPiBackend("approve", {
      paymentId: paymentId,
      amount: amount,
      memo: (payment.memo || "DCS incomplete")
    }).then(function (apr) {
      if (!apr.ok) return;
      if (payment.transaction && payment.transaction.txid) {
        return callPiBackend("complete", {
          paymentId: paymentId,
          txid: payment.transaction.txid,
          amount: amount
        });
      }
    });
  }

  function authenticate() {
    return initPi().then(function (Pi) {
      return Pi.authenticate(["username", "payments"], onIncompletePaymentFound);
    });
  }

  /** Connexion DCS via Pi Authentication (listing Ecosystem). */
  function loginWithPi() {
    return authenticate()
      .then(function (auth) {
        var accessToken = auth && (auth.accessToken || auth.access_token);
        if (!accessToken) {
          return { ok: false, error: "Jeton Pi manquant après authentification." };
        }
        return fetch(functionsUrl("pi-auth"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: cfg().supabaseAnonKey || ""
          },
          body: JSON.stringify({
            accessToken: accessToken,
            uid: auth.user && auth.user.uid,
            username: auth.user && auth.user.username,
            referred_by: (function () {
              try {
                var r = localStorage.getItem("dcs_ref") || "";
                return r && r !== "—" ? r.replace(/^@+/, "") : "";
              } catch (e) {
                return "";
              }
            })()
          })
        }).then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok || !data.ok) {
              return {
                ok: false,
                error: (data && data.error) || "Connexion Pi refusée (" + res.status + ")"
              };
            }
            if (!DCS.backend || !DCS.backend.client) {
              return { ok: false, error: "Backend DCS non prêt." };
            }
            return DCS.backend.client.auth
              .setSession({
                access_token: data.access_token,
                refresh_token: data.refresh_token
              })
              .then(function (sess) {
                if (sess.error) {
                  return { ok: false, error: sess.error.message || "Session impossible." };
                }
                return DCS.auth.hydrate().then(function (ok) {
                  return ok
                    ? { ok: true, user: data.user }
                    : { ok: false, error: "Profil DCS introuvable après login Pi." };
                });
              });
          });
        });
      })
      .catch(function (err) {
        var msg = (err && err.message) || String(err);
        if (/Pi Browser|not available|undefined/i.test(msg) || !global.Pi) {
          return {
            ok: false,
            error:
              "Ouvrez DCS dans le Pi Browser pour vous connecter avec Pi (exigence Ecosystem)."
          };
        }
        return { ok: false, error: msg };
      });
  }

  function depositWithPi(amount) {
    var MIN_DEPOSIT_PI = 0.0000001;
    var amt = Number(amount);
    if (!(amt >= MIN_DEPOSIT_PI)) {
      return Promise.resolve({
        ok: false,
        error: "Montant minimum de dépôt : 0,0000001 PI."
      });
    }
    if (!DCS.user || !DCS.user.id) {
      return Promise.resolve({ ok: false, error: "Connectez-vous à DCS." });
    }

    return authenticate()
      .then(function (auth) {
        var Pi = global.Pi;
        var memo = "DCS deposit " + String(DCS.user.id).slice(0, 8);
        return new Promise(function (resolve) {
          Pi.createPayment(
            {
              amount: amt,
              memo: memo,
              metadata: {
                app: "DAMIE_CRYPTO_SERVICE",
                userId: DCS.user.id,
                kind: "deposit"
              }
            },
            {
              onReadyForServerApproval: function (paymentId) {
                callPiBackend("approve", {
                  paymentId: paymentId,
                  amount: amt,
                  memo: memo
                }).then(function (res) {
                  if (!res.ok) {
                    resolve({ ok: false, error: res.error || "Approve échoué (vérifiez PI_API_KEY / JWT OFF)." });
                  }
                }).catch(function (err) {
                  resolve({
                    ok: false,
                    error: (err && err.message) || "Erreur réseau approve Pi."
                  });
                });
              },
              onReadyForServerCompletion: function (paymentId, txid) {
                callPiBackend("complete", {
                  paymentId: paymentId,
                  txid: txid,
                  amount: amt
                }).then(function (res) {
                  if (!res.ok) {
                    resolve({ ok: false, error: res.error || "Complete échoué." });
                    return;
                  }
                  resolve({
                    ok: true,
                    amount: (res.amount != null ? res.amount : amt),
                    piUser: auth && auth.user ? auth.user.username : "",
                    paymentId: paymentId,
                    txid: txid
                  });
                });
              },
              onCancel: function (paymentId) {
                callPiBackend("cancel", { paymentId: paymentId });
                resolve({ ok: false, error: "Paiement annulé.", cancelled: true });
              },
              onError: function (error) {
                resolve({
                  ok: false,
                  error: (error && (error.message || String(error))) || "Erreur Pi SDK."
                });
              }
            }
          );
        });
      })
      .catch(function (err) {
        var msg = (err && err.message) || String(err);
        if (/Pi Browser|not available|undefined/i.test(msg) || !global.Pi) {
          return {
            ok: false,
            error:
              "Ouvrez DCS dans le Pi Browser (sandbox ou production) pour payer en Pi. Chrome classique ne peut pas signer les paiements Pi."
          };
        }
        return { ok: false, error: msg };
      });
  }

  DCS.pi = {
    init: initPi,
    authenticate: authenticate,
    loginWithPi: loginWithPi,
    depositWithPi: depositWithPi,
    isAvailable: isPiBrowser,
    ecosystemMode: ecosystemMode,
    callBackend: callPiBackend
  };
})(typeof window !== "undefined" ? window : this);
