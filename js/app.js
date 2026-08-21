(function () {
  const fmt = {
    usd(n, digits) {
      if (n > 0 && n < 0.01) {
        return (
          "$" +
          Number(n).toLocaleString("en-US", {
            minimumFractionDigits: 6,
            maximumFractionDigits: 6
          })
        );
      }
      const d = digits != null ? digits : n >= 1000 ? 2 : n >= 1 ? 4 : 6;
      return (
        "$" +
        Number(n).toLocaleString("en-US", {
          minimumFractionDigits: d,
          maximumFractionDigits: d
        })
      );
    },
    price(m) {
      if (m.symbol === "XOF" || m.symbol === "XAF") {
        return (DCS.CFA_PER_USD || 600) + " / $1";
      }
      if (m.stable && m.symbol === "PI") return fmt.piUsd();
      return fmt.usd(m.price, m.price >= 1000 ? 2 : undefined);
    },
    piUsd(n) {
      const peg = n != null ? Number(n) : Number((window.DCS && DCS.PI_PRICE) || 314159);
      return (
        peg.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " $"
      );
    },
    vol(n) {
      if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
      if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
      if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
      return "$" + n.toFixed(0);
    },
    change(n) {
      const sign = n > 0 ? "+" : "";
      return sign + n.toFixed(2) + "%";
    },
    amount(n) {
      return Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 7 });
    }
  };

  function isEcosystemMode() {
    try {
      return !(window.DCS_CONFIG && DCS_CONFIG.piEcosystemMode === false);
    } catch (e) {
      return true;
    }
  }

  /** Toast visible + rafraîchissement liste (la persistance DB vient du trigger SQL / RPC) */
  function showToast(title, body) {
    try {
      var existing = document.getElementById("dcs-toast");
      if (existing) existing.remove();
      var el = document.createElement("div");
      el.id = "dcs-toast";
      el.className = "dcs-toast";
      el.setAttribute("role", "status");
      el.innerHTML =
        "<strong>" +
        String(title || "Notification").replace(/</g, "&lt;") +
        "</strong>" +
        (body
          ? "<span>" + String(body).replace(/</g, "&lt;") + "</span>"
          : "");
      document.body.appendChild(el);
      requestAnimationFrame(function () {
        el.classList.add("show");
      });
      setTimeout(function () {
        el.classList.remove("show");
        setTimeout(function () {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 350);
      }, 4500);
    } catch (e) {}
  }

  function pushTxNotice(title, body, kind) {
    showToast(title, body);
    if (!window.DCS || !DCS.backend) return Promise.resolve();
    var chain = Promise.resolve();
    if (typeof DCS.backend.notifyMe === "function") {
      chain = DCS.backend.notifyMe(title, body || "", kind || "tx").catch(function () {});
    }
    return chain.then(function () {
      if (typeof DCS.backend.loadNotifications !== "function") return;
      return DCS.backend.loadNotifications().then(function () {
        if (typeof renderNotifications === "function") renderNotifications();
      });
    });
  }

  /** Conformité listing Pi Ecosystem : auth Pi + transactions Pi only. */
  function applyEcosystemCompliance() {
    if (!isEcosystemMode()) return;

    /* Swap + Transfer réactivés. Auth reste Pi-only. */
    document.querySelectorAll("#main-nav a, .footer-col a, .footer-bottom a").forEach(function (a) {
      const href = (a.getAttribute("href") || "").toLowerCase();
      if (/signup\.html/.test(href)) {
        a.setAttribute("href", "signin.html");
        if (/inscri/i.test(a.textContent || "")) a.textContent = "Connexion Pi";
      }
    });

    document.querySelectorAll(".module-link").forEach(function (a) {
      const href = (a.getAttribute("href") || "").toLowerCase();
      if (/profil/.test(href)) {
        const p = a.querySelector("p");
        if (p) p.textContent = "Profil Pioneer Pi, avatar et préférences.";
      }
    });

    /* Profil : masquer e-mail / téléphone / mot de passe / KYC (lignes, pas tout le panneau) */
    /* (appliqué plus bas après le wallet, pour garder l’upload avatar) */

    /* Contact : pas de collecte e-mail */
    const contactEmail = document.getElementById("contact-email");
    if (contactEmail) {
      const g = contactEmail.closest(".form-group");
      if (g) g.style.display = "none";
      contactEmail.required = false;
    }

    /* Wallet : masquer seulement le dépôt manuel / adresse hors SDK — PAS le bouton Pi */
    const manualDeposit = document.getElementById("deposit-request-form");
    if (manualDeposit) manualDeposit.style.display = "none";

    const depAddr = document.getElementById("deposit-address");
    if (depAddr) {
      const addrBox = depAddr.closest(".ref-code-box") || depAddr.parentElement;
      const addrPanel = depAddr.closest(".panel");
      /* Ne cacher que le sous-bloc adresse, jamais #wallet-deposit (qui contient le bouton Pi) */
      if (addrPanel && addrPanel.id !== "wallet-deposit" && !addrPanel.querySelector("#pi-deposit-btn")) {
        addrPanel.style.display = "none";
      } else if (addrBox) {
        const hint = document.getElementById("deposit-hint");
        addrBox.style.display = "none";
        if (hint) hint.style.display = "none";
        const label = addrPanel && addrPanel.querySelector("div");
        if (label && /ID de dépôt/i.test(label.textContent || "")) label.style.display = "none";
      }
    }

    const piBtn = document.getElementById("pi-deposit-btn");
    const walletDep = document.getElementById("wallet-deposit");
    if (walletDep) walletDep.style.display = "";
    if (piBtn) {
      piBtn.style.display = "";
      const piWrap = piBtn.closest(".panel");
      if (piWrap) piWrap.style.display = "";
    }

    /* Profil : ne pas cacher tout le panneau sécurité (avatar upload) — masquer les lignes ciblées */
    ["link-gmail", "link-phone"].forEach(function (id) {
      const el = document.getElementById(id);
      if (!el) return;
      const row = el.closest(".status-row") || el.parentElement;
      if (row) row.style.display = "none";
    });
    const pwForm = document.getElementById("change-password-form");
    if (pwForm) pwForm.style.display = "none";
    const startKyc = document.getElementById("start-kyc");
    if (startKyc) {
      const kycRow = startKyc.closest(".status-row") || startKyc.parentElement;
      if (kycRow) kycRow.style.display = "none";
    }
    const resetKyc = document.getElementById("reset-kyc");
    if (resetKyc) resetKyc.style.display = "none";
    document.querySelectorAll(".kyc-steps").forEach(function (el) {
      const panel = el.closest(".panel");
      if (panel) panel.style.display = "none";
    });
    const editEmail = document.getElementById("edit-email");
    if (editEmail) {
      const eg = editEmail.closest(".form-group");
      if (eg) eg.style.display = "none";
    }
    const forgotPanel = document.getElementById("forgot-password-panel");
    if (forgotPanel) forgotPanel.style.display = "none";
    const pwChangePanel = document.getElementById("change-password-form");
    if (pwChangePanel) {
      const panel = pwChangePanel.closest(".panel");
      if (panel) panel.style.display = "none";
    }
    document.querySelectorAll(".module-link h3").forEach(function (h) {
      if (/KYC/i.test(h.textContent || "")) h.textContent = "Profil";
    });
  }

  function sparkPath(seed, up, flat) {
    const pts = [];
    let y = 16;
    for (let i = 0; i < 12; i++) {
      if (flat) {
        y = 14 + Math.sin(i * 0.4) * 0.6;
      } else {
        const wave = Math.sin(i * 0.9 + seed) * 6;
        const trend = up ? -i * 0.35 : i * 0.35;
        y = Math.max(4, Math.min(24, 14 + wave + trend));
      }
      pts.push(`${i * 8},${y}`);
    }
    return pts.join(" ");
  }

  function coinLogo(item, sizeClass) {
    const src = item.logo || (item.iconClass ? "assets/coins/" + item.iconClass + ".svg" : "");
    const alt = item.symbol || item.name || "coin";
    const piClass = item.symbol === "PI" || item.iconClass === "pi" ? "pi" : "";
    if (src) {
      const resolved = item.symbol === "PI" || item.iconClass === "pi"
        ? "assets/coins/pi.png"
        : src;
      return `<span class="coin-icon ${piClass} ${sizeClass || ""}"><img src="${resolved}" alt="${alt}" width="34" height="34" loading="lazy" /></span>`;
    }
    return `<span class="coin-icon ${item.iconClass || ""} ${sizeClass || ""}">${item.iconText || "?"}</span>`;
  }

  function renderTicker() {
    const el = document.getElementById("ticker-track");
    if (!el || !window.DCS) return;
    const items = DCS.markets
      .map((m) => {
        if (m.stable) {
          const label =
            m.symbol === "PI"
              ? fmt.usd(m.price, 0)
              : m.symbol === "XOF" || m.symbol === "XAF"
                ? "≈ " + DCS.CFA_PER_USD + "/$"
                : fmt.usd(m.price);
          return `<span class="ticker-item"><strong>${m.pair}</strong> ${label} <span class="up">Stable</span></span>`;
        }
        const cls = m.change24h >= 0 ? "up" : "down";
        return `<span class="ticker-item"><strong>${m.pair}</strong> ${fmt.usd(m.price)} <span class="${cls}">${fmt.change(m.change24h)}</span></span>`;
      })
      .join("");
    /* Double le contenu pour un défilement infini fluide */
    el.innerHTML = items + items;
  }

  function renderPiSpotlight() {
    const priceEl = document.getElementById("pi-price");
    const changeEl = document.getElementById("pi-change");
    const highEl = document.getElementById("pi-high");
    const lowEl = document.getElementById("pi-low");
    const volEl = document.getElementById("pi-vol");
    const usdPegEl = document.getElementById("pi-usd-peg");
    if (!window.DCS) return;
    lockPiPrice();
    lockCfaParity();
    const peg = DCS.PI_PRICE || 314159;
    const pegLabel = fmt.piUsd(peg);
    if (priceEl) priceEl.textContent = pegLabel;
    if (usdPegEl) usdPegEl.textContent = pegLabel;
    if (changeEl) {
      changeEl.innerHTML = `<span class="up">PI COIN</span><span style="color:var(--muted)">0,00 % 24h · Stable · ${pegLabel}</span>`;
    }
    if (highEl) highEl.textContent = pegLabel;
    if (lowEl) lowEl.textContent = pegLabel;
    const pi = DCS.markets.find((m) => m.id === "pi");
    if (volEl && pi) volEl.textContent = fmt.vol(pi.volume);

    const xofEl = document.getElementById("pi-xof");
    const xafEl = document.getElementById("pi-xaf");
    const cfa = (peg * (DCS.CFA_PER_USD || 600)).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
    if (xofEl) xofEl.textContent = cfa + " XOF";
    if (xafEl) xafEl.textContent = cfa + " XAF";
  }

  function renderMarkets(filter) {
    const tbody = document.getElementById("markets-body");
    if (!tbody || !window.DCS) return;
    const q = (filter || "").trim().toLowerCase();
    const rows = DCS.markets
      .filter((m) => {
        if (!q) return true;
        if (q === "fiat" || q === "cfa") return !!m.fiat || m.symbol === "USDT";
        return (
          m.symbol.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          m.pair.toLowerCase().includes(q)
        );
      })
      .map((m) => {
        const up = m.change24h >= 0;
        const changeCls = m.stable ? "change-up" : up ? "change-up" : "change-down";
        const changeLabel = m.stable ? "0,00 % · Stable" : fmt.change(m.change24h);
        const featured = m.featured ? "featured" : "";
        const stroke = m.stable ? "#d4af37" : up ? "#0ecb81" : "#f6465d";
        const badge = m.stable
          ? `<small>${m.name}${m.featured ? " · PI COIN DCS" : " · Stable"}</small>`
          : `<small>${m.name} · ${m.pair}</small>`;
        return `<tr class="${featured}" data-id="${m.id}">
          <td>
            <div class="coin-cell">
              ${coinLogo(m)}
              <div class="coin-name">${m.symbol}${m.featured ? " ★" : ""}${badge}</div>
            </div>
          </td>
          <td class="price-cell">${fmt.price(m)}</td>
          <td class="${changeCls}">${changeLabel}</td>
          <td>${fmt.vol(m.volume)}</td>
          <td>
            <svg class="spark" viewBox="0 0 88 28" aria-hidden="true">
              <polyline fill="none" stroke="${stroke}" stroke-width="1.8" points="${sparkPath(m.symbol.charCodeAt(0), up, !!m.stable)}" />
            </svg>
          </td>
          <td><button class="trade-btn" type="button" data-swap="${m.symbol}">Swap</button></td>
        </tr>`;
      })
      .join("");
    tbody.innerHTML = rows || `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:2rem">Aucun marché trouvé</td></tr>`;

    tbody.querySelectorAll("[data-swap]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const to = btn.dataset.swap;
        const from = to === "PI" ? "XOF" : "PI";
        location.href = "swap.html?from=" + encodeURIComponent(from) + "&to=" + encodeURIComponent(to);
      });
    });
  }

  function getWalletAssets() {
    if (!window.DCS) return [];
    const bySymbol = {};
    (DCS.wallet || []).forEach((w) => {
      bySymbol[w.symbol] = w;
    });
    const markets = Array.isArray(DCS.markets) && DCS.markets.length
      ? DCS.markets
      : [{ symbol: "PI", name: "PI COIN", iconClass: "pi", logo: "assets/coins/pi.png" }];
    let assets = markets.map((m) => {
      const held = bySymbol[m.symbol];
      return {
        symbol: m.symbol,
        name: m.name,
        amount: held ? Number(held.amount) || 0 : 0,
        iconClass: m.iconClass || "",
        iconText: m.iconText || "",
        logo: m.logo || (held && held.logo) || ""
      };
    });
    /* Si PI n’est pas dans markets (filtre trop agressif), le rajouter depuis le wallet */
    if (!assets.some((a) => a.symbol === "PI")) {
      const held = bySymbol.PI;
      assets.unshift({
        symbol: "PI",
        name: (held && held.name) || "PI COIN",
        amount: held ? Number(held.amount) || 0 : 0,
        iconClass: "pi",
        iconText: "",
        logo: "assets/coins/pi.png"
      });
    }
    return assets;
  }

  function isBalanceHidden() {
    try {
      return localStorage.getItem("dcs_hide_balance") === "1";
    } catch (e) {
      return false;
    }
  }

  function setBalanceHidden(hidden) {
    try {
      localStorage.setItem("dcs_hide_balance", hidden ? "1" : "0");
    } catch (e) {}
  }

  function syncBalanceToggleUi() {
    const btn = document.getElementById("toggle-hide-balance");
    const label = document.getElementById("toggle-hide-balance-label");
    const icon = document.getElementById("toggle-hide-balance-icon");
    const hidden = isBalanceHidden();
    if (btn) {
      btn.setAttribute("aria-pressed", hidden ? "true" : "false");
      btn.setAttribute("aria-label", hidden ? "Afficher le solde" : "Masquer le solde");
      btn.title = hidden ? "Afficher le solde" : "Masquer le solde";
    }
    if (label) label.textContent = hidden ? "Afficher" : "Masquer";
    if (icon) icon.textContent = hidden ? "👁‍🗨" : "👁";
  }

  function setupWalletBalanceToggle() {
    const btn = document.getElementById("toggle-hide-balance");
    if (!btn || btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    syncBalanceToggleUi();
    btn.addEventListener("click", function () {
      setBalanceHidden(!isBalanceHidden());
      syncBalanceToggleUi();
      renderWallet();
    });
  }

  function renderWallet() {
    const list = document.getElementById("wallet-assets");
    const piBalEl = document.getElementById("wallet-pi-balance");
    const piUsdEl = document.getElementById("wallet-pi-usd");
    const totalEl = document.getElementById("wallet-total");
    const countEl = document.getElementById("wallet-assets-count");
    if (!window.DCS) return;

    const hide = isBalanceHidden();
    syncBalanceToggleUi();

    const assets = getWalletAssets();
    const piFromWallet = (DCS.wallet || []).find((w) => w.symbol === "PI");
    const piAsset = assets.find((w) => w.symbol === "PI");
    const piAmount = piFromWallet
      ? Number(piFromWallet.amount) || 0
      : piAsset
        ? piAsset.amount
        : 0;
    const piPrice = DCS.PI_PRICE || 314159;
    const piUsd = piAmount * piPrice;

    if (piBalEl) {
      piBalEl.textContent = hide
        ? "•••••• PI"
        : Number(piAmount).toLocaleString("fr-FR", {
            maximumFractionDigits: 7
          }) + " PI";
      piBalEl.classList.toggle("is-hidden-balance", hide);
    }
    if (piUsdEl) {
      piUsdEl.textContent = hide ? "≈ $••••" : "≈ " + fmt.usd(piUsd, 2);
    }

    if (!list) {
      if (totalEl) totalEl.textContent = hide ? "$••••" : fmt.usd(piUsd, 2);
      return;
    }

    let total = 0;
    list.innerHTML = assets
      .map((a) => {
        const market = DCS.markets.find((m) => m.symbol === a.symbol);
        const price = market ? market.price : a.symbol === "PI" ? piPrice : 0;
        const value = a.amount * price;
        total += value;
        const amountLabel =
          a.symbol === "XOF" || a.symbol === "XAF"
            ? Number(a.amount).toLocaleString("fr-FR", { maximumFractionDigits: 0 })
            : fmt.amount(a.amount);
        return (
          '<div class="asset-row">' +
          '<div class="coin-cell">' +
          coinLogo(a) +
          '<div class="coin-name">' +
          a.symbol +
          "<small>" +
          a.name +
          "</small></div>" +
          "</div>" +
          '<div style="text-align:right">' +
          "<strong>" +
          (hide ? "•••• " + a.symbol : amountLabel + " " + a.symbol) +
          "</strong>" +
          '<div style="font-size:0.75rem;color:var(--muted)">' +
          (hide ? "$••••" : fmt.usd(value, 2)) +
          "</div>" +
          "</div>" +
          "</div>"
        );
      })
      .join("");
    if (countEl) countEl.textContent = assets.length + " jetons";
    if (totalEl) totalEl.textContent = hide ? "$••••" : fmt.usd(total, 2);
  }

  function setupDeposit() {
    const addressEl = document.getElementById("deposit-address");
    const copyBtn = document.getElementById("copy-deposit-address");
    const hint = document.getElementById("deposit-hint");
    if (!addressEl || !copyBtn) return;

    async function loadAddress() {
      let addr = "";
      if (window.DCS && DCS.backend && DCS.backend.ensureDepositAddress) {
        const res = await DCS.backend.ensureDepositAddress();
        addr = (res && res.address) || "";
      }
      if (!addr && DCS.user && DCS.user.id) {
        addr =
          "DCS-PI-" +
          String(DCS.user.id).replace(/-/g, "").toUpperCase().slice(0, 16);
      }
      addressEl.value = addr || "Connexion requise";
      if (hint) {
        hint.innerHTML = addr
          ? "Utilisez <strong>Déposer via Pi Browser</strong> pour créditer votre wallet."
          : "Connectez-vous pour obtenir votre ID de dépôt.";
      }
    }

    copyBtn.addEventListener("click", () => {
      const val = addressEl.value;
      if (!val || val === "Connexion requise") {
        alert("Aucune adresse à copier.");
        return;
      }
      addressEl.select();
      navigator.clipboard.writeText(val).then(
        () => alert("ID de dépôt copié :\n" + val),
        () => alert(val)
      );
    });

    loadAddress();
  }

  function setupPiDeposit() {
    const MIN_DEPOSIT_PI = 0.0000001;
    const btn = document.getElementById("pi-deposit-btn");
    const amountEl = document.getElementById("pi-deposit-amount");
    const status = document.getElementById("pi-deposit-status");
    if (!btn || btn.dataset.piBound === "1") return;
    btn.dataset.piBound = "1";

    function setStatus(msg, isErr) {
      if (!status) return;
      status.hidden = false;
      status.style.display = "block";
      status.textContent = msg;
      status.style.color = isErr ? "#f6465d" : "var(--gold-bright)";
    }

    async function startDeposit() {
      if (!window.DCS || !DCS.pi) {
        setStatus("Module Pi non chargé. Rechargez la page dans le Pi Browser.", true);
        alert("Module Pi non chargé. Rechargez dans le Pi Browser.");
        return;
      }
      const amount = parseFloat(amountEl && amountEl.value) || 0;
      if (!(amount >= MIN_DEPOSIT_PI)) {
        setStatus("Montant minimum : 0,0000001 PI.", true);
        alert("Montant minimum de dépôt : 0,0000001 PI.");
        return;
      }
      const prevLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Ouverture Pi…";
      setStatus("Ouverture du paiement Pi… (ne fermez pas la fenêtre)");
      let res;
      try {
        res = await Promise.race([
          DCS.pi.depositWithPi(amount),
          new Promise(function (resolve) {
            setTimeout(function () {
              resolve({
                ok: false,
                error:
                  "Délai dépassé. Ouvrez le site dans le Pi Browser et réessayez."
              });
            }, 120000);
          })
        ]);
      } catch (err) {
        res = { ok: false, error: (err && err.message) || String(err) };
      }
      btn.disabled = false;
      btn.textContent = prevLabel || "Déposer via Pi Browser";
      if (!res || !res.ok) {
        setStatus((res && res.error) || "Échec du dépôt Pi.", true);
        if (!(res && res.cancelled)) alert((res && res.error) || "Échec du dépôt Pi.");
        return;
      }
      setStatus("Dépôt confirmé : +" + res.amount + " PI" + (res.piUser ? " · @" + res.piUser : ""));
      if (DCS.backend) {
        await Promise.all([
          DCS.backend.loadWallet(),
          DCS.backend.loadHistory(),
          DCS.backend.loadNotifications ? DCS.backend.loadNotifications() : Promise.resolve()
        ]);
      }
      if (typeof renderWallet === "function") renderWallet();
      if (typeof renderHistory === "function") renderHistory();
      if (typeof renderNotifications === "function") renderNotifications();
      showToast("Dépôt Pi confirmé", "+" + res.amount + " PI crédités");
      alert("Dépôt Pi réussi : +" + res.amount + " PI crédités sur votre wallet DCS.");
    }

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      startDeposit();
    });

    /* Lien « Dépôt Pi » du haut : scroll + focus sur le vrai bouton */
    document.querySelectorAll('a[href="#wallet-deposit"]').forEach(function (a) {
      a.addEventListener("click", function () {
        setTimeout(function () {
          const panel = document.getElementById("wallet-deposit");
          if (panel) panel.style.display = "";
          btn.scrollIntoView({ behavior: "smooth", block: "center" });
          setStatus("Choisissez le montant puis appuyez sur « Déposer via Pi Browser ».");
        }, 50);
      });
    });

    if (DCS.pi && DCS.pi.init) {
      DCS.pi.init().then(
        function () {
          setStatus("Prêt. Appuyez sur « Déposer via Pi Browser ».");
        },
        function () {
          setStatus(
            "Ouvrez cette page dans le Pi Browser pour activer les paiements.",
            true
          );
        }
      );
    }
  }

  function txStatusKind(status) {
    const s = String(status || "").toLowerCase();
    if (/attente|pending|queue|file|ouvert|processing|en cours/.test(s)) return "pending";
    if (/confirm|envoy|reçu|recu|payé|paye|prélev|prelev|complet|success|ok|reçu/.test(s)) return "confirmed";
    return "pending";
  }

  function txStatusLabel(status) {
    return txStatusKind(status) === "confirmed" ? "Confirmé" : "En attente";
  }

  function txStatusBadge(status) {
    const kind = txStatusKind(status);
    const label = txStatusLabel(status);
    const dot = kind === "confirmed" ? "on" : "off";
    return (
      '<span class="tx-status is-' +
      kind +
      '"><span class="status-dot ' +
      dot +
      '"></span>' +
      label +
      "</span>"
    );
  }

  function isTransferHistoryRow(h) {
    const t = String((h && h.type) || "").toLowerCase();
    return /transfer|transfert|réception|reception|frais|payout|retrait/.test(t);
  }

  function isTransferNotification(n) {
    const kind = String((n && n.kind) || "").toLowerCase();
    const title = String((n && n.title) || "").toLowerCase();
    const body = String((n && n.body) || "").toLowerCase();
    if (/transfer|payout|retrait/.test(kind)) return true;
    return /transfert|payout|retrait|réception|reception|mobile money/.test(title + " " + body);
  }

  function renderHistory() {
    const el = document.getElementById("history-body");
    if (!el || !window.DCS) return;
    const onTransferPage = !!document.getElementById("tr-asset");
    const filterBtn = document.querySelector("#tr-history-filters .tx-filter-btn.active");
    const filter = (filterBtn && filterBtn.getAttribute("data-filter")) || "all";
    let rows = DCS.history || [];
    if (onTransferPage) rows = rows.filter(isTransferHistoryRow);
    if (onTransferPage && filter === "pending") {
      rows = rows.filter((h) => txStatusKind(h.status) === "pending");
    } else if (onTransferPage && filter === "confirmed") {
      rows = rows.filter((h) => txStatusKind(h.status) === "confirmed");
    }
    if (!rows.length) {
      el.innerHTML =
        '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:1.25rem">' +
        (onTransferPage ? "Aucun transfert pour ce filtre." : "Aucune opération.") +
        "</td></tr>";
      return;
    }
    el.innerHTML = rows
      .map(
        (h) => `<tr>
          <td>${h.type || "—"}</td>
          <td>${h.detail || "—"}</td>
          <td>${h.amount || "—"}</td>
          <td>${txStatusBadge(h.status)}</td>
          <td>${h.date || "—"}</td>
        </tr>`
      )
      .join("");
  }

  function renderNotifications() {
    const walletEl = document.getElementById("wallet-notifications");
    const transferEl = document.getElementById("transfer-notifications");
    if (!walletEl && !transferEl) return;
    const list = DCS.notifications || [];

    if (walletEl) {
      if (!list.length) {
        walletEl.innerHTML =
          `<div class="feed-post"><div class="meta">Info</div><p>PI COIN : <strong style="color:var(--gold-bright)">$314,159</strong> · aucune notification récente.</p></div>`;
      } else {
        walletEl.innerHTML = list
          .slice(0, 8)
          .map((n) => {
            const when = n.created_at ? new Date(n.created_at).toLocaleString("fr-FR") : "";
            return `<div class="feed-post" style="margin-top:0.55rem"><div class="meta">${when}</div><p><strong>${n.title}</strong>${n.body ? " — " + n.body : ""}</p></div>`;
          })
          .join("");
      }
    }

    if (transferEl) {
      const nFilterBtn = document.querySelector("#tr-notif-filters .tx-filter-btn.active");
      const nFilter = (nFilterBtn && nFilterBtn.getAttribute("data-nfilter")) || "all";
      let rows = list.filter(isTransferNotification);
      if (nFilter === "pending") {
        rows = rows.filter((n) =>
          /attente|pending|file|queue|payout|retrait/i.test(
            String(n.title || "") + " " + String(n.body || "") + " " + String(n.kind || "")
          )
        );
      } else if (nFilter === "confirmed") {
        rows = rows.filter((n) =>
          /confirm|envoy|reçu|recu|p2p|fonds reçus/i.test(
            String(n.title || "") + " " + String(n.body || "")
          )
        );
      }
      if (!rows.length) {
        transferEl.innerHTML =
          '<div class="feed-post"><div class="meta">Info</div><p>Aucune notification de transfert pour ce filtre.</p></div>';
      } else {
        transferEl.innerHTML = rows
          .slice(0, 12)
          .map((n) => {
            const when = n.created_at ? new Date(n.created_at).toLocaleString("fr-FR") : "";
            const pending = /attente|pending|file|queue|payout|retrait/i.test(
              String(n.title || "") + " " + String(n.body || "") + " " + String(n.kind || "")
            );
            const badge = txStatusBadge(pending ? "En attente" : "Confirmé");
            return `<div class="feed-post" style="margin-top:0.55rem"><div class="meta">${when} · ${badge}</div><p><strong>${n.title}</strong>${n.body ? " — " + n.body : ""}</p></div>`;
          })
          .join("");
      }
    }
  }

  function formatCoursePricePi(n) {
    const v = Number(n);
    if (!isFinite(v) || v <= 0) return "0,00 π";
    return (
      v.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8
      }) + " π"
    );
  }

  function renderCourses() {
    const el = document.getElementById("courses-list");
    if (!el || !window.DCS) return;
    const list = DCS.courses || [];
    if (!list.length) {
      el.innerHTML = `<p style="color:var(--muted)">Aucun cours pour le moment.</p>`;
      return;
    }
    el.innerHTML = list
      .map(function (c) {
        var body = "";
        if (c.enrolled) {
          if (c.videoUrl && safeUrl(c.videoUrl)) {
            body +=
              '<div class="course-video-wrap">' +
              '<video class="course-video" controls playsinline preload="metadata" src="' +
              escapeHtml(safeUrl(c.videoUrl)) +
              '">Votre navigateur ne lit pas cette vidéo.</video>' +
              "</div>";
          } else if (c.videoPath) {
            body +=
              '<p class="panel-note" style="margin-top:0.55rem">Vidéo en cours de chargement ou indisponible. Rechargez la page.</p>';
          }
          if (c.content) {
            body +=
              '<p class="course-unlocked" style="margin-top:0.55rem;font-size:0.82rem;white-space:pre-wrap;color:var(--text)">' +
              escapeHtml(c.content) +
              "</p>";
          }
        }
        return (
          '<article class="course-item">' +
          "<div>" +
          "<h4>" +
          escapeHtml(c.title) +
          "</h4>" +
          "<p>" +
          escapeHtml(c.level) +
          " · " +
          escapeHtml(c.desc || "") +
          "</p>" +
          body +
          "</div>" +
          '<div style="text-align:right">' +
          '<div class="price-pi">' +
          formatCoursePricePi(c.pricePi) +
          "</div>" +
          '<button class="trade-btn" type="button" data-enroll="' +
          escapeHtml(c.id || "") +
          '" ' +
          (c.enrolled ? "disabled" : "") +
          ">" +
          (c.enrolled ? "Débloqué" : "Acheter") +
          "</button>" +
          "</div>" +
          "</article>"
        );
      })
      .join("");
    el.querySelectorAll("[data-enroll]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-enroll");
        if (!id) {
          alert("Service temporairement indisponible. Réessayez plus tard.");
          return;
        }
        const course = (DCS.courses || []).find((x) => x.id === id);
        if (!course) return;
        if (
          !confirm(
            "Acheter « " +
              course.title +
              " » pour " +
              formatCoursePricePi(course.pricePi) +
              " ?"
          )
        )
          return;
        btn.disabled = true;
        const res = await DCS.backend.enrollCourse(id);
        btn.disabled = false;
        if (!res.ok) {
          alert(res.error || "Inscription impossible.");
          return;
        }
        renderCourses();
        pushTxNotice("Cours débloqué", course.title, "academy");
        alert("Cours débloqué : " + course.title);
      });
    });
  }

  function renderArticles() {
    const el = document.getElementById("articles-list");
    if (!el || !window.DCS) return;
    const list = DCS.articles || [];
    if (!list.length) {
      el.innerHTML = `<p style="color:var(--muted)">Aucun article pour le moment.</p>`;
      return;
    }
    el.innerHTML = list
      .map(function (a) {
        return (
          '<article class="course-item">' +
          "<div>" +
          "<h4>" +
          escapeHtml(a.title) +
          "</h4>" +
          "<p>" +
          escapeHtml(a.tag || "") +
          " · " +
          escapeHtml(a.date || "") +
          "</p>" +
          '<div class="article-body" data-article-body="' +
          escapeHtml(a.id || "") +
          '" hidden style="margin-top:0.65rem;font-size:0.88rem;white-space:pre-wrap">' +
          escapeHtml(a.body || "") +
          "</div>" +
          "</div>" +
          '<button class="trade-btn" type="button" data-read="' +
          escapeHtml(a.id || "") +
          '">Lire</button>' +
          "</article>"
        );
      })
      .join("");
    el.querySelectorAll("[data-read]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-read");
        const body = el.querySelector('[data-article-body="' + id + '"]');
        if (!body) {
          alert("Contenu indisponible.");
          return;
        }
        const open = body.hidden;
        body.hidden = !open;
        btn.textContent = open ? "Fermer" : "Lire";
      });
    });
  }

  function escapeHtml(raw) {
    return String(raw == null ? "" : raw)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeUrl(raw) {
    var s = String(raw || "").trim();
    if (!s) return "";
    if (/^(https?:|data:image\/)/i.test(s)) return s;
    return "";
  }

  function renderCommunity() {
    const el = document.getElementById("community-feed");
    if (!el || !window.DCS) return;
    const list = DCS.community || [];
    if (!list.length) {
      el.innerHTML = `<p style="color:var(--muted)">Soyez le premier à publier.</p>`;
      return;
    }
    el.innerHTML = list
      .map(function (p) {
        return (
          '<article class="feed-post">' +
          '<div class="meta">' +
          escapeHtml(p.author) +
          " · " +
          escapeHtml(p.time) +
          "</div>" +
          "<p>" +
          escapeHtml(p.text) +
          "</p>" +
          "</article>"
        );
      })
      .join("");
  }

  function setupCommunity() {
    const btn = document.getElementById("community-publish");
    const ta = document.getElementById("community-text");
    if (!btn || !ta) return;
    btn.addEventListener("click", async () => {
      const text = ta.value.trim();
      if (!text) {
        alert("Écrivez un message.");
        return;
      }
      btn.disabled = true;
      const res = await DCS.backend.createPost(text);
      btn.disabled = false;
      if (!res.ok) {
        alert(res.error || "Publication impossible. Réessayez plus tard.");
        return;
      }
      ta.value = "";
      await DCS.backend.loadCommunity();
      renderCommunity();
      alert("Publication en ligne.");
    });
  }

  function setupDepositRequest() {
    const MIN_DEPOSIT_PI = 0.0000001;
    const form = document.getElementById("deposit-request-form");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById("deposit-req-amount").value) || 0;
      const note = (document.getElementById("deposit-req-note") || {}).value || "";
      if (!(amount >= MIN_DEPOSIT_PI)) {
        alert("Montant minimum de dépôt : 0,0000001 PI.");
        return;
      }
      const res = await DCS.backend.createDepositRequest(amount, note.trim());
      if (!res.ok) {
        alert(res.error || "Demande impossible. Réessayez plus tard.");
        return;
      }
      form.reset();
      pushTxNotice(
        "Demande de dépôt",
        amount + " PI · en attente de validation",
        "deposit"
      );
      alert(
        "Demande de dépôt enregistrée (#" +
          String(res.id).slice(0, 8) +
          "). Votre demande est en cours de traitement."
      );
      if (DCS.backend.loadNotifications) {
        await DCS.backend.loadNotifications();
        renderNotifications();
      }
    });
  }

  let marketFilter = { seller: "all", query: "" };
  let activeArticleId = null;

  function getSellers() {
    const map = {};
    (DCS.marketplace || []).forEach((a) => {
      if (!map[a.author]) map[a.author] = 0;
      map[a.author] += 1;
    });
    return Object.keys(map)
      .sort((a, b) => a.localeCompare(b, "fr"))
      .map((name) => ({ name, count: map[name] }));
  }

  function findArticle(id) {
    return (DCS.marketplace || []).find((a) => String(a.id) === String(id));
  }

  function isPurchased(articleId) {
    return (DCS.purchases || []).some((p) => String(p.articleId) === String(articleId));
  }

  function filteredArticles() {
    const q = (marketFilter.query || "").trim().toLowerCase();
    return (DCS.marketplace || []).filter((a) => {
      if (marketFilter.seller !== "all" && a.author !== marketFilter.seller) return false;
      if (!q) return true;
      return (
        (a.title || "").toLowerCase().includes(q) ||
        (a.author || "").toLowerCase().includes(q) ||
        (a.category || "").toLowerCase().includes(q) ||
        (a.excerpt || "").toLowerCase().includes(q)
      );
    });
  }

  function openLightbox(src) {
    const overlay = document.createElement("div");
    overlay.className = "photo-lightbox";
    overlay.innerHTML =
      '<img src="' +
      src +
      '" alt="Aperçu" /><button type="button" class="photo-lightbox-close" aria-label="Fermer">×</button>';
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.classList.contains("photo-lightbox-close")) {
        overlay.remove();
      }
    });
    document.body.appendChild(overlay);
  }

  function renderSellers() {
    const list = document.getElementById("sellers-list");
    const allCount = document.getElementById("seller-count-all");
    if (!list || !window.DCS) return;
    const sellers = getSellers();
    if (allCount) allCount.textContent = String((DCS.marketplace || []).length);
    list.innerHTML =
      sellers
        .map(
          (s) =>
            '<div class="seller-chip-wrap">' +
            '<button type="button" class="seller-chip" data-seller="' +
            s.name.replace(/"/g, "&quot;") +
            '">' +
            '<span class="seller-avatar">' +
            s.name.slice(0, 1).toUpperCase() +
            "</span>" +
            '<span class="seller-meta"><strong>' +
            s.name +
            "</strong><small>" +
            s.count +
            " article" +
            (s.count > 1 ? "s" : "") +
            "</small></span>" +
            "</button>" +
            '<button type="button" class="seller-report-btn" data-report-seller="' +
            s.name.replace(/"/g, "&quot;") +
            '" title="Signaler">Signaler</button>' +
            "</div>"
        )
        .join("") ||
      '<p class="panel-note" style="margin:0.5rem 0 0">Aucun vendeur pour le moment. Publiez depuis l’espace vendeur.</p>';

    document.querySelectorAll(".seller-chip").forEach((btn) => {
      const name = btn.getAttribute("data-seller") || "all";
      btn.classList.toggle("active", name === marketFilter.seller);
      btn.onclick = () => {
        marketFilter.seller = name;
        renderSellers();
        renderMarketplace();
      };
    });
    document.querySelectorAll("[data-report-seller]").forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        openReportSeller(btn.getAttribute("data-report-seller"), null);
      };
    });
  }

  function renderMarketplace() {
    const el = document.getElementById("marketplace-list");
    const hint = document.getElementById("catalog-hint");
    if (!el || !window.DCS) return;
    const items = filteredArticles();
    if (hint) {
      hint.textContent =
        marketFilter.seller === "all"
          ? items.length + " article(s) disponibles · paiement en PI COIN"
          : "Boutique « " + marketFilter.seller + " » · " + items.length + " article(s)";
    }
    if (!items.length) {
      el.innerHTML = '<p class="panel-note" style="padding:1rem 0">Aucun article trouvé.</p>';
      return;
    }
    el.innerHTML = items
      .map(function (a) {
        const photos = a.photos || [];
        const owned = isPurchased(a.id);
        const coverSrc = safeUrl(photos[0]);
        const cover = coverSrc
          ? '<img class="market-cover" src="' + escapeHtml(coverSrc) + '" alt="" />'
          : '<div class="market-cover placeholder">PI</div>';
        const thumbs =
          photos.length > 1
            ? '<div class="article-photos compact">' +
              photos
                .slice(0, 4)
                .map(function (src, i) {
                  var u = safeUrl(src);
                  if (!u) return "";
                  return (
                    '<button type="button" class="article-photo" data-full="' +
                    escapeHtml(u) +
                    '" title="Photo ' +
                    (i + 1) +
                    '"><img src="' +
                    escapeHtml(u) +
                    '" alt="" loading="lazy" /></button>'
                  );
                })
                .join("") +
              "</div>"
            : "";
        return (
          '<article class="market-article">' +
          '<div class="market-article-top">' +
          cover +
          '<div class="market-article-body">' +
          "<div>" +
          '<div class="ref-badge">' +
          escapeHtml(a.category || "Divers") +
          "</div>" +
          "<h4>" +
          escapeHtml(a.title) +
          "</h4>" +
          "<p>par <strong>" +
          escapeHtml(a.author) +
          "</strong> — " +
          escapeHtml(a.excerpt || "") +
          "</p>" +
          (owned
            ? '<p class="tx-status is-confirmed" style="margin-top:0.45rem"><span class="status-dot on"></span>Déjà acheté</p>'
            : "") +
          "</div>" +
          '<div class="market-article-buy">' +
          '<div class="price-pi">' +
          escapeHtml(a.pricePi) +
          " π</div>" +
          '<button class="btn btn-outline" type="button" data-visit="' +
          escapeHtml(a.id) +
          '" style="margin-top:0.4rem;width:100%">Consulter</button>' +
          (owned
            ? '<button class="btn btn-outline" type="button" disabled style="margin-top:0.4rem;width:100%">Acheté</button>'
            : '<button class="btn btn-gold" type="button" data-buy="' +
              escapeHtml(a.id) +
              '" style="margin-top:0.4rem;width:100%">Acheter</button>') +
          '<button class="btn btn-outline btn-report" type="button" data-report="' +
          escapeHtml(a.id) +
          '" style="margin-top:0.4rem;width:100%">Signaler</button>' +
          "</div></div></div>" +
          thumbs +
          "</article>"
        );
      })
      .join("");

    el.querySelectorAll(".article-photo").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openLightbox(btn.getAttribute("data-full"));
      });
    });
    el.querySelectorAll("[data-visit]").forEach((btn) => {
      btn.addEventListener("click", () => openArticle(btn.getAttribute("data-visit")));
    });
    el.querySelectorAll("[data-buy]").forEach((btn) => {
      btn.addEventListener("click", () => buyArticle(btn.getAttribute("data-buy")));
    });
    el.querySelectorAll("[data-report]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const article = findArticle(btn.getAttribute("data-report"));
        if (article) openReportSeller(article.author, article.id);
      });
    });
  }

  function renderBuyerOrders() {
    const body = document.getElementById("buyer-orders-body");
    const countEl = document.getElementById("buyer-stat-count");
    const piEl = document.getElementById("buyer-stat-pi");
    if (!body) return;
    const list = DCS.purchases || [];
    const totalPi = list.reduce((sum, p) => sum + (Number(p.pricePi) || 0), 0);
    if (countEl) countEl.textContent = String(list.length);
    if (piEl) piEl.textContent = totalPi.toLocaleString("fr-FR") + " π";
    if (!list.length) {
      body.innerHTML =
        '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:1.25rem">Aucun achat pour le moment. Parcourez le catalogue.</td></tr>';
      return;
    }
    body.innerHTML = list
      .map(
        (p) =>
          "<tr>" +
          "<td>" +
          (p.title || "Article") +
          "</td>" +
          "<td>" +
          (p.author || "—") +
          "</td>" +
          "<td>" +
          (p.pricePi || 0) +
          " π</td>" +
          '<td><span class="tx-status is-confirmed"><span class="status-dot on"></span>Confirmé</span></td>' +
          "<td>" +
          (p.date || "—") +
          "</td>" +
          "<td>" +
          (p.articleId
            ? '<button type="button" class="btn btn-outline" data-visit-order="' +
              p.articleId +
              '" style="padding:0.35rem 0.65rem;font-size:0.75rem">Ouvrir</button>'
            : "—") +
          "</td>" +
          "</tr>"
      )
      .join("");
    body.querySelectorAll("[data-visit-order]").forEach((btn) => {
      btn.addEventListener("click", () => openArticle(btn.getAttribute("data-visit-order")));
    });
  }

  function renderSellerDashboard() {
    const box = document.getElementById("my-pubs");
    const countEl = document.getElementById("seller-stat-listings");
    const nameEl = document.getElementById("seller-stat-name");
    const sellerInput = document.getElementById("seller-name");
    if (!window.DCS) return;
    const uid = DCS.user && DCS.user.id;
    const mine = (DCS.marketplace || []).filter(
      (a) => (uid && a.sellerId === uid) || false
    );
    const shopName =
      (sellerInput && sellerInput.value.trim()) ||
      (mine[0] && mine[0].author) ||
      (DCS.user && (DCS.user.displayName || DCS.user.piUsername || DCS.user.username)) ||
      "—";
    if (countEl) countEl.textContent = String(mine.length);
    if (nameEl) nameEl.textContent = shopName;
    if (sellerInput && !sellerInput.value && shopName && shopName !== "—") {
      sellerInput.value = shopName;
    }
    if (!box) return;
    if (!mine.length) {
      box.innerHTML =
        '<p class="panel-note">Aucun article publié. Utilisez le formulaire pour mettre en vente.</p>';
      return;
    }
    box.innerHTML = mine
      .map(
        (a) =>
          '<div class="asset-row seller-listing-row">' +
          "<div><strong>" +
          a.title +
          '</strong><div class="panel-note">' +
          (a.category || "Divers") +
          " · " +
          a.pricePi +
          " π</div></div>" +
          '<span class="tx-status is-confirmed"><span class="status-dot on"></span>Actif</span>' +
          "</div>"
      )
      .join("");
  }

  function openArticle(id) {
    const article = findArticle(id);
    const modal = document.getElementById("article-modal");
    if (!article || !modal) return;
    activeArticleId = article.id;
    document.getElementById("modal-title").textContent = article.title;
    document.getElementById("modal-author").textContent = article.author;
    document.getElementById("modal-category").textContent = article.category;
    document.getElementById("modal-price").textContent = article.pricePi + " π";
    document.getElementById("modal-excerpt").textContent = article.excerpt || "";
    const owned = isPurchased(article.id);
    document.getElementById("modal-body").textContent =
      article.content || article.excerpt || "Contenu disponible après achat.";
    const buyBtn = document.getElementById("modal-buy");
    if (buyBtn) {
      buyBtn.disabled = owned;
      buyBtn.textContent = owned ? "Déjà acheté" : "Acheter en PI COIN";
    }
    const gallery = document.getElementById("modal-gallery");
    const photos = article.photos || [];
    gallery.innerHTML = photos.length
      ? photos
          .map(
            (src) =>
              '<button type="button" class="article-photo" data-full="' +
              src +
              '"><img src="' +
              src +
              '" alt="" /></button>'
          )
          .join("")
      : '<div class="market-cover placeholder large">PI</div>';
    gallery.querySelectorAll(".article-photo").forEach((btn) => {
      btn.addEventListener("click", () => openLightbox(btn.getAttribute("data-full")));
    });
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeArticleModal() {
    const modal = document.getElementById("article-modal");
    if (modal) modal.hidden = true;
    document.body.style.overflow = "";
    activeArticleId = null;
  }

  async function buyArticle(id) {
    const article = findArticle(id);
    if (!article) return;
    if (isPurchased(article.id)) {
      alert("Vous avez déjà acheté cet article.");
      openArticle(article.id);
      return;
    }
    const ok = confirm(
      "Acheter « " +
        article.title +
        " » pour " +
        article.pricePi +
        " PI COIN ?\n\nVendeur : " +
        article.author +
        "\nPaiement exclusivement en PI COIN (314 159 $)."
    );
    if (!ok) return;
    if (!article.id || typeof article.id === "number") {
      alert(
        "Cet article n’est pas encore synchronisé avec la base. Rechargez après publication."
      );
      return;
    }
    const res = await DCS.backend.buyListing(article.id);
    if (!res.ok) {
      alert(res.error || "Achat impossible.");
      return;
    }
    pushTxNotice(
      "Achat Marketplace",
      article.title + " · " + article.pricePi + " PI",
      "market"
    );
    alert(
      "Achat confirmé.\nVous avez payé " +
        article.pricePi +
        " PI COIN à " +
        article.author +
        ".\nRetrouvez l’article dans « Mes achats »."
    );
    closeArticleModal();
    renderMarketplace();
    renderBuyerOrders();
  }

  function setupMarketplaceForm() {
    const form = document.getElementById("seller-form");
    if (!form) return;

    const photoInput = document.getElementById("article-photos");
    const preview = document.getElementById("photo-preview");
    let pendingPhotos = [];

    function renderPreview() {
      if (!preview) return;
      if (!pendingPhotos.length) {
        preview.innerHTML = "";
        return;
      }
      preview.innerHTML = pendingPhotos
        .map(
          (p, i) =>
            '<div class="photo-preview-item">' +
            '<img src="' +
            p.url +
            '" alt="Aperçu ' +
            (i + 1) +
            '" />' +
            '<button type="button" class="photo-remove" data-i="' +
            i +
            '" aria-label="Retirer">×</button>' +
            "</div>"
        )
        .join("");
      preview.querySelectorAll(".photo-remove").forEach((btn) => {
        btn.addEventListener("click", () => {
          const i = parseInt(btn.getAttribute("data-i"), 10);
          pendingPhotos.splice(i, 1);
          renderPreview();
        });
      });
    }

    if (photoInput) {
      photoInput.addEventListener("change", () => {
        const files = Array.from(photoInput.files || []);
        const room = Math.max(0, 5 - pendingPhotos.length);
        if (!room) {
          alert("Maximum 5 photos par article.");
          photoInput.value = "";
          return;
        }
        const toAdd = files.slice(0, room);
        if (files.length > room) alert("Seules " + room + " photo(s) ont été ajoutées (max. 5).");
        toAdd.forEach((file) => {
          if (!file.type.startsWith("image/")) return;
          pendingPhotos.push({ file, url: URL.createObjectURL(file), name: file.name });
        });
        photoInput.value = "";
        renderPreview();
      });
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("seller-name").value.trim();
      const title = document.getElementById("article-title").value.trim();
      const price = parseFloat(document.getElementById("article-price").value) || 1;
      const excerpt = document.getElementById("article-excerpt").value.trim();
      const content = (document.getElementById("article-content") || {}).value || excerpt;
      const category = document.getElementById("article-category").value;
      if (!name || !title || !excerpt) {
        alert("Veuillez remplir tous les champs obligatoires.");
        return;
      }
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Publication…";
      }
      const photoUrls = [];
      for (let i = 0; i < pendingPhotos.length; i++) {
        const item = pendingPhotos[i];
        if (item.file && DCS.backend.uploadMarketplacePhoto) {
          const up = await DCS.backend.uploadMarketplacePhoto(item.file);
          if (up.ok && up.url) photoUrls.push(up.url);
          else photoUrls.push(item.url);
        } else if (item.url) {
          photoUrls.push(item.url);
        }
      }
      const res = await DCS.backend.createListing({
        sellerName: name,
        title,
        pricePi: price,
        category,
        excerpt,
        content: content.trim(),
        photos: photoUrls
      });
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Publier l'article";
      }
      if (!res.ok) {
        alert(res.error || "Publication impossible. Réessayez plus tard.");
        return;
      }
      pendingPhotos = [];
      renderPreview();
      await DCS.backend.loadListings();
      marketFilter.seller = "all";
      renderSellers();
      renderMarketplace();
      renderSellerDashboard();
      form.reset();
      if (document.getElementById("seller-name")) {
        document.getElementById("seller-name").value = name;
      }
      alert("Article publié. Il apparaît dans le catalogue et dans vos publications.");
      openMarketView("sell");
    });
  }

  function openMarketView(view) {
    const tabs = document.getElementById("market-tabs");
    if (!tabs) return;
    let target = "buy";
    if (view === "sell" || view === "vendeur") target = "sell";
    else if (view === "orders" || view === "achats") target = "orders";
    tabs.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-view") === target);
    });
    document.querySelectorAll("[data-view-panel]").forEach((panel) => {
      panel.hidden = panel.getAttribute("data-view-panel") !== target;
    });
    document.querySelectorAll(".market-role-btn").forEach((btn) => {
      const v = btn.getAttribute("data-open-view");
      btn.classList.toggle("active", (target === "sell" ? "sell" : "buy") === v);
    });
    const searchWrap = document.getElementById("buyer-search-wrap");
    if (searchWrap) searchWrap.style.display = target === "buy" ? "" : "none";
    if (target === "orders") renderBuyerOrders();
    if (target === "sell") renderSellerDashboard();
    try {
      const hash =
        target === "sell" ? "#espace-vendeur" : target === "orders" ? "#mes-achats" : "#catalogue";
      history.replaceState(null, "", hash);
    } catch (e) {}
  }

  function setupMarketplaceViews() {
    const tabs = document.getElementById("market-tabs");
    if (!tabs) return;

    tabs.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => openMarketView(btn.getAttribute("data-view")));
    });

    document.querySelectorAll("[data-open-view]").forEach((btn) => {
      btn.addEventListener("click", () => openMarketView(btn.getAttribute("data-open-view")));
    });

    const hash = (location.hash || "").toLowerCase();
    if (hash.includes("vendeur") || hash.includes("sell") || hash.includes("vendre")) {
      openMarketView("sell");
    } else if (hash.includes("achat") || hash.includes("order")) {
      openMarketView("orders");
    } else {
      openMarketView("buy");
    }

    const search = document.getElementById("buyer-search");
    if (search) {
      search.addEventListener("input", () => {
        marketFilter.query = search.value;
        renderMarketplace();
      });
    }

    const modal = document.getElementById("article-modal");
    const closeBtn = document.getElementById("article-modal-close");
    const backBtn = document.getElementById("modal-back");
    const buyBtn = document.getElementById("modal-buy");
    const reportBtn = document.getElementById("modal-report");
    if (closeBtn) closeBtn.addEventListener("click", closeArticleModal);
    if (backBtn) backBtn.addEventListener("click", closeArticleModal);
    if (buyBtn) {
      buyBtn.addEventListener("click", () => {
        if (activeArticleId != null) buyArticle(activeArticleId);
      });
    }
    if (reportBtn) {
      reportBtn.addEventListener("click", () => {
        if (activeArticleId == null) return;
        const article = findArticle(activeArticleId);
        if (article) openReportSeller(article.author, article.id);
      });
    }
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeArticleModal();
      });
    }
    setupReportSeller();
    renderBuyerOrders();
    renderSellerDashboard();
  }

  function openReportSeller(sellerName, articleId) {
    const modal = document.getElementById("report-modal");
    if (!modal || !sellerName) return;
    const nameEl = document.getElementById("report-seller-name");
    const sellerInput = document.getElementById("report-seller");
    const articleInput = document.getElementById("report-article-id");
    if (nameEl) nameEl.textContent = sellerName;
    if (sellerInput) sellerInput.value = sellerName;
    if (articleInput) articleInput.value = articleId != null ? String(articleId) : "";
    const form = document.getElementById("report-seller-form");
    if (form) form.reset();
    if (sellerInput) sellerInput.value = sellerName;
    if (articleInput) articleInput.value = articleId != null ? String(articleId) : "";
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeReportModal() {
    const modal = document.getElementById("report-modal");
    if (modal) modal.hidden = true;
    if (document.getElementById("article-modal") && !document.getElementById("article-modal").hidden) {
      /* keep body locked if article modal still open */
    } else {
      document.body.style.overflow = "";
    }
  }

  function setupReportSeller() {
    const form = document.getElementById("report-seller-form");
    if (!form) return;
    const closeBtn = document.getElementById("report-modal-close");
    const cancelBtn = document.getElementById("report-cancel");
    const modal = document.getElementById("report-modal");
    if (closeBtn) closeBtn.addEventListener("click", closeReportModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeReportModal);
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeReportModal();
      });
    }
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const seller = document.getElementById("report-seller").value;
      const reason = document.getElementById("report-reason").value;
      const details = document.getElementById("report-details").value.trim();
      const articleId = document.getElementById("report-article-id").value;
      if (!seller || !reason || !details) {
        alert("Complétez le motif et les détails.");
        return;
      }
      const reasonLabels = {
        fraude: "Fraude / arnaque",
        contenu: "Contenu trompeur ou illégal",
        prix: "Prix abusif / spam",
        harcelement: "Harcèlement",
        autre: "Autre"
      };
      const res = await DCS.backend.reportListing(
        articleId || null,
        reasonLabels[reason] || reason,
        details
      );
      if (!res.ok) {
        alert(res.error || "Signalement impossible. Réessayez plus tard.");
        return;
      }
      closeReportModal();
      alert("Signalement envoyé contre « " + seller + " ». L'équipe DCS examinera le dossier.");
    });
  }

  /** Icônes / illustrations du menu hamburger (modules) */
  function navModuleSvg(kind) {
    const stroke = 'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';
    const map = {
      home: `<svg viewBox="0 0 24 24" ${stroke}><path d="M4 11.5 12 5l8 6.5"/><path d="M7 10.5V19h10v-8.5"/></svg>`,
      /* Barres pleines : mieux visibles dans Pi Browser que des traits fins */
      markets: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3.5" y="12" width="4" height="8" rx="1"/><rect x="10" y="7" width="4" height="13" rx="1"/><rect x="16.5" y="4" width="4" height="16" rx="1"/></svg>`,
      wallet: `<svg viewBox="0 0 24 24" ${stroke}><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/><circle cx="16" cy="14" r="1.25" fill="currentColor" stroke="none"/></svg>`,
      swap: `<svg viewBox="0 0 24 24" ${stroke}><path d="M7 7h11l-2.5-2.5M17 17H6l2.5 2.5"/><path d="M7 7v4M17 17v-4"/></svg>`,
      transfer: `<svg viewBox="0 0 24 24" ${stroke}><path d="M4 12h14"/><path d="M14 7l5 5-5 5"/></svg>`,
      market: `<svg viewBox="0 0 24 24" ${stroke}><path d="M4 9h16l-1.2 10.2a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 9z"/><path d="M8 9V7a4 4 0 0 1 8 0v2"/></svg>`,
      referral: `<svg viewBox="0 0 24 24" ${stroke}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 18.5c.8-3 2.8-4.5 5.5-4.5s4.7 1.5 5.5 4.5"/></svg>`,
      profil: `<svg viewBox="0 0 24 24" ${stroke}><circle cx="12" cy="8" r="3.5"/><path d="M5 19.5c1.2-3.5 3.8-5 7-5s5.8 1.5 7 5"/></svg>`,
      academy: `<svg viewBox="0 0 24 24" ${stroke}><path d="M3 9.5 12 5l9 4.5-9 4.5L3 9.5z"/><path d="M6.5 12.2v4.3c0 .8 2.4 2.5 5.5 2.5s5.5-1.7 5.5-2.5v-4.3"/></svg>`,
      learning: `<svg viewBox="0 0 24 24" ${stroke}><path d="M5 5h10a2 2 0 0 1 2 2v12l-6-2.5L5 19V5z"/><path d="M17 7h2a2 2 0 0 1 2 2v10"/></svg>`,
      community: `<svg viewBox="0 0 24 24" ${stroke}><path d="M5 16.5V7.8A1.8 1.8 0 0 1 6.8 6h7.4A1.8 1.8 0 0 1 16 7.8v5.2A1.8 1.8 0 0 1 14.2 14.8H9l-4 3.2z"/></svg>`,
      contact: `<svg viewBox="0 0 24 24" ${stroke}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>`
    };
    return map[kind] || map.home;
  }

  function navKindFromHref(href, label) {
    const raw = String(href || "");
    const lab = String(label || "");
    if (/#markets/i.test(raw) || /march[eé]s|markets|mercados|أسواق/i.test(lab)) return "markets";
    const file = (raw.split("?")[0].split("#")[0].split("/").pop() || "index.html").toLowerCase();
    if (file === "index.html" || file === "" || file === "/") return "home";
    if (file.indexOf("wallet") === 0) return "wallet";
    if (file.indexOf("swap") === 0) return "swap";
    if (file.indexOf("transfer") === 0) return "transfer";
    if (file.indexOf("marketplace") === 0) return "market";
    if (file.indexOf("parrainage") === 0) return "referral";
    if (file.indexOf("profil") === 0) return "profil";
    if (file.indexOf("academy") === 0) return "academy";
    if (file.indexOf("learning") === 0) return "learning";
    if (file.indexOf("community") === 0) return "community";
    if (file.indexOf("contact") === 0) return "contact";
    return "home";
  }

  function decorateMainNavIllustrations() {
    const nav = document.getElementById("main-nav");
    if (!nav) return;
    nav.querySelectorAll("a").forEach(function (a) {
      const href = a.getAttribute("href") || "";
      const labelEl = a.querySelector(".nav-label");
      const label = (labelEl ? labelEl.textContent : a.textContent || "").trim() || "Menu";
      const kind = navKindFromHref(href, label);
      /* Toujours (re)appliquer l’icône — corrige Marchés si déjà décoré sans bonne clé */
      a.innerHTML =
        '<span class="nav-illust" aria-hidden="true">' +
        navModuleSvg(kind) +
        '</span><span class="nav-label">' +
        label.replace(/</g, "&lt;") +
        "</span>";
    });
    nav.dataset.illust = "1";
  }

  function setupNav() {
    decorateMainNavIllustrations();

    const path = location.pathname.split("/").pop() || "index.html";
    const hash = location.hash || "";
    document.querySelectorAll(".nav a").forEach((a) => {
      const href = a.getAttribute("href") || "";
      const labelEl = a.querySelector(".nav-label");
      const label = (labelEl ? labelEl.textContent : a.textContent || "").trim();
      a.classList.remove("active");
      if (path === "index.html" || path === "" || path === "/") {
        if (hash === "#markets" && href.includes("#markets")) a.classList.add("active");
        else if (!hash && (href === "index.html" || href === "./index.html") && label === "Accueil") {
          a.classList.add("active");
        }
      } else if (href === path || href.endsWith("/" + path)) {
        a.classList.add("active");
      }
    });
    const toggle = document.getElementById("menu-toggle");
    const nav = document.getElementById("main-nav");
    if (toggle && nav && toggle.dataset.bound !== "1") {
      toggle.dataset.bound = "1";
      toggle.addEventListener("click", () => nav.classList.toggle("open"));
    }

    updateAuthNav();

    /* Prefetch + feedback immédiat au clic (évite l'impression de latence) */
    const prefetched = new Set();
    function prefetch(url) {
      if (!url || prefetched.has(url) || url.startsWith("#") || url.startsWith("mailto:")) return;
      const clean = url.split("#")[0];
      if (!clean || prefetched.has(clean)) return;
      prefetched.add(clean);
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = clean;
      document.head.appendChild(link);
    }
    document.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:")) return;
      a.addEventListener("pointerenter", () => prefetch(href), { passive: true });
      a.addEventListener("touchstart", () => prefetch(href), { passive: true });
      a.addEventListener("click", () => {
        document.documentElement.classList.add("is-navigating");
        a.classList.add("is-pressed");
      });
    });
    document.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener(
        "pointerdown",
        () => {
          btn.classList.add("is-pressed");
        },
        { passive: true }
      );
      btn.addEventListener(
        "pointerup",
        () => {
          btn.classList.remove("is-pressed");
        },
        { passive: true }
      );
      btn.addEventListener(
        "pointerleave",
        () => {
          btn.classList.remove("is-pressed");
        },
        { passive: true }
      );
    });
  }

  function setupMarketSearch() {
    const input = document.getElementById("market-search");
    if (!input) return;
    input.addEventListener("input", () => renderMarkets(input.value));
    document.querySelectorAll(".tabs button").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tabs button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const tab = btn.dataset.tab;
        if (tab === "pi") renderMarkets("pi");
        else if (tab === "cfa") renderMarkets("cfa");
        else if (tab === "gainers") {
          const backup = DCS.markets;
          DCS.markets = [...DCS.markets].sort((a, b) => b.change24h - a.change24h);
          renderMarkets("");
          DCS.markets = backup;
        } else renderMarkets("");
      });
    });
  }

  /* Prix live Binance (WebSocket temps réel) ; PI / XOF / XAF gérés DCS */
  const LIVE_BINANCE_MAP = {
    BTC: "BTCUSDT",
    ETH: "ETHUSDT",
    BNB: "BNBUSDT",
    SOL: "SOLUSDT",
    XRP: "XRPUSDT",
    XLM: "XLMUSDT",
    TRX: "TRXUSDT",
    USDT: "USDCUSDT"
  };
  const LIVE_PAIR_TO_SYM = {};
  Object.keys(LIVE_BINANCE_MAP).forEach((sym) => {
    LIVE_PAIR_TO_SYM[LIVE_BINANCE_MAP[sym]] = sym;
  });

  let marketsDirty = false;
  let marketsWs = null;
  let marketsWsRetry = null;

  function setMarketsLiveStatus(ok, detail) {
    const el = document.getElementById("markets-live-status");
    if (!el) return;
    el.textContent = ok ? "Live · " + (detail || "Binance") : detail || "Hors ligne · prix de secours";
    el.classList.toggle("is-live", !!ok);
    el.classList.toggle("is-offline", !ok);
  }

  /** Peg PI COIN figé — jamais de volatilité ni de overwrite live */
  var PI_STABLE_USD = 314159;

  function lockPiPrice() {
    DCS.PI_PRICE = PI_STABLE_USD;
    const pi = DCS.markets && DCS.markets.find((x) => x.id === "pi" || x.symbol === "PI");
    if (!pi) return;
    pi.price = PI_STABLE_USD;
    pi.change24h = 0;
    pi.high = PI_STABLE_USD;
    pi.low = PI_STABLE_USD;
    pi.stable = true;
    pi.featured = true;
  }

  function lockCfaParity() {
    /* Parité indicative figée : 1 USD = 600 XOF/XAF (peg PI stable aussi en CFA) */
    DCS.CFA_PER_USD = 600;
    ["xof", "xaf"].forEach(function (id) {
      const m = DCS.markets && DCS.markets.find((x) => x.id === id);
      if (m) {
        m.price = 1 / 600;
        m.high = m.price;
        m.low = m.price;
        m.change24h = 0;
        m.stable = true;
      }
    });
  }

  function applyCfaFromEur(eurUsd) {
    /* Ignoré : on conserve 600 XOF/XAF pour 1 USD afin de respecter le peg PI à $314,159 */
    void eurUsd;
    lockCfaParity();
  }

  function applyTickerToMarket(sym, price, change, high, low, vol) {
    if (sym === "PI") return;
    const m = DCS.markets.find((x) => x.symbol === sym);
    if (!m || !(price > 0)) return;
    if (m.id === "pi" || m.symbol === "PI") return;
    if (m.fiat) return;
    m.price = price;
    if (change != null && !isNaN(change)) m.change24h = change;
    if (high > 0) m.high = high;
    if (low > 0) m.low = low;
    if (vol > 0) m.volume = vol;
    marketsDirty = true;
  }

  function paintLiveMarkets() {
    if (!marketsDirty || !window.DCS || !DCS.markets) return;
    marketsDirty = false;
    lockPiPrice();
    lockCfaParity();
    DCS.marketsLiveAt = Date.now();
    setMarketsLiveStatus(true, new Date().toLocaleTimeString("fr-FR"));
    if (document.getElementById("ticker-track")) renderTicker();
    if (document.getElementById("pi-price")) renderPiSpotlight();
    if (document.getElementById("markets-body")) {
      const input = document.getElementById("market-search");
      renderMarkets(input ? input.value : "");
    }
    if (document.getElementById("wallet-assets") && typeof renderWallet === "function") {
      renderWallet();
    }
  }

  async function refreshLiveMarketsRest() {
    if (!window.DCS || !DCS.markets) return false;
    const symbols = Object.keys(LIVE_BINANCE_MAP).map((k) => LIVE_BINANCE_MAP[k]);
    const url =
      "https://api.binance.com/api/v3/ticker/24hr?symbols=" +
      encodeURIComponent(JSON.stringify(symbols.concat(["EURUSDT"])));
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const rows = await res.json();
      if (!Array.isArray(rows)) throw new Error("Réponse invalide");
      rows.forEach((tick) => {
        if (tick.symbol === "EURUSDT") {
          applyCfaFromEur(Number(tick.lastPrice));
          return;
        }
        const sym = LIVE_PAIR_TO_SYM[tick.symbol];
        if (!sym) return;
        applyTickerToMarket(
          sym,
          Number(tick.lastPrice),
          Number(tick.priceChangePercent),
          Number(tick.highPrice),
          Number(tick.lowPrice),
          Number(tick.quoteVolume)
        );
      });
      lockPiPrice();
      marketsDirty = true;
      paintLiveMarkets();
      return true;
    } catch (err) {
      setMarketsLiveStatus(false, "Prix de secours (API indisponible)");
      return false;
    }
  }

  function connectMarketsWebSocket() {
    if (marketsWs) {
      try {
        marketsWs.close();
      } catch (e) {}
      marketsWs = null;
    }
    const streams = Object.keys(LIVE_BINANCE_MAP)
      .map((sym) => LIVE_BINANCE_MAP[sym].toLowerCase() + "@ticker")
      .concat(["eurusdt@ticker"])
      .join("/");
    const wsUrl = "wss://stream.binance.com:9443/stream?streams=" + streams;
    try {
      marketsWs = new WebSocket(wsUrl);
    } catch (e) {
      setMarketsLiveStatus(false, "WebSocket indisponible");
      return;
    }
    marketsWs.onopen = () => {
      setMarketsLiveStatus(true, "temps réel");
    };
    marketsWs.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const tick = msg.data || msg;
        if (!tick || !tick.s) return;
        if (tick.s === "EURUSDT") {
          applyCfaFromEur(Number(tick.c));
          marketsDirty = true;
          return;
        }
        const sym = LIVE_PAIR_TO_SYM[tick.s];
        if (!sym) return;
        applyTickerToMarket(
          sym,
          Number(tick.c),
          Number(tick.P),
          Number(tick.h),
          Number(tick.l),
          Number(tick.q)
        );
      } catch (e) {}
    };
    marketsWs.onclose = () => {
      setMarketsLiveStatus(false, "Reconnexion…");
      if (marketsWsRetry) clearTimeout(marketsWsRetry);
      marketsWsRetry = setTimeout(connectMarketsWebSocket, 2000);
    };
    marketsWs.onerror = () => {
      try {
        marketsWs.close();
      } catch (e) {}
    };
  }

  function startLiveMarkets() {
    /* PI reste stable à $314,159 ; cryptos live Binance ; CFA peg 600 */
    lockPiPrice();
    lockCfaParity();
    refreshLiveMarketsRest();
    connectMarketsWebSocket();
    /* Affichage à chaque seconde (le flux WS arrive en continu) */
    if (window.__dcsMarketsTimer) clearInterval(window.__dcsMarketsTimer);
    window.__dcsMarketsTimer = setInterval(paintLiveMarkets, 1000);
    /* Filet de secours REST si le WS coupe longtemps */
    if (window.__dcsMarketsRestTimer) clearInterval(window.__dcsMarketsRestTimer);
    window.__dcsMarketsRestTimer = setInterval(() => {
      if (!marketsWs || marketsWs.readyState !== 1) refreshLiveMarketsRest();
    }, 15000);
  }

  function getFeePercent(kind, usdValue) {
    if (DCS.fees && typeof DCS.fees.percent === "number") return DCS.fees.percent;
    const tiers = (DCS.fees && DCS.fees[kind]) || [];
    for (let i = 0; i < tiers.length; i++) {
      if (usdValue <= tiers[i].maxUsd) return tiers[i].percent;
    }
    return tiers.length ? tiers[tiers.length - 1].percent : 1;
  }

  /** Frais en PI uniquement + répartition commissions parrainage (prélevées sur les frais) */
  function calcTxFee(kind, usdValue) {
    const percent = getFeePercent(kind, usdValue);
    const feeUsd = (usdValue * percent) / 100;
    const piPrice = DCS.PI_PRICE || 314159;
    const feePi = feeUsd / piPrice;
    const rates = DCS.referralRates || [];
    const r1 = ((rates.find((r) => r.level === 1) || {}).rate || 5) / 100;
    const r2 = ((rates.find((r) => r.level === 2) || {}).rate || 3) / 100;
    const r3 = ((rates.find((r) => r.level === 3) || {}).rate || 1) / 100;
    const n1 = feePi * r1;
    const n2 = feePi * r2;
    const n3 = feePi * r3;
    return {
      percent,
      feeUsd,
      feePi,
      referral: { n1, n2, n3, total: n1 + n2 + n3 },
      platformPi: feePi - (n1 + n2 + n3)
    };
  }

  function formatPiFee(n) {
    if (!n || n === 0) return "0 PI";
    const digits = n < 0.0001 ? 8 : n < 0.01 ? 6 : 4;
    return (
      Number(n).toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: digits
      }) + " PI"
    );
  }

  function deductPiFee(feePi, detail) {
    /* Les frais sont appliqués côté serveur (dcs_swap / dcs_transfer) */
    if (!window.DCS || !feePi || feePi <= 0) return true;
    const pi = (DCS.wallet || []).find((w) => w.symbol === "PI");
    if (!pi) {
      alert("Wallet PI COIN introuvable.");
      return false;
    }
    if (pi.amount < feePi) {
      alert(
        "Solde PI insuffisant pour les frais (" +
          formatPiFee(feePi) +
          " requis, " +
          fmt.amount(pi.amount) +
          " PI disponibles)."
      );
      return false;
    }
    return true;
  }

  function renderFeeBreakdown(el, fee, kindLabel) {
    if (!el || !fee) return;
    el.innerHTML = `
      <div class="fee-row"><span>Frais ${kindLabel} (${fee.percent.toLocaleString("fr-FR")} %)</span><strong>${formatPiFee(fee.feePi)}</strong></div>
      <div class="fee-row muted"><span>Dont commission N1 (5 %)</span><span>${formatPiFee(fee.referral.n1)}</span></div>
      <div class="fee-row muted"><span>Dont commission N2 (3 %)</span><span>${formatPiFee(fee.referral.n2)}</span></div>
      <div class="fee-row muted"><span>Dont commission N3 (1 %)</span><span>${formatPiFee(fee.referral.n3)}</span></div>
      <p class="fee-note">Frais payés en PI COIN uniquement. Les commissions de parrainage sont prélevées sur ces frais.</p>`;
  }

  function setupSwap() {
    const from = document.getElementById("swap-from");
    const to = document.getElementById("swap-to");
    const amount = document.getElementById("swap-amount");
    const result = document.getElementById("swap-result");
    const rateEl = document.getElementById("swap-rate");
    const feeBox = document.getElementById("swap-fee");
    const confirmBtn = document.getElementById("swap-confirm");
    const slipInput = document.getElementById("swap-slippage");
    const minOutEl = document.getElementById("swap-min-out");
    const balEl = document.getElementById("swap-from-balance");
    const usdEl = document.getElementById("swap-amount-usd");
    if (!from || !to || !amount || !result) return;

    const params = new URLSearchParams(location.search);
    if (params.get("from")) from.value = params.get("from");
    if (params.get("to")) to.value = params.get("to");

    let lastFee = null;
    let lastOut = 0;
    let lastMinOut = 0;
    let lastSlip = 0.5;

    function marketPrice(sym) {
      lockPiPrice();
      if (sym === "PI") return DCS.PI_PRICE || 314159;
      const m = DCS.markets && DCS.markets.find((x) => x.symbol === sym);
      return m && m.price > 0 ? m.price : 0;
    }

    function updateFromBalance() {
      if (!balEl) return;
      const sym = from.value;
      const row = (DCS.wallet || []).find((w) => w.symbol === sym);
      const qty = row ? Number(row.amount) || 0 : 0;
      const digits = sym === "XOF" || sym === "XAF" ? 0 : 6;
      let text =
        "Solde disponible : " +
        qty.toLocaleString("fr-FR", { maximumFractionDigits: digits }) +
        " " +
        sym;
      if (sym === "PI") {
        text += " · 1 PI = " + fmt.piUsd() + " · ≈ " + fmt.piUsd(qty * (DCS.PI_PRICE || 314159));
      }
      balEl.textContent = text;
      balEl.classList.toggle("is-empty", !(qty > 0));
    }

    function getSlippage() {
      const v = parseFloat(slipInput && slipInput.value);
      if (isNaN(v) || v < 0) return 0.5;
      return Math.min(50, v);
    }

    function syncSlipButtons() {
      const slip = getSlippage();
      document.querySelectorAll(".slip-btn").forEach((btn) => {
        const val = parseFloat(btn.getAttribute("data-slip"));
        btn.classList.toggle("active", Math.abs(val - slip) < 0.001);
      });
    }

    function calc() {
      if (!window.DCS || !DCS.markets) {
        result.value = "";
        return;
      }
      lockPiPrice();
      updateFromBalance();
      const fromPrice = marketPrice(from.value);
      const toPrice = marketPrice(to.value);
      const qty = parseFloat(String(amount.value).replace(",", ".")) || 0;
      if (!(fromPrice > 0) || !(toPrice > 0)) {
        result.value = "";
        if (rateEl) rateEl.textContent = "";
        if (minOutEl) minOutEl.textContent = "";
        if (usdEl) usdEl.textContent = "";
        return;
      }
      const out = (qty * fromPrice) / toPrice;
      lastSlip = getSlippage();
      lastOut = out;
      lastMinOut = out * (1 - lastSlip / 100);
      const digits = to.value === "XOF" || to.value === "XAF" ? 0 : 6;
      if (qty > 0 && isFinite(out)) {
        result.value =
          out.toLocaleString("fr-FR", { maximumFractionDigits: digits }) + " " + to.value;
      } else {
        result.value = "";
      }
      if (usdEl) {
        const usdValue = qty * fromPrice;
        if (qty > 0 && isFinite(usdValue)) {
          if (from.value === "PI") {
            usdEl.textContent =
              "Valeur : " + fmt.piUsd(usdValue) + " (1 PI = " + fmt.piUsd() + ")";
          } else if (to.value === "PI") {
            usdEl.textContent =
              "≈ " +
              out.toLocaleString("fr-FR", { maximumFractionDigits: 6 }) +
              " PI · 1 PI = " +
              fmt.piUsd();
          } else {
            usdEl.textContent =
              "≈ " + usdValue.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " $";
          }
        } else {
          usdEl.textContent =
            from.value === "PI" || to.value === "PI" ? "1 PI = " + fmt.piUsd() : "";
        }
      }
      if (minOutEl) {
        minOutEl.textContent =
          qty > 0 && isFinite(lastMinOut)
            ? "Minimum reçu (slippage " +
              lastSlip.toLocaleString("fr-FR") +
              " %) : " +
              lastMinOut.toLocaleString("fr-FR", { maximumFractionDigits: digits }) +
              " " +
              to.value
            : "";
      }
      if (rateEl) {
        const rate = fromPrice / toPrice;
        const rateDigits = to.value === "XOF" || to.value === "XAF" ? 0 : 6;
        let rateText =
          "1 " +
          from.value +
          " ≈ " +
          rate.toLocaleString("fr-FR", { maximumFractionDigits: rateDigits }) +
          " " +
          to.value;
        if (from.value === "PI" || to.value === "PI") {
          rateText += " · PI COIN = " + fmt.piUsd();
        }
        rateEl.textContent = rateText;
      }

      const usdValue = qty * fromPrice;
      lastFee = calcTxFee("swap", usdValue);
      renderFeeBreakdown(feeBox, lastFee, "swap");
      syncSlipButtons();
    }

    [from, to, amount].forEach((el) => {
      el.addEventListener("input", calc);
      el.addEventListener("change", calc);
    });
    if (slipInput) {
      slipInput.addEventListener("input", calc);
      slipInput.addEventListener("change", calc);
    }
    document.querySelectorAll(".slip-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (slipInput) slipInput.value = btn.getAttribute("data-slip");
        calc();
      });
    });

    const flip = document.getElementById("swap-flip");
    if (flip) {
      flip.addEventListener("click", () => {
        const tmp = from.value;
        from.value = to.value;
        to.value = tmp;
        calc();
      });
    }

    if (confirmBtn) {
      confirmBtn.addEventListener("click", async () => {
        const qty = parseFloat(String(amount.value).replace(",", ".")) || 0;
        if (qty <= 0) {
          alert("Indiquez un montant valide.");
          return;
        }
        if (!lastFee) calc();
        const digits = to.value === "XOF" || to.value === "XAF" ? 0 : 6;
        const marketSlip = Math.random() * lastSlip;
        const executed = lastOut * (1 - marketSlip / 100);
        if (executed < lastMinOut - 1e-12) {
          alert(
            "Swap annulé : le prix a bougé au-delà de votre slippage (" +
              lastSlip +
              " %).\nMinimum attendu : " +
              lastMinOut.toLocaleString("fr-FR", { maximumFractionDigits: digits }) +
              " " +
              to.value
          );
          return;
        }
        const fromBal = (DCS.wallet || []).find((w) => w.symbol === from.value);
        if (!fromBal || fromBal.amount < qty) {
          alert("Solde " + from.value + " insuffisant.");
          return;
        }
        if (!deductPiFee(lastFee.feePi)) return;

        confirmBtn.disabled = true;
        const detail =
          from.value +
          " → " +
          to.value +
          " · slip " +
          marketSlip.toFixed(2) +
          "% · frais " +
          lastFee.percent +
          "%" +
          (from.value === "PI" || to.value === "PI" ? " · PI=" + fmt.piUsd() : "");
        const res = await DCS.backend.swap(
          from.value,
          to.value,
          qty,
          executed,
          lastFee.feePi || 0,
          detail
        );
        confirmBtn.disabled = false;
        if (!res.ok) {
          alert(res.error || "Swap impossible.");
          return;
        }
        updateFromBalance();
        if (typeof renderWallet === "function") renderWallet();
        if (typeof renderHistory === "function") renderHistory();
        pushTxNotice(
          "Swap confirmé",
          executed.toLocaleString("fr-FR", { maximumFractionDigits: digits }) +
            " " +
            to.value +
            " reçus",
          "swap"
        );
        alert(
          "Swap confirmé.\nReçu : " +
            executed.toLocaleString("fr-FR", { maximumFractionDigits: digits }) +
            " " +
            to.value +
            "\nSlippage appliqué : " +
            marketSlip.toFixed(2) +
            " % (max " +
            lastSlip +
            " %)\nFrais : " +
            formatPiFee(lastFee.feePi) +
            (from.value === "PI" || to.value === "PI" ? "\nPI COIN : " + fmt.piUsd() : "")
        );
      });
    }
    calc();
  }

  function setupTransfer() {
    const asset = document.getElementById("tr-asset");
    const country = document.getElementById("tr-country");
    const method = document.getElementById("tr-method");
    const methodHint = document.getElementById("tr-method-hint");
    const zoneHint = document.getElementById("tr-zone-hint");
    const receive = document.getElementById("tr-receive");
    const amount = document.getElementById("tr-amount");
    const feeBox = document.getElementById("tr-fee");
    const confirmBtn = document.getElementById("tr-confirm");
    const destInput = document.getElementById("tr-dest");
    const balEl = document.getElementById("tr-balance");
    if (!asset || !country) return;

    let lastFee = null;

    function formatAssetAmount(sym, qty) {
      const digits = sym === "XOF" || sym === "XAF" ? 0 : 6;
      return Number(qty || 0).toLocaleString("fr-FR", { maximumFractionDigits: digits });
    }

    function updateBalance() {
      if (!balEl) return;
      const sym = asset.value;
      const row = (DCS.wallet || []).find((w) => w.symbol === sym);
      const qty = row ? Number(row.amount) || 0 : 0;
      balEl.textContent = "Solde disponible : " + formatAssetAmount(sym, qty) + " " + sym;
      balEl.classList.toggle("is-empty", !(qty > 0));
    }

    function countriesForAsset(sym) {
      if (sym === "XOF" || sym === "XAF") {
        return DCS.corridors[sym] || [];
      }
      return (DCS.africaPayout || []).map((c) => c.name);
    }

    function fillMethods() {
      if (!method) return;
      const info = DCS.getCountryInfo && DCS.getCountryInfo(country.value);
      const list = (info && info.methods) || ["Banque locale"];
      method.innerHTML = list
        .map((m) => `<option value="${m}">${m}</option>`)
        .join("");
      if (methodHint) {
        methodHint.textContent = info
          ? "Zone " +
            info.zone +
            " · devise locale indicative : " +
            info.currency +
            "."
          : "";
      }
      if (destInput) {
        const m = method.value || "";
        destInput.placeholder = /banque/i.test(m)
          ? "IBAN / compte bancaire"
          : "Numéro Mobile Money du destinataire";
      }
    }

    function fillCountries() {
      const sym = asset.value;
      const list = countriesForAsset(sym);
      const prev = country.value;
      country.innerHTML = list
        .map((c) => {
          const info = DCS.getCountryInfo && DCS.getCountryInfo(c);
          const label = info ? c + " · " + info.zone : c;
          return `<option value="${c}">${label}</option>`;
        })
        .join("");
      if (prev && list.includes(prev)) country.value = prev;
      fillMethods();
      updateBalance();
      updateHint();
    }

    function updateHint() {
      const sym = asset.value;
      const dest = country.value;
      const info = DCS.getCountryInfo && DCS.getCountryInfo(dest);
      const inXof = (DCS.corridors.XOF || []).includes(dest);
      const inXaf = (DCS.corridors.XAF || []).includes(dest);
      let msg = "";
      if (sym === "XOF" && inXaf) {
        msg = "Transfert transfrontalier XOF → XAF (UEMOA → CEMAC). Conversion 1:1 indicative.";
      } else if (sym === "XAF" && inXof) {
        msg = "Transfert transfrontalier XAF → XOF (CEMAC → UEMOA). Conversion 1:1 indicative.";
      } else if (sym === "XOF" || sym === "XAF") {
        msg =
          "Transfert local " +
          sym +
          (info ? " · " + info.zone : "") +
          ".";
      } else if (sym === "PI") {
        msg =
          "Transfert en PI COIN ($314,159) vers " +
          dest +
          " — convertible / payable via " +
          ((method && method.value) || "Mobile Money") +
          ".";
      } else {
        msg =
          "Transfert en " +
          sym +
          " vers " +
          dest +
          (method && method.value ? " via " + method.value : "") +
          ".";
      }
      if (zoneHint) zoneHint.textContent = msg;

      const qty = parseFloat(String((amount && amount.value) || "").replace(",", ".")) || 0;
      if (receive && amount) {
        const fromM = DCS.markets.find((m) => m.symbol === sym);
        let outSym = sym;
        if (sym === "XOF" && inXaf) outSym = "XAF";
        if (sym === "XAF" && inXof) outSym = "XOF";
        if (sym === "PI" && (inXof || inXaf)) {
          outSym = inXof ? "XOF" : "XAF";
          const cfa = qty * DCS.PI_PRICE * (DCS.CFA_PER_USD || 600);
          receive.value = cfa
            ? cfa.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " " + outSym
            : "";
        } else if (sym === "PI" && info && info.currency && info.currency !== "XOF" && info.currency !== "XAF") {
          receive.value = qty
            ? fmt.amount(qty) + " PI → payout " + info.currency + " (indicatif)"
            : "";
        } else if (fromM && (outSym === "XOF" || outSym === "XAF") && sym !== outSym && sym !== "PI") {
          const toM = DCS.markets.find((m) => m.symbol === outSym);
          const out = (qty * fromM.price) / toM.price;
          receive.value = out.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " " + outSym;
        } else {
          receive.value = qty ? fmt.amount(qty) + " " + outSym : "";
        }
      }

      const fromM = DCS.markets.find((m) => m.symbol === sym);
      const usdValue = fromM ? qty * fromM.price : 0;
      lastFee = calcTxFee("transfer", usdValue);
      renderFeeBreakdown(feeBox, lastFee, "transfert");
    }

    asset.addEventListener("change", fillCountries);
    country.addEventListener("change", () => {
      fillMethods();
      updateHint();
    });
    if (method) method.addEventListener("change", updateHint);
    if (amount) amount.addEventListener("input", updateHint);

    document.querySelectorAll("#tr-history-filters .tx-filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#tr-history-filters .tx-filter-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderHistory();
      });
    });
    document.querySelectorAll("#tr-notif-filters .tx-filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#tr-notif-filters .tx-filter-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderNotifications();
      });
    });

    if (confirmBtn) {
      confirmBtn.addEventListener("click", async () => {
        const qty = parseFloat(String((amount && amount.value) || "").replace(",", ".")) || 0;
        const dest = (destInput && destInput.value) || "";
        const payMethod = (method && method.value) || "";
        if (qty <= 0) {
          alert("Indiquez un montant valide.");
          return;
        }
        if (!dest.trim()) {
          alert("Indiquez l'identifiant / numéro du destinataire.");
          return;
        }
        if (!payMethod) {
          alert("Choisissez un moyen de paiement.");
          return;
        }
        if (!lastFee) updateHint();
        const bal = (DCS.wallet || []).find((w) => w.symbol === asset.value);
        if (!bal || bal.amount < qty) {
          alert(
            "Solde " +
              asset.value +
              " insuffisant.\nDisponible : " +
              formatAssetAmount(asset.value, bal ? bal.amount : 0) +
              " " +
              asset.value
          );
          return;
        }
        if (!deductPiFee(lastFee.feePi)) return;
        confirmBtn.disabled = true;
        const detail =
          asset.value +
          " → " +
          country.value +
          " · " +
          payMethod +
          (dest ? " · " + dest.trim() : "");
        const res = await DCS.backend.transfer(
          asset.value,
          qty,
          lastFee.feePi || 0,
          detail,
          {
            destination: dest.trim(),
            country: country.value,
            method: payMethod
          }
        );
        confirmBtn.disabled = false;
        if (!res.ok) {
          alert(res.error || "Transfert impossible.");
          return;
        }
        updateBalance();
        renderHistory();
        if (typeof renderWallet === "function") renderWallet();
        if (typeof renderNotifications === "function") renderNotifications();
        const data = res.data || {};
        pushTxNotice(
          data.p2p ? "Transfert P2P confirmé" : "Transfert en attente",
          qty + " " + asset.value + " · " + country.value,
          data.p2p ? "transfer" : "payout"
        );
        alert(
          (data.p2p
            ? "Transfert P2P confirmé vers un membre DCS.\n"
            : "Transfert enregistré — statut : En attente (Mobile Money / banque).\n") +
            "Pays : " +
            country.value +
            "\nMoyen : " +
            payMethod +
            "\nDestinataire : " +
            dest.trim() +
            "\nFrais : " +
            formatPiFee(lastFee.feePi)
        );
      });
    }
    fillCountries();
    updateBalance();
  }

  function renderReferral() {
    if (!window.DCS || !DCS.user) return;
    if (typeof DCS.buildShareLinks === "function") DCS.buildShareLinks();
    const userEl = document.getElementById("ref-username");
    const codeEl = document.getElementById("ref-code");
    const linkEl = document.getElementById("ref-link");
    if (userEl) userEl.textContent = atHandle(primaryUsername(DCS.user) || displayUserLabel(DCS.user));
    if (codeEl) codeEl.value = typeof DCS.primaryInviteCode === "function" ? DCS.primaryInviteCode(DCS.user) : DCS.user.inviteCode;
    if (linkEl) linkEl.value = DCS.user.referralLink;

    const rates = document.getElementById("ref-rates");
    if (rates) {
      rates.innerHTML = DCS.referralRates
        .map(
          (r) => `<div class="ref-level">
            <div class="lvl">Niveau ${r.level}</div>
            <div class="pct">${r.rate}%</div>
            <p>${r.label}</p>
            <p style="font-size:0.72rem;color:var(--muted);margin-top:0.35rem">des frais filleuls</p>
          </div>`
        )
        .join("");
    }

    function fillLevel(id, list, showVia) {
      const el = document.getElementById(id);
      if (!el) return;
      if (!list.length) {
        el.innerHTML = `<p style="color:var(--muted);font-size:0.85rem">Aucun filleul pour l'instant.</p>`;
        return;
      }
      el.innerHTML = list
        .map(function (m) {
          var name = atHandle(m.username || m.piUsername || m.code);
          var meta = [];
          if (showVia && m.via) meta.push("via " + atHandle(m.via));
          if (m.date) meta.push(m.date);
          return (
            '<div class="member">' +
            "<div>" +
            "<strong>" +
            name +
            "</strong>" +
            (meta.length
              ? '<div style="font-size:0.75rem;color:var(--muted)">' +
                meta.join(" · ") +
                "</div>"
              : "") +
            "</div>" +
            '<div style="text-align:right">' +
            '<span class="ref-badge">+' +
            (m.earned || "—") +
            "</span>" +
            "</div>" +
            "</div>"
          );
        })
        .join("");
    }

    fillLevel("ref-l1", DCS.referrals.level1, false);
    fillLevel("ref-l2", DCS.referrals.level2, true);
    fillLevel("ref-l3", DCS.referrals.level3, true);

    const n1 = DCS.referrals.level1.length;
    const n2 = DCS.referrals.level2.length;
    const n3 = DCS.referrals.level3.length;
    const total = n1 + n2 + n3;

    const allNames = []
      .concat(DCS.referrals.level1 || [])
      .concat(DCS.referrals.level2 || [])
      .concat(DCS.referrals.level3 || [])
      .map(function (m) {
        return atHandle(m.username || m.piUsername || m.code);
      })
      .filter(Boolean);
    const namesEl = document.getElementById("ref-usernames-list");
    if (namesEl) {
      namesEl.innerHTML = allNames.length
        ? allNames
            .map(function (n) {
              return '<span class="ref-user-chip">' + n + "</span>";
            })
            .join("")
        : '<span style="color:var(--muted);font-size:0.85rem">Aucun filleul inscrit pour le moment.</span>';
    }

    function filleulLabel(n) {
      return n + " filleul" + (n > 1 ? "s" : "");
    }

    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setText("ref-filleuls-total", String(total));
    setText("ref-count-l1", String(n1));
    setText("ref-count-l2", String(n2));
    setText("ref-count-l3", String(n3));
    setText("ref-pill-l1", filleulLabel(n1));
    setText("ref-pill-l2", filleulLabel(n2));
    setText("ref-pill-l3", filleulLabel(n3));

    const earnings = DCS.referralEarnings;
    if (earnings) {
      setText(
        "ref-earnings-total",
        (earnings.fromFeesPi != null ? earnings.fromFeesPi : earnings.totalPi) + " PI"
      );
      const list = document.getElementById("ref-earnings-list");
      if (list && earnings.recent) {
        list.innerHTML = earnings.recent
          .map(function (e) {
            return (
              '<div class="member">' +
              "<div>" +
              "<strong>" +
              atHandle(e.from) +
              "</strong>" +
              '<div style="font-size:0.75rem;color:var(--muted)">' +
              (e.type || "Frais") +
              " · N" +
              e.level +
              " · frais " +
              e.feePi +
              " PI · " +
              e.date +
              "</div>" +
              "</div>" +
              '<div style="text-align:right">' +
              '<span class="ref-badge">+' +
              e.commissionPi +
              " PI</span>" +
              "</div>" +
              "</div>"
            );
          })
          .join("");
      }
    }

    const stats = document.getElementById("ref-stats");
    if (stats) {
      stats.innerHTML = `
        <div class="stat-cell"><span>Filleuls N1</span><strong>${n1}</strong></div>
        <div class="stat-cell"><span>Filleuls N2</span><strong>${n2}</strong></div>
        <div class="stat-cell"><span>Filleuls N3</span><strong>${n3}</strong></div>
        <div class="stat-cell"><span>Total filleuls</span><strong>${total}</strong></div>`;
    }
  }

  function setupReferralActions() {
    function copyField(inputId, label) {
      const input = document.getElementById(inputId);
      if (!input) return;
      input.select();
      navigator.clipboard.writeText(input.value).then(
        () => alert(label + " copié !\n\n" + input.value),
        () => alert(label + " : " + input.value)
      );
    }
    const copyCode = document.getElementById("copy-ref-code");
    const copyLink = document.getElementById("copy-ref-link");
    if (copyCode) copyCode.addEventListener("click", () => copyField("ref-code", "Code d'invitation"));
    if (copyLink) copyLink.addEventListener("click", () => copyField("ref-link", "Lien d'invitation"));
  }

  function isSyntheticPiEmail(val) {
    return /@auth\.dcs(\.app)?$/i.test(String(val || "")) || /^pi\.[a-f0-9]{8,}@/i.test(String(val || ""));
  }

  /** Retire les @ en tête pour éviter @@ ou une lettre mangée */
  function bareUsername(raw) {
    return String(raw || "")
      .trim()
      .replace(/^@+/, "");
  }

  function atHandle(raw) {
    var s = bareUsername(raw);
    return s ? "@" + s : "—";
  }

  function primaryUsername(u) {
    if (!u) return "";
    if (u.piUsername) return bareUsername(u.piUsername);
    if (u.username && !/^pi\./i.test(u.username) && !isSyntheticPiEmail(u.username)) {
      return bareUsername(u.username);
    }
    if (u.displayName && !isSyntheticPiEmail(u.displayName) && !/\s/.test(u.displayName)) {
      return bareUsername(u.displayName);
    }
    return bareUsername(u.username || u.piUsername || "");
  }

  function displayUserLabel(u) {
    if (!u) return "—";
    if (u.piUsername) return atHandle(u.piUsername);
    if (u.displayName && !isSyntheticPiEmail(u.displayName)) return u.displayName;
    if (u.username && !/^pi\./i.test(u.username) && !isSyntheticPiEmail(u.username)) {
      return atHandle(u.username);
    }
    if (u.email && !isSyntheticPiEmail(u.email)) return u.email;
    return u.displayName && !isSyntheticPiEmail(u.displayName)
      ? u.displayName
      : atHandle(u.username || u.piUsername || "Pioneer");
  }

  function normalizeBirthDateClient(raw) {
    var s = String(raw || "").trim();
    if (!s) return "";
    var iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return iso[1] + "-" + iso[2] + "-" + iso[3];
    var fr = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
    if (fr) {
      return fr[3] + "-" + ("0" + fr[2]).slice(-2) + "-" + ("0" + fr[1]).slice(-2);
    }
    return "";
  }

  function initBirthdateSelects() {
    var dayEl = document.getElementById("edit-birth-day");
    var yearEl = document.getElementById("edit-birth-year");
    if (!dayEl || !yearEl) return;
    if (dayEl.options.length <= 1) {
      for (var d = 1; d <= 31; d++) {
        var od = document.createElement("option");
        od.value = ("0" + d).slice(-2);
        od.textContent = String(d);
        dayEl.appendChild(od);
      }
    }
    if (yearEl.options.length <= 1) {
      var yNow = new Date().getFullYear();
      for (var y = yNow - 13; y >= yNow - 100; y--) {
        var oy = document.createElement("option");
        oy.value = String(y);
        oy.textContent = String(y);
        yearEl.appendChild(oy);
      }
    }
  }

  function fillBirthdateSelects(raw) {
    initBirthdateSelects();
    var dayEl = document.getElementById("edit-birth-day");
    var monthEl = document.getElementById("edit-birth-month");
    var yearEl = document.getElementById("edit-birth-year");
    if (!dayEl || !monthEl || !yearEl) return;
    var iso = normalizeBirthDateClient(raw);
    if (!iso) {
      dayEl.value = "";
      monthEl.value = "";
      yearEl.value = "";
      return;
    }
    var parts = iso.split("-");
    yearEl.value = parts[0] || "";
    monthEl.value = parts[1] || "";
    dayEl.value = parts[2] || "";
  }

  function readBirthdateFromSelects() {
    var dayEl = document.getElementById("edit-birth-day");
    var monthEl = document.getElementById("edit-birth-month");
    var yearEl = document.getElementById("edit-birth-year");
    if (!dayEl || !monthEl || !yearEl) return "";
    var d = dayEl.value;
    var m = monthEl.value;
    var y = yearEl.value;
    if (!d || !m || !y) return "";
    var dim = new Date(Number(y), Number(m), 0).getDate();
    if (Number(d) > dim) d = ("0" + dim).slice(-2);
    return normalizeBirthDateClient(y + "-" + m + "-" + d);
  }

  function renderProfile() {
    if (!window.DCS || !DCS.user) return;
    const u = DCS.user;
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || "";
    };
    const label = displayUserLabel(u);
    set("profile-displayname", u.displayName || u.piUsername || u.username || "—");
    set("profile-username", label);
    set("profile-joined", "Membre depuis " + u.joined);
    set("profile-invite", typeof DCS.primaryInviteCode === "function" ? DCS.primaryInviteCode(u) : u.inviteCode);
    const session = document.getElementById("session-label");
    if (session) session.textContent = u.loggedIn ? "Connecté · " + label : "Déconnecté";
    const loc = [u.city, u.country].filter(Boolean).join(", ");
    set("profile-location", loc || "Localisation non renseignée");

    setVal("edit-firstname", u.firstName);
    setVal("edit-lastname", u.lastName);
    setVal("edit-displayname", u.displayName);
    const emailField = document.getElementById("edit-email");
    if (emailField) {
      if (isSyntheticPiEmail(u.email)) {
        emailField.value = u.piUsername ? "Compte Pi · @" + u.piUsername : "Compte Pi (sans e-mail)";
        emailField.readOnly = true;
      } else {
        emailField.value = u.email || "";
      }
    }
    setVal("edit-gender", u.gender);
    setVal("edit-country", u.country);
    setVal("edit-city", u.city);
    setVal("edit-address", u.address);
    setVal("edit-bio", u.bio);
    fillBirthdateSelects(u.birthDate);

    const avatarImg = document.getElementById("profile-avatar");
    const avatarFb = document.getElementById("profile-avatar-fallback");
    if (avatarImg && avatarFb) {
      const showFallback = () => {
        avatarImg.removeAttribute("src");
        avatarImg.hidden = true;
        avatarFb.hidden = false;
        const initials = ((u.firstName || "")[0] || "") + ((u.lastName || "")[0] || "");
        avatarFb.textContent = (initials || u.piUsername || u.displayName || u.username || "PI")
          .replace(/^@/, "")
          .slice(0, 2)
          .toUpperCase();
      };
      if (u.avatar && !String(u.avatar).startsWith("blob:")) {
        avatarImg.onload = function () {
          avatarImg.hidden = false;
          avatarFb.hidden = true;
        };
        avatarImg.onerror = showFallback;
        avatarImg.src = u.avatar;
      } else {
        showFallback();
      }
    }

    const kycEl = document.getElementById("kyc-status");
    const kycHint = document.getElementById("kyc-status-hint");
    const resetKycBtn = document.getElementById("reset-kyc");
    if (kycEl) {
      const map = {
        verified: ["on", "Vérifié"],
        pending: ["off", "En attente de revue"],
        none: ["off", "Non démarré"]
      };
      const key = u.kyc === "pending" || u.kyc === "verified" ? u.kyc : "none";
      const s = map[key];
      kycEl.innerHTML = `<span class="status-dot ${s[0]}"></span>${s[1]}`;
      if (kycHint) {
        if (key === "pending") {
          kycHint.textContent =
            "Dossier en attente de revue" +
            (u.kycDocType
              ? " (" +
                ({ cni: "CNI", passport: "Passeport", residence: "Titre de séjour", driving: "Permis" }[
                  u.kycDocType
                ] || u.kycDocType) +
                ")."
              : ".") +
            " Sans vrais documents, réinitialisez ci-dessous.";
        } else if (key === "verified") {
          kycHint.textContent = "Identité validée par l'équipe DCS.";
        } else {
          kycHint.textContent =
            "Choisissez le type de pièce, ajoutez le scan, puis prenez un selfie avec la caméra.";
        }
      }
      if (resetKycBtn) resetKycBtn.hidden = key === "none";
    }

    function linkStatus(id, linked, okLabel, koLabel) {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = linked
        ? `<span class="status-dot on"></span>${okLabel}`
        : `<span class="status-dot off"></span>${koLabel}`;
    }
    linkStatus("gmail-status", u.gmailLinked, u.email || "E-mail vérifié", "E-mail non confirmé");
    if (u.phone && !u.phoneLinked) {
      const phoneEl = document.getElementById("phone-status");
      if (phoneEl) {
        phoneEl.innerHTML =
          `<span class="status-dot off"></span>${u.phone} · non vérifié`;
      }
    } else {
      linkStatus("phone-status", u.phoneLinked, u.phone || "Téléphone vérifié", "Non vérifié");
    }
    linkStatus("ga-status", u.googleAuth, "2FA actif", "Non activé");
    const gaBtn = document.getElementById("link-ga");
    if (gaBtn) gaBtn.textContent = u.googleAuth ? "Désactiver 2FA" : "Configurer 2FA";
  }

  function setupProfileForms() {
    initBirthdateSelects();
    const photoInput = document.getElementById("avatar-input");
    if (photoInput) {
      photoInput.addEventListener("change", async () => {
        const file = photoInput.files && photoInput.files[0];
        if (!file) return;
        if (!file.type || file.type.indexOf("image/") !== 0) {
          alert("Choisissez une image (JPG, PNG…).");
          photoInput.value = "";
          return;
        }
        if (file.size > 8 * 1024 * 1024) {
          alert("Image trop lourde (max. 8 Mo).");
          photoInput.value = "";
          return;
        }
        const wrap = photoInput.closest(".avatar-wrap") || document.querySelector(".avatar-wrap");
        const hint = document.getElementById("avatar-hint");
        const prevHint = hint ? hint.textContent : "";
        if (wrap) wrap.classList.add("is-uploading");
        if (hint) hint.textContent = "Envoi de la photo…";
        const res = await DCS.backend.uploadAvatar(file);
        if (wrap) wrap.classList.remove("is-uploading");
        if (hint) hint.textContent = prevHint || "Touchez la photo pour la changer";
        photoInput.value = "";
        if (!res.ok) {
          alert(res.error || "Impossible d'enregistrer la photo.");
          return;
        }
        renderProfile();
        if (hint) hint.textContent = "Photo mise à jour";
        setTimeout(function () {
          if (hint) hint.textContent = "Touchez la photo pour la changer";
        }, 2200);
      });
    }

    const gmailBtn = document.getElementById("link-gmail");
    if (gmailBtn) {
      gmailBtn.addEventListener("click", async () => {
        if (!DCS.backend || !DCS.backend.client) {
          alert("Backend non configuré.");
          return;
        }
        const { data, error } = await DCS.backend.client.auth.getUser();
        if (error || !data.user) {
          alert("Session invalide. Reconnectez-vous.");
          return;
        }
        await DCS.backend.syncSecurityFlags(data.user);
        renderProfile();
        if (DCS.user.gmailLinked) {
          alert(
            "E-mail vérifié : " +
              (DCS.user.email || data.user.email) +
              ".\nCet e-mail a été confirmé à l'inscription. Pour lier un compte Google séparé, activez le provider Google dans Supabase."
          );
        } else {
          alert(
            "E-mail pas encore confirmé. Vérifiez votre boîte mail (lien de confirmation) puis réessayez."
          );
        }
      });
    }

    const phoneBtn = document.getElementById("link-phone");
    if (phoneBtn) {
      phoneBtn.addEventListener("click", async () => {
        const phone = prompt(
          "Numéro international (ex. +229…).\nAttention : sans vérification SMS, le numéro sera enregistré mais restera « non vérifié ».",
          DCS.user.phone || ""
        );
        if (!phone) return;
        const res = await DCS.backend.savePhoneUnverified(phone);
        if (!res.ok) {
          alert(res.error || "Enregistrement impossible.");
          return;
        }
        renderProfile();
        alert(res.message);
      });
    }

    let pendingMfaFactorId = "";
    const mfaPanel = document.getElementById("mfa-enroll-panel");
    const mfaQr = document.getElementById("mfa-qr");
    const mfaSecret = document.getElementById("mfa-secret");
    const mfaErr = document.getElementById("mfa-error");
    const mfaCode = document.getElementById("mfa-code");

    function hideMfaPanel() {
      pendingMfaFactorId = "";
      if (mfaPanel) mfaPanel.hidden = true;
      if (mfaQr) {
        mfaQr.hidden = true;
        mfaQr.removeAttribute("src");
      }
      if (mfaSecret) {
        mfaSecret.hidden = true;
        mfaSecret.textContent = "";
      }
      if (mfaCode) mfaCode.value = "";
      if (mfaErr) {
        mfaErr.hidden = true;
        mfaErr.textContent = "";
      }
    }

    const gaBtn = document.getElementById("link-ga");
    if (gaBtn) {
      gaBtn.addEventListener("click", async () => {
        if (DCS.user.googleAuth) {
          const ok = confirm("Désactiver Google Authenticator (2FA) ?");
          if (!ok) return;
          const res = await DCS.backend.disableTotp();
          if (!res.ok) {
            alert(res.error || "Désactivation impossible.");
            return;
          }
          hideMfaPanel();
          renderProfile();
          alert("2FA désactivé.");
          return;
        }
        gaBtn.disabled = true;
        const enroll = await DCS.backend.startTotpEnroll();
        gaBtn.disabled = false;
        if (!enroll.ok) {
          alert(enroll.error || "Impossible de démarrer le 2FA.");
          return;
        }
        pendingMfaFactorId = enroll.factorId;
        if (mfaPanel) mfaPanel.hidden = false;
        if (mfaQr && enroll.qr) {
          mfaQr.src = enroll.qr;
          mfaQr.hidden = false;
        }
        if (mfaSecret && enroll.secret) {
          mfaSecret.hidden = false;
          mfaSecret.textContent = "Clé manuelle : " + enroll.secret;
        }
        if (mfaCode) mfaCode.focus();
      });
    }

    const mfaVerify = document.getElementById("mfa-verify");
    if (mfaVerify) {
      mfaVerify.addEventListener("click", async () => {
        if (!pendingMfaFactorId) {
          alert("Relancez la configuration 2FA.");
          return;
        }
        const code = (mfaCode && mfaCode.value) || "";
        if (!/^\d{6}$/.test(code.trim())) {
          if (mfaErr) {
            mfaErr.hidden = false;
            mfaErr.textContent = "Entrez le code à 6 chiffres.";
          }
          return;
        }
        mfaVerify.disabled = true;
        const res = await DCS.backend.verifyTotpEnroll(pendingMfaFactorId, code);
        mfaVerify.disabled = false;
        if (!res.ok) {
          if (mfaErr) {
            mfaErr.hidden = false;
            mfaErr.textContent = res.error || "Code incorrect.";
          }
          return;
        }
        hideMfaPanel();
        renderProfile();
        alert("2FA activé. Conservez votre application Authenticator.");
      });
    }

    const mfaCancel = document.getElementById("mfa-cancel");
    if (mfaCancel) {
      mfaCancel.addEventListener("click", async () => {
        if (pendingMfaFactorId) {
          await DCS.backend.disableTotp(pendingMfaFactorId);
        }
        hideMfaPanel();
      });
    }

    let kycSelfieDataUrl = "";
    let kycCameraStream = null;
    let kycCapturedBlobUrl = "";

    function stopKycCamera() {
      if (kycCameraStream) {
        kycCameraStream.getTracks().forEach((t) => t.stop());
        kycCameraStream = null;
      }
      const video = document.getElementById("kyc-camera-video");
      if (video) video.srcObject = null;
    }

    function setKycSelfiePreview(dataUrl) {
      kycSelfieDataUrl = dataUrl || "";
      const wrap = document.getElementById("kyc-selfie-preview-wrap");
      const img = document.getElementById("kyc-selfie-preview");
      const status = document.getElementById("kyc-selfie-status");
      if (wrap && img) {
        if (dataUrl) {
          img.src = dataUrl;
          wrap.hidden = false;
          if (status) status.textContent = "Selfie capturé";
        } else {
          img.removeAttribute("src");
          wrap.hidden = true;
          if (status) status.textContent = "Aucun selfie";
        }
      }
    }

    function closeKycCameraModal() {
      const modal = document.getElementById("kyc-camera-modal");
      if (modal) modal.hidden = true;
      stopKycCamera();
      const shot = document.getElementById("kyc-camera-shot");
      const video = document.getElementById("kyc-camera-video");
      const captureBtn = document.getElementById("kyc-camera-capture");
      const useBtn = document.getElementById("kyc-camera-use");
      const retryBtn = document.getElementById("kyc-camera-retry");
      const err = document.getElementById("kyc-camera-error");
      if (shot) {
        shot.hidden = true;
        shot.removeAttribute("src");
      }
      if (video) video.hidden = false;
      if (captureBtn) captureBtn.hidden = false;
      if (useBtn) useBtn.hidden = true;
      if (retryBtn) retryBtn.hidden = true;
      if (err) {
        err.hidden = true;
        err.textContent = "";
      }
      if (kycCapturedBlobUrl) {
        try {
          URL.revokeObjectURL(kycCapturedBlobUrl);
        } catch (e) {}
        kycCapturedBlobUrl = "";
      }
    }

    async function openKycCamera() {
      const modal = document.getElementById("kyc-camera-modal");
      const video = document.getElementById("kyc-camera-video");
      const shot = document.getElementById("kyc-camera-shot");
      const captureBtn = document.getElementById("kyc-camera-capture");
      const useBtn = document.getElementById("kyc-camera-use");
      const retryBtn = document.getElementById("kyc-camera-retry");
      const err = document.getElementById("kyc-camera-error");
      if (!modal || !video) return;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Votre navigateur ne permet pas l'accès à la caméra. Utilisez Chrome/Safari à jour, en HTTPS.");
        return;
      }
      modal.hidden = false;
      if (shot) {
        shot.hidden = true;
        shot.removeAttribute("src");
        delete shot.dataset.dataUrl;
      }
      video.hidden = false;
      if (captureBtn) captureBtn.hidden = false;
      if (useBtn) useBtn.hidden = true;
      if (retryBtn) retryBtn.hidden = true;
      if (err) {
        err.hidden = true;
        err.textContent = "";
      }
      try {
        stopKycCamera();
        kycCameraStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "user" },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        video.srcObject = kycCameraStream;
        await video.play().catch(() => {});
      } catch (e) {
        const msg =
          e && e.name === "NotAllowedError"
            ? "Accès caméra refusé. Autorisez la caméra dans les paramètres du navigateur, puis réessayez."
            : "Impossible d'ouvrir la caméra. Vérifiez les permissions et que rien d'autre ne l'utilise.";
        if (err) {
          err.textContent = msg;
          err.hidden = false;
        } else {
          alert(msg);
        }
      }
    }

    function captureKycSelfieFrame() {
      const video = document.getElementById("kyc-camera-video");
      const canvas = document.getElementById("kyc-camera-canvas");
      const shot = document.getElementById("kyc-camera-shot");
      const captureBtn = document.getElementById("kyc-camera-capture");
      const useBtn = document.getElementById("kyc-camera-use");
      const retryBtn = document.getElementById("kyc-camera-retry");
      if (!video || !canvas || !shot) return;
      const w = video.videoWidth || 720;
      const h = video.videoHeight || 960;
      if (!w || !h) {
        alert("Caméra pas encore prête. Attendez une seconde et réessayez.");
        return;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      // Mirror horizontally to match preview
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      shot.src = dataUrl;
      shot.hidden = false;
      video.hidden = true;
      if (captureBtn) captureBtn.hidden = true;
      if (useBtn) useBtn.hidden = false;
      if (retryBtn) retryBtn.hidden = false;
      stopKycCamera();
      shot.dataset.dataUrl = dataUrl;
    }

    const idFileInput = document.getElementById("kyc-id-file");
    if (idFileInput) {
      idFileInput.addEventListener("change", () => {
        const nameEl = document.getElementById("kyc-id-name");
        const f = idFileInput.files && idFileInput.files[0];
        if (nameEl) {
          if (f) {
            nameEl.textContent = "Fichier : " + f.name;
            nameEl.hidden = false;
          } else {
            nameEl.hidden = true;
            nameEl.textContent = "";
          }
        }
      });
    }

    const openCamBtn = document.getElementById("kyc-open-camera");
    if (openCamBtn) openCamBtn.addEventListener("click", () => openKycCamera());

    const closeCamBtn = document.getElementById("kyc-camera-close");
    if (closeCamBtn) closeCamBtn.addEventListener("click", () => closeKycCameraModal());

    const camModal = document.getElementById("kyc-camera-modal");
    if (camModal) {
      camModal.addEventListener("click", (e) => {
        if (e.target === camModal) closeKycCameraModal();
      });
    }

    const captureBtn = document.getElementById("kyc-camera-capture");
    if (captureBtn) captureBtn.addEventListener("click", () => captureKycSelfieFrame());

    const useBtn = document.getElementById("kyc-camera-use");
    if (useBtn) {
      useBtn.addEventListener("click", () => {
        const shot = document.getElementById("kyc-camera-shot");
        const dataUrl = shot && shot.dataset.dataUrl;
        if (!dataUrl) return;
        setKycSelfiePreview(dataUrl);
        closeKycCameraModal();
      });
    }

    const retryBtn = document.getElementById("kyc-camera-retry");
    if (retryBtn) {
      retryBtn.addEventListener("click", async () => {
        const shot = document.getElementById("kyc-camera-shot");
        const video = document.getElementById("kyc-camera-video");
        const capture = document.getElementById("kyc-camera-capture");
        const use = document.getElementById("kyc-camera-use");
        if (shot) {
          shot.hidden = true;
          shot.removeAttribute("src");
          delete shot.dataset.dataUrl;
        }
        if (capture) capture.hidden = false;
        if (use) use.hidden = true;
        retryBtn.hidden = true;
        if (video) video.hidden = false;
        await openKycCamera();
      });
    }

    const retakeBtn = document.getElementById("kyc-retake-selfie");
    if (retakeBtn) {
      retakeBtn.addEventListener("click", () => {
        setKycSelfiePreview("");
        openKycCamera();
      });
    }

    const DOC_LABELS = {
      cni: "CNI",
      passport: "Passeport",
      residence: "Titre de séjour",
      driving: "Permis de conduire"
    };

    const kycBtn = document.getElementById("start-kyc");
    if (kycBtn) {
      kycBtn.addEventListener("click", async () => {
        const docType = (document.getElementById("kyc-doc-type") || {}).value || "";
        const idFile = document.getElementById("kyc-id-file");
        const hasId = idFile && idFile.files && idFile.files[0];
        if (!docType) {
          alert("Choisissez le type de pièce d'identité (CNI, passeport, etc.).");
          return;
        }
        if (!hasId) {
          alert("Ajoutez la photo ou le scan de votre " + (DOC_LABELS[docType] || "pièce") + ".");
          return;
        }
        if (!kycSelfieDataUrl) {
          alert("Prenez un selfie avec la caméra avant de soumettre.");
          return;
        }
        kycBtn.disabled = true;
        const addressFile = document.getElementById("kyc-address-file");
        const res = await DCS.backend.submitKyc({
          docType: docType,
          idFile: idFile.files[0],
          selfieDataUrl: kycSelfieDataUrl,
          addressFile: addressFile && addressFile.files && addressFile.files[0]
        });
        kycBtn.disabled = false;
        if (!res.ok) {
          alert(res.error || "Action impossible. Réessayez plus tard.");
          return;
        }
        try {
          localStorage.setItem(
            "dcs_kyc_docs_" + (DCS.user.id || ""),
            JSON.stringify({
              docType: docType,
              idName: idFile.files[0].name,
              selfie: true,
              at: Date.now()
            })
          );
        } catch (e) {}
        renderProfile();
        alert(
          "Dossier KYC soumis (" +
            (DOC_LABELS[docType] || docType) +
            " + selfie) — pièces enregistrées, statut : en attente de revue."
        );
      });
    }

    const resetKycBtn = document.getElementById("reset-kyc");
    if (resetKycBtn) {
      resetKycBtn.addEventListener("click", async () => {
        const ok = confirm("Remettre le KYC à « Non démarré » ?");
        if (!ok) return;
        DCS.user.kyc = "none";
        DCS.user.kycDocType = "";
        setKycSelfiePreview("");
        const docSel = document.getElementById("kyc-doc-type");
        if (docSel) docSel.value = "";
        const idFile = document.getElementById("kyc-id-file");
        if (idFile) idFile.value = "";
        const idName = document.getElementById("kyc-id-name");
        if (idName) {
          idName.hidden = true;
          idName.textContent = "";
        }
        try {
          localStorage.removeItem("dcs_kyc_docs_" + (DCS.user.id || ""));
        } catch (e) {}
        if (window.DCS && DCS.auth) await DCS.auth.persistCurrentUser();
        renderProfile();
        alert("Statut KYC réinitialisé.");
      });
    }

    const forgot = document.getElementById("forgot-password-form");
    if (forgot) {
      forgot.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("forgot-email").value.trim();
        if (!email) return;
        const res = await DCS.backend.sendPasswordReset(email);
        if (!res.ok) {
          alert(res.error || "Envoi impossible.");
          return;
        }
        alert("Si un compte existe pour " + email + ", un lien de réinitialisation a été envoyé.");
        forgot.reset();
      });
    }

    const pwdForm = document.getElementById("change-password-form");
    if (pwdForm) {
      pwdForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const cur = document.getElementById("pwd-current").value;
        const n = document.getElementById("pwd-new").value;
        const c = document.getElementById("pwd-confirm").value;
        if (n.length < 8) {
          alert("Le mot de passe doit contenir au moins 8 caractères.");
          return;
        }
        if (n !== c) {
          alert("Les mots de passe ne correspondent pas.");
          return;
        }
        if (window.DCS && DCS.auth) {
          const res = await DCS.auth.updatePassword(cur, n);
          if (!res.ok) {
            alert(res.error || "Impossible de changer le mot de passe.");
            return;
          }
        }
        alert("Mot de passe mis à jour.");
        pwdForm.reset();
      });
    }

    const userForm = document.getElementById("profile-user-form");
    if (userForm) {
      userForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const firstName = document.getElementById("edit-firstname").value.trim();
        const lastName = document.getElementById("edit-lastname").value.trim();
        const name = document.getElementById("edit-displayname").value.trim();
        DCS.user.firstName = firstName;
        DCS.user.lastName = lastName;
        DCS.user.birthDate = readBirthdateFromSelects();
        DCS.user.gender = document.getElementById("edit-gender").value;
        DCS.user.country = document.getElementById("edit-country").value;
        DCS.user.city = document.getElementById("edit-city").value.trim();
        DCS.user.address = document.getElementById("edit-address").value.trim();
        DCS.user.bio = document.getElementById("edit-bio").value.trim();
        if (name) DCS.user.displayName = name;
        else if (firstName || lastName) DCS.user.displayName = [firstName, lastName].filter(Boolean).join(" ");
        if (typeof DCS.buildShareLinks === "function") DCS.buildShareLinks();
        if (window.DCS && DCS.auth) await DCS.auth.persistCurrentUser();
        renderProfile();
        updateAuthNav();
        alert("Identité enregistrée avec succès.");
      });
    }

    const supportForm = document.getElementById("support-ticket-form");
    if (supportForm) {
      async function refreshTickets() {
        const rows = await DCS.backend.listTickets();
        const list = document.getElementById("support-tickets");
        if (!list) return;
        if (!rows.length) {
          list.innerHTML = "";
          return;
        }
        list.innerHTML =
          `<p style="font-size:0.78rem;color:var(--muted);margin-bottom:0.5rem">Tickets récents</p>` +
          rows
            .slice(0, 8)
            .map((t) => {
              const date = t.created_at
                ? new Date(t.created_at).toLocaleString("fr-FR")
                : "";
              const short = String(t.id || "").slice(0, 8);
              return `<div class="feed-post" style="margin-bottom:0.55rem"><div class="meta">${date} · ${t.status || "open"} · ${short}</div><p><strong style="color:var(--gold-bright)">${t.subject}</strong> — ${t.message}</p></div>`;
            })
            .join("");
      }
      refreshTickets();
      supportForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const topic = document.getElementById("support-topic").value;
        const message = document.getElementById("support-message").value.trim();
        if (!topic || !message) {
          alert("Indiquez un sujet et un message.");
          return;
        }
        const labels = {
          wallet: "Wallet / dépôt / retrait",
          swap: "Swap / conversion",
          transfer: "Transfer UEMOA / CEMAC",
          kyc: "KYC / identité",
          security: "Sécurité / 2FA / mot de passe",
          marketplace: "Marketplace",
          other: "Autre"
        };
        const res = await DCS.backend.createTicket(labels[topic] || topic, message);
        if (!res.ok) {
          alert(res.error || "Envoi impossible.");
          return;
        }
        supportForm.reset();
        await refreshTickets();
        alert("Ticket envoyé au support DCS.");
      });
    }

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        const ok = confirm("Voulez-vous vraiment vous déconnecter ?");
        if (!ok) return;
        if (window.DCS && DCS.auth) await DCS.auth.logout();
        else if (DCS.user) DCS.user.loggedIn = false;
        const session = document.getElementById("session-label");
        if (session) session.textContent = "Déconnecté";
        logoutBtn.disabled = true;
        logoutBtn.textContent = "Déconnecté";
        window.location.href = "signin.html";
      });
    }
  }

  function isLoggedIn() {
    return !!(window.DCS && DCS.user && DCS.user.loggedIn && DCS.user.username);
  }

  /* Pages accessibles sans compte */
  const PUBLIC_PAGES = ["signup.html", "signin.html", "join.html", "contact.html", "privacy.html", "terms.html"];

  function normalizePage(name) {
    let p = String(name || "")
      .split("?")[0]
      .split("#")[0]
      .replace(/^\.\//, "")
      .toLowerCase();
    if (!p || p === "/" || p === ".") return "index.html";
    if (p.indexOf("/") >= 0) p = p.split("/").pop() || "index.html";
    if (!/\.html$/i.test(p)) p += ".html";
    return p;
  }

  function isPublicPage(page) {
    const p = normalizePage(page);
    if (PUBLIC_PAGES.includes(p)) return true;
    /* Filet de sécurité Netlify (/signin sans .html, etc.) */
    if (document.getElementById("signin-form") || document.getElementById("signup-form")) return true;
    if (document.getElementById("signup-otp-form")) return true;
    return false;
  }

  function updateAuthNav() {
    const actions = document.querySelector(".header-actions");
    if (!actions) return;
    const toggle = actions.querySelector(".menu-toggle");
    const logged = isLoggedIn();
    const frag = document.createDocumentFragment();
    if (logged) {
      const name = document.createElement("a");
      name.className = "btn btn-outline";
      name.href = "profil.html";
      name.textContent = DCS.user.displayName || DCS.user.email || "Profil";
      name.title = DCS.user.email || "";
      const gold = document.createElement("a");
      gold.className = "btn btn-gold";
      gold.href = "wallet.html";
      gold.textContent = "Wallet";
      frag.appendChild(name);
      frag.appendChild(gold);
    } else if (isEcosystemMode()) {
      /* Bouton manuel Pi Auth (App Studio) — id unique si la page n’en a pas déjà un */
      const signin = document.createElement("button");
      signin.type = "button";
      signin.className = "btn btn-gold";
      signin.id = document.getElementById("pi-login-btn")
        ? "pi-login-btn-header"
        : "pi-login-btn";
      signin.textContent = "Connexion Pi";
      frag.appendChild(signin);
    } else {
      const signin = document.createElement("a");
      signin.className = "btn btn-outline";
      signin.href = "signin.html";
      signin.textContent = "Connexion";
      frag.appendChild(signin);
      const signup = document.createElement("a");
      signup.className = "btn btn-gold";
      signup.href = "signup.html";
      signup.textContent = "Inscription";
      frag.appendChild(signup);
    }
    Array.from(actions.children).forEach((el) => {
      if (!el.classList.contains("menu-toggle")) el.remove();
    });
    if (toggle) actions.insertBefore(frag, toggle);
    else actions.appendChild(frag);

    /* CTAs hero / modules : orienter les invités vers la connexion Pi */
    if (!logged) {
      const authPage = isEcosystemMode() ? "signin.html" : "signup.html";
      document.querySelectorAll(".hero-ctas a.btn-gold, a.module-link").forEach((a) => {
        const href = a.getAttribute("href") || "";
        if (/wallet|swap|transfer|marketplace|parrainage|profil|academy|learning|community/i.test(href)) {
          a.setAttribute("href", authPage + "?next=" + encodeURIComponent(normalizePage(href.split("#")[0] || "index.html")));
        }
      });
      document.querySelectorAll("#main-nav a").forEach((a) => {
        const raw = (a.getAttribute("href") || "").split("#")[0];
        if (!raw) return;
        const href = normalizePage(raw);
        if (isPublicPage(href) || href === "index.html") return;
        if (/\.html$/i.test(href)) {
          a.setAttribute("href", authPage + "?next=" + encodeURIComponent(href));
        }
      });
    }
  }

  function requireAuth(page) {
    const p = normalizePage(page || "index.html");
    if (isPublicPage(p)) return true;
    if (isLoggedIn()) return true;
    const next = encodeURIComponent(p);
    window.location.replace("signin.html?next=" + next);
    return false;
  }

  function authNextUrl() {
    const params = new URLSearchParams(location.search);
    const next = params.get("next") || "";
    if (next) {
      const n = normalizePage(next);
      if (/^[a-z0-9._-]+\.html$/i.test(n) && !isPublicPage(n)) return n;
    }
    return "index.html";
  }

  function showPiLoginError(errEl, msg) {
    const text =
      msg || "Connexion Pi impossible. Ouvrez cette page dans le Pi Browser.";
    if (errEl) {
      errEl.hidden = false;
      errEl.style.display = "block";
      errEl.style.color = "#f6465d";
      errEl.textContent = text;
    }
    try {
      alert(text);
    } catch (e) {}
  }

  async function runPiLoginFlow(errEl, btn) {
    if (errEl) {
      errEl.hidden = true;
      errEl.textContent = "";
      errEl.style.color = "";
    }
    if (!window.DCS || !DCS.auth || typeof DCS.auth.loginWithPi !== "function") {
      showPiLoginError(errEl, "Module de connexion non prêt. Rechargez la page.");
      return { ok: false };
    }
    const target =
      btn ||
      document.getElementById("pi-login-btn") ||
      document.getElementById("pi-login-btn-header");
    const prev = target ? target.textContent : "";
    if (target) {
      target.disabled = true;
      target.textContent = "Connexion Pi…";
    }
    try {
      /* Await Pi.init fully before authenticate (App Studio) */
      if (DCS.pi && typeof DCS.pi.init === "function") {
        await DCS.pi.init();
      }
      const result = await Promise.race([
        DCS.auth.loginWithPi(),
        new Promise(function (resolve) {
          setTimeout(function () {
            resolve({
              ok: false,
              error:
                "Délai dépassé. Ouvrez DCS dans le Pi Browser, autorisez l’app, puis réessayez."
            });
          }, 90000);
        })
      ]);
      if (!result || !result.ok) {
        showPiLoginError(
          errEl,
          (result && result.error) ||
            "Connexion Pi impossible. Ouvrez cette page dans le Pi Browser."
        );
        return result || { ok: false };
      }
      window.location.href = authNextUrl();
      return { ok: true };
    } catch (e) {
      showPiLoginError(errEl, (e && e.message) || String(e));
      return { ok: false, error: (e && e.message) || String(e) };
    } finally {
      if (target) {
        target.disabled = false;
        target.textContent = prev || "Continuer avec Pi";
      }
    }
  }

  function setupPiLoginButton(errEl) {
    const buttons = [
      document.getElementById("pi-login-btn"),
      document.getElementById("pi-login-btn-header")
    ].filter(Boolean);
    buttons.forEach(function (btn) {
      if (btn.dataset.piLoginBound === "1") return;
      btn.dataset.piLoginBound = "1";
      btn.addEventListener("click", function (ev) {
        if (ev && ev.preventDefault) ev.preventDefault();
        runPiLoginFlow(errEl, btn);
      });
    });
  }

  /** Auth Pi auto au chargement — App Studio Verify doit voir Pi.authenticate. */
  function maybeAutoPiLogin(errEl) {
    if (!isEcosystemMode()) return;
    if (window.__dcsPiAutoAuthStarted) return;
    window.__dcsPiAutoAuthStarted = true;

    /* Toujours tenter : App Studio fournit window.Pi même hors UA PiBrowser */
    setTimeout(async function () {
      try {
        if (DCS.pi && typeof DCS.pi.startEarlyPiAuth === "function") {
          DCS.pi.startEarlyPiAuth();
        }
        if (!DCS.pi || typeof DCS.pi.init !== "function") return;
        await DCS.pi.init();
        if (isLoggedIn()) {
          await DCS.pi.authenticate(["username", "payments"]);
          return;
        }
        await runPiLoginFlow(
          errEl,
          document.getElementById("pi-login-btn") ||
            document.getElementById("pi-login-btn-header")
        );
      } catch (e) {
        /* Annulation utilisateur — silencieux */
      }
    }, 0);
  }

  function setupSignup() {
    if (isEcosystemMode()) {
      const form = document.getElementById("signup-form");
      if (form) form.hidden = true;
      const otpForm = document.getElementById("signup-otp-form");
      if (otpForm) otpForm.hidden = true;
      if (isLoggedIn()) {
        window.location.replace(authNextUrl());
        return;
      }
      const err = document.getElementById("signup-error") || document.getElementById("signin-error");
      setupPiLoginButton(err);
      maybeAutoPiLogin(err);
      return;
    }
    const form = document.getElementById("signup-form");
    const otpForm = document.getElementById("signup-otp-form");
    if (!form || !window.DCS || !DCS.auth) return;
    if (isLoggedIn()) {
      window.location.replace(authNextUrl());
      return;
    }
    const hint = document.getElementById("signup-ref-hint");
    const err = document.getElementById("signup-error");
    const otpErr = document.getElementById("otp-error");
    const otpHint = document.getElementById("otp-sent-hint");
    const setupBanner = document.getElementById("auth-setup-banner");
    const dot1 = document.getElementById("step-dot-1");
    const dot2 = document.getElementById("step-dot-2");

    if (!DCS.auth.isConfigured()) {
      if (setupBanner) {
        setupBanner.hidden = false;
        setupBanner.textContent = DCS.backend.setupMessage();
      }
      form.querySelectorAll("input, button").forEach((el) => {
        el.disabled = true;
      });
    } else if (setupBanner) {
      setupBanner.hidden = true;
    }

    try {
      const ref = localStorage.getItem("dcs_ref");
      const refUser = localStorage.getItem("dcs_ref_user");
      if (hint && ref && ref !== "—") {
        hint.hidden = false;
        hint.textContent =
          "Parrainage actif : code " +
          ref +
          (refUser ? " (@" + refUser + ")" : "") +
          ".";
      }
    } catch (e) {}

    function showError(el, msg) {
      if (!el) return;
      el.hidden = !msg;
      el.textContent = msg || "";
    }

    function setStep(step) {
      if (form) form.hidden = step !== 1;
      if (otpForm) otpForm.hidden = step !== 2;
      if (dot1) dot1.classList.toggle("active", step === 1);
      if (dot2) dot2.classList.toggle("active", step === 2);
    }

    function collectPayload() {
      return {
        firstName: form.querySelector("#su-firstname").value.trim(),
        lastName: form.querySelector("#su-lastname").value.trim(),
        email: form.querySelector("#su-email").value.trim(),
        phone: form.querySelector("#su-phone").value.trim(),
        country: form.querySelector("#su-country").value.trim(),
        password: form.querySelector("#su-password").value
      };
    }

    function showConfirmEmailUi(email) {
      if (otpHint) {
        otpHint.textContent =
          "Un e-mail de confirmation a été envoyé à " +
          email +
          ". Ouvrez-le et cliquez sur le lien, puis connectez-vous.";
      }
      showError(err, "");
      showError(otpErr, "");
      setStep(2);
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      showError(err, "");
      if (!DCS.auth.isConfigured()) {
        showError(err, DCS.backend.setupMessage());
        return;
      }
      const password = form.querySelector("#su-password").value;
      const password2 = form.querySelector("#su-password2").value;
      if (password !== password2) {
        showError(err, "Les mots de passe ne correspondent pas.");
        return;
      }
      if (password.length < 6) {
        showError(err, "Mot de passe : 6 caractères minimum.");
        return;
      }
      const payload = collectPayload();
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Création du compte…";
      }
      const result = await DCS.auth.register(payload);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Créer mon compte";
      }
      if (!result.ok) {
        showError(err, result.error || "Inscription impossible.");
        return;
      }
      DCS.auth.savePendingSignup(payload);
      if (result.needsOtp) {
        showConfirmEmailUi(payload.email);
        return;
      }
      alert("Compte créé. Bienvenue sur DCS !");
      window.location.href = authNextUrl();
    });

    const resend = document.getElementById("otp-resend");
    if (resend) {
      resend.addEventListener("click", async () => {
        const pending = DCS.auth.getPendingSignup();
        const email = (pending && pending.email) || collectPayload().email;
        if (!email) {
          showError(otpErr, "E-mail manquant.");
          return;
        }
        resend.disabled = true;
        const r = await DCS.auth.resendSignupOtp(email);
        resend.disabled = false;
        if (!r.ok) {
          showError(otpErr, r.error || "Renvoi impossible.");
          return;
        }
        showError(otpErr, "");
        if (otpHint) {
          otpHint.textContent = "Nouvel e-mail de confirmation envoyé à " + email + ".";
        }
      });
    }

    const back = document.getElementById("otp-back");
    if (back) {
      back.addEventListener("click", () => {
        setStep(1);
        showError(otpErr, "");
      });
    }

    const pending = DCS.auth.getPendingSignup();
    if (pending && pending.email) {
      showConfirmEmailUi(pending.email);
    } else {
      setStep(1);
    }
  }

  function setupSignin() {
    const form = document.getElementById("signin-form");
    const err = document.getElementById("signin-error");
    if (isLoggedIn()) {
      window.location.replace(authNextUrl());
      return;
    }

    if (isEcosystemMode()) {
      if (form) form.hidden = true;
      const switchEl = document.querySelector(".auth-switch");
      if (switchEl) switchEl.hidden = true;
      setupPiLoginButton(err);
      maybeAutoPiLogin(err);
      const setupBanner = document.getElementById("auth-setup-banner");
      if (setupBanner && window.DCS && DCS.auth && !DCS.auth.isConfigured()) {
        setupBanner.hidden = false;
        setupBanner.textContent = DCS.backend.setupMessage();
      }
      return;
    }

    if (!form || !window.DCS || !DCS.auth) return;
    const setupBanner = document.getElementById("auth-setup-banner");
    const params = new URLSearchParams(location.search);
    if (params.get("confirmed") === "1" && err) {
      err.hidden = false;
      err.style.color = "var(--gold-bright)";
      err.textContent =
        "E-mail confirmé. Connectez-vous avec votre mot de passe.";
    }
    if (!DCS.auth.isConfigured()) {
      if (setupBanner) {
        setupBanner.hidden = false;
        setupBanner.textContent = DCS.backend.setupMessage();
      }
      form.querySelectorAll("input, button").forEach((el) => {
        el.disabled = true;
      });
    } else if (setupBanner) {
      setupBanner.hidden = true;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (err) {
        err.hidden = true;
        err.textContent = "";
      }
      if (!DCS.auth.isConfigured()) {
        if (err) {
          err.hidden = false;
          err.textContent = DCS.backend.setupMessage();
        }
        return;
      }
      const login = form.querySelector("#si-login").value.trim();
      const password = form.querySelector("#si-password").value;
      const btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Connexion…";
      }
      const result = await DCS.auth.login(login, password);
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Connexion";
      }
      if (!result.ok) {
        if (err) {
          err.hidden = false;
          err.textContent = result.error || "Connexion impossible.";
        }
        return;
      }
      window.location.href = authNextUrl();
    });
  }
  const LANG_LABELS = {
    fr: "Français",
    en: "English",
    pt: "Português",
    ar: "العربية"
  };

  function getSavedLanguage() {
    try {
      return localStorage.getItem("dcs_lang") || (window.DCS && DCS.user && DCS.user.language) || "fr";
    } catch (e) {
      return (window.DCS && DCS.user && DCS.user.language) || "fr";
    }
  }

  function applyLanguage(lang) {
    if (!LANG_LABELS[lang]) lang = "fr";
    if (window.DCS && DCS.user) DCS.user.language = lang;
    try {
      localStorage.setItem("dcs_lang", lang);
    } catch (e) {}
    if (window.DCS && DCS.i18n && typeof DCS.i18n.apply === "function") {
      DCS.i18n.apply(lang);
    } else {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    }
    /* i18n peut toucher les liens nav : réinjecter les icônes (ex. Marchés) */
    decorateMainNavIllustrations();
    const select = document.getElementById("app-language");
    if (select) select.value = lang;
    const current = document.getElementById("lang-current-value");
    if (current) current.textContent = LANG_LABELS[lang];
    /* Marques figées — jamais traduites ; drapeau Bénin devant LEADER DAMIENNE */
    const leader = (window.DCS && DCS.LEADER_TITLE) || "LEADER DAMIENNE";
    const appName = (window.DCS && DCS.APP_NAME) || "DAMIE CRYPTO SERVICE";
    const leaderHtml =
      '<span class="flag-bj" title="Bénin" aria-label="Drapeau du Bénin"></span><span class="leader-title-text">' +
      leader +
      "</span>";
    document.querySelectorAll("[data-leader-title]").forEach((el) => {
      el.innerHTML = leaderHtml;
      el.setAttribute("translate", "no");
      el.setAttribute("lang", "en");
    });
    document.querySelectorAll(".founder-role").forEach((el) => {
      if (!el.hasAttribute("data-leader-title")) {
        el.setAttribute("data-leader-title", "");
        el.innerHTML = leaderHtml;
      }
      el.setAttribute("translate", "no");
      el.setAttribute("lang", "en");
    });
    document.querySelectorAll("[data-brand-name]").forEach((el) => {
      el.setAttribute("translate", "no");
      el.setAttribute("lang", "en");
      /* Ne pas écraser le logo header (spans or/blanc) */
      if (!el.classList.contains("brand-name")) {
        el.textContent = appName;
      }
    });
    document.querySelectorAll(".brand-name").forEach((el) => {
      el.setAttribute("translate", "no");
      el.setAttribute("lang", "en");
      el.setAttribute("data-brand-name", "");
      if (!el.querySelector(".g")) {
        el.innerHTML =
          '<span class="g">DAMIE</span> <span class="w">CRYPTO</span> <span class="g">SERVICE</span>';
      }
    });
    /* Preserve founder-footer label start when translated */
    document.querySelectorAll(".founder-footer").forEach((el) => {
      const strong = el.querySelector("strong");
      const leaderEl = el.querySelector("[data-leader-title]");
      if (!strong || !leaderEl) return;
      const prefix =
        window.DCS && DCS.i18n ? DCS.i18n.t("footer.founderLine", lang) + " " : "Fondatrice : ";
      el.innerHTML =
        prefix +
        "<strong>" +
        strong.textContent +
        "</strong> · " +
        leaderEl.outerHTML;
    });
  }

  function setupLanguage() {
    applyLanguage(getSavedLanguage());

    const select = document.getElementById("app-language");
    const saveBtn = document.getElementById("save-language");
    if (!select) return;

    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        const lang = select.value;
        applyLanguage(lang);
        if (window.DCS && DCS.auth && typeof DCS.auth.persistCurrentUser === "function") {
          try {
            await DCS.auth.persistCurrentUser();
          } catch (e) {}
        }
        const msg =
          window.DCS && DCS.i18n
            ? DCS.i18n.savedMessage(lang)
            : lang === "fr"
              ? "Langue enregistrée : Français."
              : "Language saved.";
        alert(msg);
      });
    }

    select.addEventListener("change", () => {
      applyLanguage(select.value);
    });
  }

  function pageName() {
    let p = (location.pathname || "").replace(/\/+$/, "");
    p = p.split("/").pop() || "index.html";
    p = p.split("?")[0].toLowerCase();
    if (!p || p === "/" || p === ".") return "index.html";
    if (!/\.html$/i.test(p)) p += ".html";
    return p;
  }

  function detectPiBrowser() {
    try {
      const ua = navigator.userAgent || "";
      /* Ne pas utiliser !!window.Pi : le SDK charge aussi hors Pi Browser */
      const isPi =
        /PiBrowser|PiNetwork|pinetwork/i.test(ua) ||
        /\.pinet\.com$/i.test(location.hostname) ||
        /pinet\.com/i.test(location.hostname);
      const narrow =
        (window.visualViewport && visualViewport.width < 900) ||
        window.innerWidth < 900 ||
        /Android|iPhone|iPad|Mobile/i.test(ua);
      if (isPi) {
        document.documentElement.classList.add("pi-webview");
        if (document.body) document.body.classList.add("is-pi-browser");
      } else if (narrow) {
        document.documentElement.classList.add("pi-webview");
      }
      document.documentElement.style.width = "100%";
      document.documentElement.style.maxWidth = "100%";
      document.documentElement.style.overflowX = "hidden";
      if (document.body) {
        document.body.style.width = "100%";
        document.body.style.maxWidth = "100%";
        document.body.style.overflowX = "hidden";
        document.body.style.margin = "0";
      }
      if (!document.querySelector("style[data-dcs-overflow-fix]")) {
        const style = document.createElement("style");
        style.setAttribute("data-dcs-overflow-fix", "1");
        style.textContent =
          "input,select,textarea,.form-control,#profile-username,#session-label{min-width:0!important;max-width:100%!important;overflow-wrap:anywhere!important;word-break:break-word!important}" +
          ".btn{justify-content:center!important;text-align:center!important;direction:ltr!important}" +
          "html,body{overflow-x:hidden!important;max-width:100%!important}";
        (document.head || document.documentElement).appendChild(style);
      }
    } catch (e) {}
  }

  async function boot() {
    detectPiBrowser();
    /* Auth Pi immédiatement — avant hydrate (App Studio Verify) */
    try {
      if (window.DCS && DCS.pi && typeof DCS.pi.startEarlyPiAuth === "function") {
        DCS.pi.startEarlyPiAuth();
      }
    } catch (eEarlyBoot) {}
    /* Timeouts courts : l'UI ne doit pas attendre des réseaux lents (PiNet / CDN) */
    var BOOT_WAIT_MS = 3000;
    try {
      if (window.DCS && DCS.backend) {
        await Promise.race([
          DCS.backend.init(),
          new Promise(function (resolve) {
            setTimeout(resolve, BOOT_WAIT_MS);
          })
        ]);
      }
    } catch (eInit) {}
    try {
      if (window.DCS && DCS.auth) {
        await Promise.race([
          DCS.auth.hydrate(),
          new Promise(function (resolve) {
            setTimeout(resolve, BOOT_WAIT_MS);
          })
        ]);
      }
    } catch (eHydra) {}
    applyEcosystemCompliance();
    setupNav();
    setupLanguage();
    updateAuthNav();
    const page = pageName();

    /* Auth Pi avant requireAuth (App Studio ouvre souvent l’URL racine / pages protégées) */
    if (isEcosystemMode()) {
      const piErrEarly =
        document.getElementById("signin-error") ||
        document.getElementById("signup-error") ||
        null;
      if (!isLoggedIn()) setupPiLoginButton(piErrEarly);
      maybeAutoPiLogin(piErrEarly);
    }

    if (!requireAuth(page)) return;

    if (document.getElementById("ticker-track")) {
      renderTicker();
      startLiveMarkets();
    }

    /* Détection par DOM + nom de page (plus fiable) */
    const isSwap = page === "swap.html" || !!document.getElementById("swap-from");
    const isTransfer = page === "transfer.html" || !!document.getElementById("tr-asset");
    const isWallet = page === "wallet.html" || !!document.getElementById("wallet-assets");
    const isMarket = page === "marketplace.html" || !!document.getElementById("marketplace-list");
    const isRef = page === "parrainage.html" || !!document.getElementById("ref-link");
    const isProfil = page === "profil.html" || !!document.getElementById("profile-user-form");
    const isHome = page === "index.html" || !!document.getElementById("markets-body");
    const isSignup = page === "signup.html" || !!document.getElementById("signup-form");
    const isSignin =
      page === "signin.html" ||
      (!!document.getElementById("pi-login-btn") && !document.getElementById("signup-form"));

    if (isSignup) setupSignup();
    if (isSignin || document.getElementById("pi-login-btn")) setupSignin();

    if (isHome && document.getElementById("markets-body")) {
      renderPiSpotlight();
      renderMarkets("");
      setupMarketSearch();
    }
    if (isWallet) {
      try {
        await DCS.backend.loadWallet();
        await DCS.backend.loadHistory();
      } catch (e) {}
      setupWalletBalanceToggle();
      renderWallet();
      if (!isEcosystemMode()) setupDeposit();
      setupPiDeposit();
      if (!isEcosystemMode()) setupDepositRequest();
      /* Re-assurer le bouton Pi visible après compliance */
      const wd = document.getElementById("wallet-deposit");
      const pb = document.getElementById("pi-deposit-btn");
      if (wd) wd.style.display = "";
      if (pb) pb.style.display = "";
      renderHistory();
      try {
        await DCS.backend.loadNotifications();
      } catch (e2) {}
      renderNotifications();
    }
    if (isSwap) {
      try {
        await DCS.backend.loadWallet();
      } catch (e) {}
      renderPiSpotlight();
      setupSwap();
    }
    if (isTransfer) {
      try {
        await DCS.backend.loadWallet();
        await DCS.backend.loadHistory();
        await DCS.backend.loadNotifications();
      } catch (e) {}
      setupTransfer();
      renderHistory();
      renderNotifications();
    }
    if (isMarket) {
      await DCS.backend.loadListings();
      renderMarketplace();
      renderSellers();
      setupMarketplaceForm();
      setupMarketplaceViews();
    }
    if (isRef) {
      await DCS.backend.loadReferrals();
      renderReferral();
      setupReferralActions();
    }
    if (isProfil) {
      renderProfile();
      setupProfileForms();
    }
    if (page === "academy.html" || document.getElementById("courses-list")) {
      await DCS.backend.loadCourses();
      renderCourses();
    }
    if (page === "learning.html" || document.getElementById("articles-list")) {
      await DCS.backend.loadArticles();
      renderArticles();
    }
    if (page === "community.html" || document.getElementById("community-feed")) {
      await DCS.backend.loadCommunity();
      renderCommunity();
      setupCommunity();
    }
    if (page === "contact.html" || document.getElementById("contact-ticket-form")) {
      setupContactForm();
    }
  }

  function setupContactForm() {
    const form = document.getElementById("contact-ticket-form");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = (document.getElementById("contact-name") || {}).value || "";
      const email = (document.getElementById("contact-email") || {}).value || "";
      const message = (document.getElementById("contact-message") || {}).value || "";
      if (!message.trim()) {
        alert("Écrivez votre message.");
        return;
      }
      if (!DCS.user || !DCS.user.id) {
        alert("Connectez-vous pour envoyer un message au support, ou utilisez le formulaire Profil.");
        return;
      }
      const subject = "Contact — " + (name.trim() || DCS.user.displayName || "Visiteur");
      const body = (email ? "E-mail : " + email + "\n\n" : "") + message.trim();
      const res = await DCS.backend.createTicket(subject, body);
      if (!res.ok) {
        alert(res.error || "Envoi impossible.");
        return;
      }
      form.reset();
      alert("Message envoyé au support DCS.");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      boot();
    });
  } else {
    boot();
  }
})();
