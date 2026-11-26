/* DAMIE CRYPTO SERVICE — admin A2U (App → User) */
(function () {
  "use strict";

  var SECRET_KEY = "dcs_a2u_admin_secret";
  var SIGNIN_TESTNET = "https://appdcs.com/signin.html?piSandbox=1";

  function cfg() {
    return window.DCS_CONFIG || {};
  }

  function functionsUrl() {
    return String(cfg().supabaseUrl || "").replace(/\/$/, "") + "/functions/v1/pi-a2u";
  }

  function logEl() {
    return document.getElementById("a2u-log");
  }

  function setLog(msg, kind) {
    var el = logEl();
    if (!el) return;
    el.textContent = typeof msg === "string" ? msg : JSON.stringify(msg, null, 2);
    el.classList.remove("is-ok", "is-err");
    if (kind === "ok") el.classList.add("is-ok");
    if (kind === "err") el.classList.add("is-err");
  }

  function getSecret() {
    var input = document.getElementById("a2u-admin-secret");
    var v = (input && input.value) || "";
    if (!v) {
      try {
        v = sessionStorage.getItem(SECRET_KEY) || "";
      } catch (e) {}
    }
    return String(v).trim();
  }

  function persistSecret() {
    var v = getSecret();
    var input = document.getElementById("a2u-admin-secret");
    if (input && !input.value && v) input.value = v;
    try {
      if (v) sessionStorage.setItem(SECRET_KEY, v);
    } catch (e) {}
    return v;
  }

  function getAccessToken() {
    if (!(window.DCS && DCS.backend && typeof DCS.backend.init === "function")) {
      return Promise.resolve("");
    }
    return DCS.backend.init().then(function () {
      if (!DCS.backend.client) return "";
      return DCS.backend.client.auth.getSession().then(function (res) {
        return (res.data && res.data.session && res.data.session.access_token) || "";
      });
    });
  }

  function formatError(res) {
    var err = (res && res.error) || "Erreur serveur";
    var link = (res && res.signinTestnetUrl) || SIGNIN_TESTNET;
    if (/user_not_found|Mainnet uniquement|uid Mainnet|pi_uid_testnet/i.test(err)) {
      err +=
        "\n\n→ Auth Testnet : " +
        link +
        "\n→ Puis « Charger la liste » et choisissez un chip vert (Testnet).";
    }
    if (res && res.detail) {
      err += "\n" + JSON.stringify(res.detail, null, 2);
    }
    return err;
  }

  function callA2u(action, body) {
    var secret = persistSecret();
    if (!secret) {
      return Promise.resolve({ ok: false, error: "Saisissez le secret admin." });
    }
    return getAccessToken().then(function (token) {
      if (!token) {
        return { ok: false, error: "Connectez-vous à DCS d’abord (signin / Pi)." };
      }
      return fetch(functionsUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
          apikey: cfg().supabaseAnonKey || "",
          "x-dcs-admin-secret": secret
        },
        body: JSON.stringify(Object.assign({ action: action }, body || {}))
      }).then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok || !data.ok) {
            return {
              ok: false,
              error: (data && data.error) || "Erreur serveur (" + res.status + ")",
              detail: data && data.detail,
              signinTestnetUrl: data && data.signinTestnetUrl
            };
          }
          return data;
        });
      });
    });
  }

  function currentFilter() {
    var sel = document.getElementById("a2u-filter");
    return (sel && sel.value) || "all";
  }

  function renderRecipients(res) {
    var box = document.getElementById("a2u-recipients");
    if (!box) return;
    var list = (res && res.recipients) || [];
    var meta = document.getElementById("a2u-list-meta");
    if (meta) {
      if (res && res.schemaReady === false) {
        meta.innerHTML =
          '<span style="color:#e8a0a0">Schéma incomplet — exécutez <code>pi-uid-testnet.sql</code>.</span>';
      } else {
        meta.textContent =
          "Testnet prêts : " +
          (res.testnetCount != null ? res.testnetCount : "—") +
          " · Mainnet seul : " +
          (res.mainnetOnlyCount != null ? res.mainnetOnlyCount : "—");
      }
    }
    if (!list.length) {
      box.innerHTML =
        '<p style="font-size:0.85rem;color:var(--muted)">Aucun destinataire pour ce filtre. ' +
        'Faites Allow via <a href="' +
        SIGNIN_TESTNET +
        '">' +
        SIGNIN_TESTNET +
        "</a>.</p>";
      return;
    }
    box.innerHTML = list
      .map(function (r) {
        var label = r.pi_username || r.username || "?";
        var ready = !!r.testnetReady;
        var a2uUid = r.a2uUid || r.pi_uid_testnet || "";
        var mainUid = r.pi_uid || "";
        var badge = ready ? "Testnet" : "Mainnet seul";
        var cls = "recipient-chip" + (ready ? " is-testnet" : " is-mainnet");
        return (
          '<button type="button" class="' +
          cls +
          '" data-ready="' +
          (ready ? "1" : "0") +
          '" data-uid="' +
          String(a2uUid || mainUid).replace(/"/g, "") +
          '" data-a2u="' +
          String(a2uUid).replace(/"/g, "") +
          '" data-main="' +
          String(mainUid).replace(/"/g, "") +
          '" data-user="' +
          String(label).replace(/"/g, "") +
          '"><span class="chip-badge">' +
          badge +
          "</span> " +
          label +
          " · " +
          String(a2uUid || mainUid).slice(0, 8) +
          "…</button>"
        );
      })
      .join("");
    box.querySelectorAll(".recipient-chip").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var ready = btn.getAttribute("data-ready") === "1";
        var u = document.getElementById("a2u-username");
        var i = document.getElementById("a2u-uid");
        var user = btn.getAttribute("data-user") || "";
        var a2u = btn.getAttribute("data-a2u") || "";
        if (u) u.value = user;
        if (!ready) {
          if (i) i.value = "";
          setLog(
            "« " +
              user +
              " » n’a que l’uid Mainnet — A2U Testnet refusera (user_not_found).\n\n" +
              "Demandez-lui d’ouvrir :\n" +
              SIGNIN_TESTNET +
              "\n→ Continuer avec Pi → Allow\n→ Rechargez la liste (badge vert Testnet).",
            "err"
          );
          return;
        }
        if (i) i.value = a2u;
        setLog("Destinataire Testnet sélectionné : @" + user + " · uid " + a2u.slice(0, 12) + "…", "ok");
      });
    });
  }

  function renderProgress(res) {
    var label = document.getElementById("a2u-progress-label");
    var detail = document.getElementById("a2u-progress-detail");
    if (!label) return;
    if (!res || !res.ok) {
      label.textContent = "Progression : — / 5";
      if (detail) {
        detail.textContent =
          (res && res.error) ||
          "Impossible de lire la progression (pi-a2u déployée ? secret OK ?).";
      }
      return;
    }
    var n = Number(res.uniqueCount) || 0;
    var target = Number(res.target) || 5;
    label.textContent =
      "Progression : " + n + " / " + target + (res.ready ? " ✓ seuil atteint" : "");
    if (detail) {
      var names = (res.recipients || [])
        .map(function (r) {
          return (r.username || r.uid || "?").toString();
        })
        .slice(0, 8);
      detail.textContent = names.length
        ? "Wallets uniques : " + names.join(", ") + (res.remaining ? " · reste " + res.remaining : "")
        : "Aucun A2U completed encore. Envoie vers 5 pi_uid_testnet distincts.";
    }
  }

  function refreshProgress() {
    return callA2u("progress").then(function (res) {
      renderProgress(res);
      return res;
    });
  }

  function loadRecipients() {
    setLog("Chargement destinataires…");
    return callA2u("list_recipients", { filter: currentFilter() }).then(function (res) {
      if (!res.ok) {
        setLog(formatError(res), "err");
        return res;
      }
      renderRecipients(res);
      var msg =
        (res.testnetCount || 0) +
        " Testnet / " +
        (res.mainnetOnlyCount || 0) +
        " Mainnet seul.";
      if (res.warning) msg += "\n" + res.warning;
      setLog(msg, res.testnetCount ? "ok" : "err");
      return res;
    });
  }

  var lastIncompleteId = "";

  function bind() {
    var secretInput = document.getElementById("a2u-admin-secret");
    try {
      var saved = sessionStorage.getItem(SECRET_KEY) || "";
      if (secretInput && saved) secretInput.value = saved;
    } catch (e) {}

    var checkBtn = document.getElementById("a2u-check-btn");
    if (checkBtn) {
      checkBtn.addEventListener("click", function () {
        setLog("Vérification…");
        callA2u("status").then(function (res) {
          if (!res.ok) {
            setLog(
              formatError(res) +
                "\n\nSi NOT_FOUND / Failed to fetch : déployez pi-a2u (voir guide A2U).",
              "err"
            );
            document.getElementById("a2u-status").textContent = res.error;
            return;
          }
          var line =
            "API key: " +
            (res.hasApiKey ? "OK" : "MANQUANTE") +
            (res.usingDedicatedA2uKey ? " (PI_A2U_API_KEY)" : " (fallback PI_API_KEY ⚠)") +
            " · Seed: " +
            (res.hasWalletSeed ? "OK" : "MANQUANT") +
            (res.walletPublicKey ? " · G… " + res.walletPublicKey.slice(0, 8) + "…" : "");
          document.getElementById("a2u-status").textContent = line;
          var ok = res.hasApiKey && res.hasWalletSeed && res.usingDedicatedA2uKey;
          setLog(
            res.warning ? JSON.stringify(res, null, 2) : res,
            ok ? "ok" : "err"
          );
          refreshProgress();
        });
      });
    }

    var progressBtn = document.getElementById("a2u-progress-btn");
    if (progressBtn) {
      progressBtn.addEventListener("click", function () {
        setLog("Chargement progression…");
        refreshProgress().then(function (res) {
          if (!res.ok) setLog(formatError(res), "err");
          else setLog(res, "ok");
        });
      });
    }

    var listBtn = document.getElementById("a2u-list-btn");
    if (listBtn) {
      listBtn.addEventListener("click", function () {
        loadRecipients();
      });
    }

    var filterSel = document.getElementById("a2u-filter");
    if (filterSel) {
      filterSel.addEventListener("change", function () {
        loadRecipients();
      });
    }

    var sendBtn = document.getElementById("a2u-send-btn");
    if (sendBtn) {
      sendBtn.addEventListener("click", function () {
        var username = (document.getElementById("a2u-username") || {}).value || "";
        var uid = (document.getElementById("a2u-uid") || {}).value || "";
        var amount = Number((document.getElementById("a2u-amount") || {}).value || 0);
        var memo = (document.getElementById("a2u-memo") || {}).value || "DCS A2U Testnet";
        if (!username && !uid) {
          setLog("Indiquez un username ou un pi_uid Testnet.", "err");
          return;
        }
        sendBtn.disabled = true;
        setLog("Envoi A2U en cours (create → chain → complete)…");
        callA2u("send", {
          username: String(username).trim(),
          uid: String(uid).trim(),
          amount: amount,
          memo: String(memo).trim()
        }).then(function (res) {
          sendBtn.disabled = false;
          if (!res.ok) {
            setLog(formatError(res), "err");
            return;
          }
          setLog(res, "ok");
          refreshProgress();
        });
      });
    }

    var incompleteBtn = document.getElementById("a2u-incomplete-btn");
    if (incompleteBtn) {
      incompleteBtn.addEventListener("click", function () {
        callA2u("incomplete").then(function (res) {
          if (!res.ok) {
            setLog(formatError(res), "err");
            return;
          }
          var pays = res.payments || [];
          lastIncompleteId = pays[0] && pays[0].identifier ? pays[0].identifier : "";
          setLog(res, pays.length ? "err" : "ok");
        });
      });
    }

    var resumeBtn = document.getElementById("a2u-resume-btn");
    if (resumeBtn) {
      resumeBtn.addEventListener("click", function () {
        if (!lastIncompleteId) {
          setLog("Listez d’abord les incomplets.", "err");
          return;
        }
        callA2u("resume", { paymentId: lastIncompleteId }).then(function (res) {
          setLog(res.ok ? res : formatError(res), res.ok ? "ok" : "err");
        });
      });
    }

    var cancelBtn = document.getElementById("a2u-cancel-btn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", function () {
        if (!lastIncompleteId) {
          setLog("Listez d’abord les incomplets.", "err");
          return;
        }
        callA2u("cancel", { paymentId: lastIncompleteId }).then(function (res) {
          setLog(res.ok ? res : formatError(res), res.ok ? "ok" : "err");
          lastIncompleteId = "";
        });
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
