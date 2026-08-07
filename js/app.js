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
      if (m.stable && m.symbol === "PI") return fmt.usd(m.price, 0);
      return fmt.usd(m.price, m.price >= 1000 ? 2 : undefined);
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
      return Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 4 });
    }
  };

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
    if (!priceEl || !window.DCS) return;
    const pi = DCS.markets.find((m) => m.id === "pi");
    if (!pi) return;
    priceEl.textContent = fmt.usd(pi.price, 0);
    if (changeEl) {
      changeEl.innerHTML = `<span class="up">PI COIN</span><span style="color:var(--muted)">0,00 % 24h</span>`;
    }
    if (highEl) highEl.textContent = fmt.usd(pi.price, 0);
    if (lowEl) lowEl.textContent = fmt.usd(pi.price, 0);
    if (volEl) volEl.textContent = fmt.vol(pi.volume);

    const xofEl = document.getElementById("pi-xof");
    const xafEl = document.getElementById("pi-xaf");
    const cfa = (pi.price * (DCS.CFA_PER_USD || 600)).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
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
    if (!window.DCS || !DCS.markets) return [];
    const bySymbol = {};
    (DCS.wallet || []).forEach((w) => {
      bySymbol[w.symbol] = w;
    });
    return DCS.markets.map((m) => {
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
  }

  function renderWallet() {
    const list = document.getElementById("wallet-assets");
    const piBalEl = document.getElementById("wallet-pi-balance");
    const piUsdEl = document.getElementById("wallet-pi-usd");
    const totalEl = document.getElementById("wallet-total");
    const countEl = document.getElementById("wallet-assets-count");
    if (!window.DCS) return;

    const assets = getWalletAssets();
    const piAsset = assets.find((w) => w.symbol === "PI");
    const piAmount = piAsset ? piAsset.amount : 0;
    const piPrice = DCS.PI_PRICE || 314159;
    const piUsd = piAmount * piPrice;

    if (piBalEl) {
      piBalEl.textContent =
        Number(piAmount).toLocaleString("fr-FR", { maximumFractionDigits: 4 }) + " PI";
    }
    if (piUsdEl) {
      piUsdEl.textContent = "≈ " + fmt.usd(piUsd, 2);
    }

    if (!list) {
      if (totalEl) totalEl.textContent = fmt.usd(piUsd, 2);
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
        return `<div class="asset-row">
          <div class="coin-cell">
            ${coinLogo(a)}
            <div class="coin-name">${a.symbol}<small>${a.name}</small></div>
          </div>
          <div style="text-align:right">
            <strong>${amountLabel} ${a.symbol}</strong>
            <div style="font-size:0.75rem;color:var(--muted)">${fmt.usd(value, 2)}</div>
          </div>
        </div>`;
      })
      .join("");
    if (countEl) countEl.textContent = assets.length + " jetons";
    if (totalEl) totalEl.textContent = fmt.usd(total, 2);
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
          ? "ID de dépôt <strong>DCS</strong> personnel. Ce n’est pas encore une adresse Pi Network Mainnet : les dépôts on-chain seront activés quand le wallet Pi officiel sera branché. En attendant, utilisez cet ID pour créditer votre solde DCS (ops / support)."
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

  function renderHistory() {
    const el = document.getElementById("history-body");
    if (!el || !window.DCS) return;
    el.innerHTML = DCS.history
      .map(
        (h) => `<tr>
          <td>${h.type}</td>
          <td>${h.detail}</td>
          <td>${h.amount}</td>
          <td>${h.status}</td>
          <td>${h.date}</td>
        </tr>`
      )
      .join("");
  }

  function renderCourses() {
    const el = document.getElementById("courses-list");
    if (!el || !window.DCS) return;
    el.innerHTML = DCS.courses
      .map(
        (c) => `<article class="course-item">
          <div>
            <h4>${c.title}</h4>
            <p>${c.level} · ${c.desc}</p>
          </div>
          <div class="price-pi">${c.pricePi} π</div>
        </article>`
      )
      .join("");
  }

  function renderArticles() {
    const el = document.getElementById("articles-list");
    if (!el || !window.DCS) return;
    el.innerHTML = DCS.articles
      .map(
        (a) => `<article class="course-item">
          <div>
            <h4>${a.title}</h4>
            <p>${a.tag} · ${a.date}</p>
          </div>
          <button class="trade-btn" type="button">Lire</button>
        </article>`
      )
      .join("");
  }

  function renderCommunity() {
    const el = document.getElementById("community-feed");
    if (!el || !window.DCS) return;
    el.innerHTML = DCS.community
      .map(
        (p) => `<article class="feed-post">
          <div class="meta">${p.author} · ${p.time}</div>
          <p>${p.text}</p>
        </article>`
      )
      .join("");
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

  function filteredArticles() {
    const q = (marketFilter.query || "").trim().toLowerCase();
    return (DCS.marketplace || []).filter((a) => {
      if (marketFilter.seller !== "all" && a.author !== marketFilter.seller) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.author.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        (a.excerpt || "").toLowerCase().includes(q)
      );
    });
  }

  function openLightbox(src) {
    const overlay = document.createElement("div");
    overlay.className = "photo-lightbox";
    overlay.innerHTML = `<img src="${src}" alt="Aperçu" /><button type="button" class="photo-lightbox-close" aria-label="Fermer">×</button>`;
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
    list.innerHTML = sellers
      .map(
        (s) => `<div class="seller-chip-wrap">
          <button type="button" class="seller-chip" data-seller="${s.name}">
            <span class="seller-avatar">${s.name.slice(0, 1)}</span>
            <span class="seller-meta"><strong>${s.name}</strong><small>${s.count} article${s.count > 1 ? "s" : ""}</small></span>
          </button>
          <button type="button" class="seller-report-btn" data-report-seller="${s.name}" title="Signaler ${s.name}">Signaler</button>
        </div>`
      )
      .join("");

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
          ? items.length + " article(s) — visitez puis achetez en PI COIN"
          : "Boutique de " + marketFilter.seller + " · " + items.length + " article(s)";
    }
    if (!items.length) {
      el.innerHTML = `<p style="color:var(--muted);padding:1rem 0">Aucun article trouvé.</p>`;
      return;
    }
    el.innerHTML = items
      .map((a) => {
        const photos = a.photos || [];
        const cover = photos[0]
          ? `<img class="market-cover" src="${photos[0]}" alt="" />`
          : `<div class="market-cover placeholder">π</div>`;
        const thumbs =
          photos.length > 1
            ? `<div class="article-photos compact">${photos
                .slice(0, 4)
                .map(
                  (src, i) =>
                    `<button type="button" class="article-photo" data-full="${src}" title="Photo ${i + 1}">
                      <img src="${src}" alt="" loading="lazy" />
                    </button>`
                )
                .join("")}</div>`
            : "";
        return `<article class="market-article">
          <div class="market-article-top">
            ${cover}
            <div class="market-article-body">
              <div>
                <div class="ref-badge">${a.category}</div>
                <h4>${a.title}</h4>
                <p>par <strong>${a.author}</strong> — ${a.excerpt}</p>
              </div>
              <div class="market-article-buy">
                <div class="price-pi">${a.pricePi} π</div>
                <button class="btn btn-outline" type="button" data-visit="${a.id}" style="margin-top:0.4rem;width:100%">Visiter</button>
                <button class="btn btn-gold" type="button" data-buy="${a.id}" style="margin-top:0.4rem;width:100%">Acheter</button>
                <button class="btn btn-outline btn-report" type="button" data-report="${a.id}" style="margin-top:0.4rem;width:100%">Signaler</button>
              </div>
            </div>
          </div>
          ${thumbs}
        </article>`;
      })
      .join("");

    el.querySelectorAll(".article-photo").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openLightbox(btn.getAttribute("data-full"));
      });
    });
    el.querySelectorAll("[data-visit]").forEach((btn) => {
      btn.addEventListener("click", () => openArticle(Number(btn.getAttribute("data-visit"))));
    });
    el.querySelectorAll("[data-buy]").forEach((btn) => {
      btn.addEventListener("click", () => buyArticle(Number(btn.getAttribute("data-buy"))));
    });
    el.querySelectorAll("[data-report]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-report"));
        const article = (DCS.marketplace || []).find((a) => a.id === id);
        if (article) openReportSeller(article.author, article.id);
      });
    });
  }

  function openArticle(id) {
    const article = (DCS.marketplace || []).find((a) => a.id === id);
    const modal = document.getElementById("article-modal");
    if (!article || !modal) return;
    activeArticleId = id;
    document.getElementById("modal-title").textContent = article.title;
    document.getElementById("modal-author").textContent = article.author;
    document.getElementById("modal-category").textContent = article.category;
    document.getElementById("modal-price").textContent = article.pricePi + " π";
    document.getElementById("modal-excerpt").textContent = article.excerpt || "";
    document.getElementById("modal-body").textContent =
      article.content || article.excerpt || "Contenu disponible après achat.";
    const gallery = document.getElementById("modal-gallery");
    const photos = article.photos || [];
    gallery.innerHTML = photos.length
      ? photos
          .map(
            (src) =>
              `<button type="button" class="article-photo" data-full="${src}"><img src="${src}" alt="" /></button>`
          )
          .join("")
      : `<div class="market-cover placeholder large">π</div>`;
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

  function buyArticle(id) {
    const article = (DCS.marketplace || []).find((a) => a.id === id);
    if (!article) return;
    const ok = confirm(
      "Acheter « " +
        article.title +
        " » pour " +
        article.pricePi +
        " PI COIN ?\n\nVendeur : " +
        article.author +
        "\nPaiement exclusivement en PI COIN."
    );
    if (!ok) return;
    DCS.purchases = DCS.purchases || [];
    DCS.purchases.unshift({
      id: Date.now(),
      articleId: article.id,
      title: article.title,
      author: article.author,
      pricePi: article.pricePi,
      date: new Date().toLocaleDateString("fr-FR")
    });
    if (DCS.history) {
      DCS.history.unshift({
        type: "Marketplace",
        detail: article.title,
        amount: "-" + article.pricePi + " PI",
        status: "Payé",
        date: new Date().toLocaleDateString("fr-FR")
      });
    }
    alert(
      "Achat réussi !\nVous avez payé " +
        article.pricePi +
        " PI COIN à " +
        article.author +
        ".\nL'article est maintenant disponible dans vos achats."
    );
    closeArticleModal();
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
          (p, i) => `<div class="photo-preview-item">
            <img src="${p.url}" alt="Aperçu ${i + 1}" />
            <button type="button" class="photo-remove" data-i="${i}" aria-label="Retirer">×</button>
          </div>`
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
          pendingPhotos.push({ url: URL.createObjectURL(file), name: file.name });
        });
        photoInput.value = "";
        renderPreview();
      });
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("seller-name").value.trim();
      const title = document.getElementById("article-title").value.trim();
      const price = parseFloat(document.getElementById("article-price").value) || 1;
      const excerpt = document.getElementById("article-excerpt").value.trim();
      const content = (document.getElementById("article-content") || {}).value || excerpt;
      const category = document.getElementById("article-category").value;
      if (!name || !title || !excerpt) {
        alert("Veuillez remplir tous les champs.");
        return;
      }
      DCS.marketplace.unshift({
        id: Date.now(),
        title,
        author: name,
        pricePi: price,
        category,
        excerpt,
        content: content.trim(),
        photos: pendingPhotos.map((p) => p.url)
      });
      pendingPhotos = [];
      renderPreview();
      marketFilter.seller = "all";
      renderSellers();
      renderMarketplace();
      form.reset();
      alert(
        "Article publié dans le catalogue acheteurs !\nVendeur : " +
          name +
          " · " +
          (DCS.marketplace[0].photos.length || 0) +
          " photo(s) · paiement en PI COIN."
      );
      const buyTab = document.querySelector('#market-tabs [data-view="buy"]');
      if (buyTab) openMarketView("buy");
    });
  }

  function openMarketView(view) {
    const tabs = document.getElementById("market-tabs");
    if (!tabs) return;
    const target = view === "sell" ? "sell" : "buy";
    tabs.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-view") === target);
    });
    document.querySelectorAll("[data-view-panel]").forEach((panel) => {
      panel.hidden = panel.getAttribute("data-view-panel") !== target;
    });
    const searchWrap = document.getElementById("buyer-search-wrap");
    if (searchWrap) searchWrap.style.display = target === "buy" ? "" : "none";
    if (target === "sell") {
      const form = document.getElementById("seller-form");
      if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      const catalog = document.getElementById("buyers-catalog");
      if (catalog) catalog.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    try {
      history.replaceState(null, "", target === "sell" ? "#devenir-vendeur" : "#acheter");
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
        const article = (DCS.marketplace || []).find((a) => a.id === activeArticleId);
        if (article) openReportSeller(article.author, article.id);
      });
    }
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeArticleModal();
      });
    }
    setupReportSeller();
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
    form.addEventListener("submit", (e) => {
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
      DCS.sellerReports = DCS.sellerReports || [];
      const report = {
        id: "REP-" + String(Date.now()).slice(-6),
        seller,
        articleId: articleId ? Number(articleId) : null,
        reason: reasonLabels[reason] || reason,
        details,
        status: "Reçu",
        date: new Date().toLocaleString("fr-FR")
      };
      DCS.sellerReports.unshift(report);
      closeReportModal();
      alert(
        "Signalement " +
          report.id +
          " envoyé contre « " +
          seller +
          " ».\nL'équipe DCS examinera le dossier."
      );
    });
  }

  function setupNav() {
    const path = location.pathname.split("/").pop() || "index.html";
    const hash = location.hash || "";
    document.querySelectorAll(".nav a").forEach((a) => {
      const href = a.getAttribute("href") || "";
      a.classList.remove("active");
      if (path === "index.html" || path === "" || path === "/") {
        if (hash === "#markets" && href.includes("#markets")) a.classList.add("active");
        else if (!hash && (href === "index.html" || href === "./index.html") && a.textContent.trim() === "Accueil") {
          a.classList.add("active");
        }
      } else if (href === path || href.endsWith("/" + path)) {
        a.classList.add("active");
      }
    });
    const toggle = document.getElementById("menu-toggle");
    const nav = document.getElementById("main-nav");
    if (toggle && nav) {
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
    if (!from || !to || !amount || !result) return;

    const params = new URLSearchParams(location.search);
    if (params.get("from")) from.value = params.get("from");
    if (params.get("to")) to.value = params.get("to");

    let lastFee = null;
    let lastOut = 0;
    let lastMinOut = 0;
    let lastSlip = 0.5;

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
      const fromM = DCS.markets.find((m) => m.symbol === from.value);
      const toM = DCS.markets.find((m) => m.symbol === to.value);
      const qty = parseFloat(String(amount.value).replace(",", ".")) || 0;
      if (!fromM || !toM || !(fromM.price > 0) || !(toM.price > 0)) {
        result.value = "";
        if (rateEl) rateEl.textContent = "";
        if (minOutEl) minOutEl.textContent = "";
        return;
      }
      const out = (qty * fromM.price) / toM.price;
      lastSlip = getSlippage();
      lastOut = out;
      lastMinOut = out * (1 - lastSlip / 100);
      const digits = toM.symbol === "XOF" || toM.symbol === "XAF" ? 0 : 6;
      if (qty > 0 && isFinite(out)) {
        result.value =
          out.toLocaleString("fr-FR", { maximumFractionDigits: digits }) + " " + to.value;
      } else {
        result.value = "";
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
        const rate = fromM.price / toM.price;
        const rateDigits = toM.symbol === "XOF" || toM.symbol === "XAF" ? 0 : 6;
        rateEl.textContent =
          "1 " +
          from.value +
          " ≈ " +
          rate.toLocaleString("fr-FR", { maximumFractionDigits: rateDigits }) +
          " " +
          to.value;
      }

      const usdValue = qty * fromM.price;
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
        const toM = DCS.markets.find((m) => m.symbol === to.value);
        const digits = toM && (toM.symbol === "XOF" || toM.symbol === "XAF") ? 0 : 6;
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
          "%";
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
        if (typeof renderWallet === "function") renderWallet();
        if (typeof renderHistory === "function") renderHistory();
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
            formatPiFee(lastFee.feePi)
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
    if (!asset || !country) return;

    let lastFee = null;

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

      const qty = parseFloat(amount && amount.value) || 0;
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

    if (confirmBtn) {
      confirmBtn.addEventListener("click", async () => {
        const qty = parseFloat(amount && amount.value) || 0;
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
          alert("Solde " + asset.value + " insuffisant.");
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
          detail
        );
        confirmBtn.disabled = false;
        if (!res.ok) {
          alert(res.error || "Transfert impossible.");
          return;
        }
        renderHistory();
        if (typeof renderWallet === "function") renderWallet();
        alert(
          "Transfert enregistré.\nPays : " +
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
  }

  function renderReferral() {
    if (!window.DCS || !DCS.user) return;
    if (typeof DCS.buildShareLinks === "function") DCS.buildShareLinks();
    const userEl = document.getElementById("ref-username");
    const codeEl = document.getElementById("ref-code");
    const linkEl = document.getElementById("ref-link");
    const siteEl = document.getElementById("share-site-link");
    if (userEl) userEl.textContent = "@" + DCS.user.username;
    if (codeEl) codeEl.value = DCS.user.inviteCode;
    if (linkEl) linkEl.value = DCS.user.referralLink;
    if (siteEl) siteEl.value = DCS.user.siteLink || DCS.user.referralLink;

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
        .map(
          (m) => `<div class="member">
            <div>
              <strong>@${m.username}</strong>
              <div style="font-size:0.75rem;color:var(--muted)">
                Code ${m.code}${showVia && m.via ? " · via @" + m.via : ""} · ${m.date}
              </div>
            </div>
            <div style="text-align:right">
              <span class="ref-badge">+${m.earned}</span>
            </div>
          </div>`
        )
        .join("");
    }

    fillLevel("ref-l1", DCS.referrals.level1, false);
    fillLevel("ref-l2", DCS.referrals.level2, true);
    fillLevel("ref-l3", DCS.referrals.level3, true);

    const n1 = DCS.referrals.level1.length;
    const n2 = DCS.referrals.level2.length;
    const n3 = DCS.referrals.level3.length;
    const total = n1 + n2 + n3;

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
          .map(
            (e) => `<div class="member">
              <div>
                <strong>@${e.from}</strong>
                <div style="font-size:0.75rem;color:var(--muted)">${e.type} · N${e.level} · frais ${e.feePi} PI · ${e.date}</div>
              </div>
              <div style="text-align:right">
                <span class="ref-badge">+${e.commissionPi} PI</span>
              </div>
            </div>`
          )
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
    const copySite = document.getElementById("copy-share-site");
    if (copyCode) copyCode.addEventListener("click", () => copyField("ref-code", "Code d'invitation"));
    if (copyLink) copyLink.addEventListener("click", () => copyField("ref-link", "Lien d'invitation"));
    if (copySite) copySite.addEventListener("click", () => copyField("share-site-link", "Lien du site"));
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
    set("profile-username", u.email || u.displayName || "—");
    set("profile-displayname", u.displayName);
    set("profile-joined", "Membre depuis " + u.joined);
    set("profile-invite", u.inviteCode);
    const session = document.getElementById("session-label");
    if (session) session.textContent = u.loggedIn ? "Connecté · " + (u.email || u.displayName) : "Déconnecté";
    const loc = [u.city, u.country].filter(Boolean).join(", ");
    set("profile-location", loc || "Localisation non renseignée");

    setVal("edit-firstname", u.firstName);
    setVal("edit-lastname", u.lastName);
    setVal("edit-displayname", u.displayName);
    setVal("edit-email", u.email);
    setVal("edit-birthdate", u.birthDate);
    setVal("edit-gender", u.gender);
    setVal("edit-country", u.country);
    setVal("edit-city", u.city);
    setVal("edit-address", u.address);
    setVal("edit-bio", u.bio);

    const avatarImg = document.getElementById("profile-avatar");
    const avatarFb = document.getElementById("profile-avatar-fallback");
    if (avatarImg && avatarFb) {
      if (u.avatar) {
        avatarImg.src = u.avatar;
        avatarImg.hidden = false;
        avatarFb.hidden = true;
      } else {
        avatarImg.hidden = true;
        avatarFb.hidden = false;
        const initials = ((u.firstName || "")[0] || "") + ((u.lastName || "")[0] || "");
        avatarFb.textContent = (initials || u.displayName || u.username).slice(0, 2).toUpperCase();
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
        const label = document.querySelector('label[for="avatar-input"]');
        if (label) {
          label.setAttribute("data-old", label.textContent);
          label.textContent = "Envoi…";
        }
        const res = await DCS.backend.uploadAvatar(file);
        if (label) label.textContent = label.getAttribute("data-old") || "Uploader";
        photoInput.value = "";
        if (!res.ok) {
          alert(res.error || "Impossible d'enregistrer la photo.");
          return;
        }
        renderProfile();
        alert("Photo de profil enregistrée.");
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
        DCS.user.kyc = "pending";
        DCS.user.kycDocType = docType;
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
        if (window.DCS && DCS.auth) await DCS.auth.persistCurrentUser();
        renderProfile();
        alert(
          "Dossier KYC soumis (" +
            (DOC_LABELS[docType] || docType) +
            " + selfie) — statut : en attente de vérification manuelle."
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
        DCS.user.birthDate = document.getElementById("edit-birthdate").value;
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
      if (!DCS.supportTickets) DCS.supportTickets = [];
      supportForm.addEventListener("submit", (e) => {
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
        const ticket = {
          id: "DCS-" + String(Date.now()).slice(-6),
          topic: labels[topic] || topic,
          message,
          status: "Ouvert",
          date: new Date().toLocaleString("fr-FR")
        };
        DCS.supportTickets.unshift(ticket);
        const list = document.getElementById("support-tickets");
        if (list) {
          list.innerHTML =
            `<p style="font-size:0.78rem;color:var(--muted);margin-bottom:0.5rem">Tickets récents</p>` +
            DCS.supportTickets
              .slice(0, 5)
              .map(
                (t) =>
                  `<div class="feed-post" style="margin-bottom:0.55rem"><div class="meta">${t.date} · ${t.status} · ${t.id}</div><p><strong style="color:var(--gold-bright)">${t.topic}</strong> — ${t.message}</p></div>`
              )
              .join("");
        }
        supportForm.reset();
        alert("Ticket " + ticket.id + " envoyé au support DCS.");
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
  const PUBLIC_PAGES = ["signup.html", "signin.html", "join.html", "contact.html"];

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
    } else {
      const signin = document.createElement("a");
      signin.className = "btn btn-outline";
      signin.href = "signin.html";
      signin.textContent = "Connexion";
      const signup = document.createElement("a");
      signup.className = "btn btn-gold";
      signup.href = "signup.html";
      signup.textContent = "Inscription";
      frag.appendChild(signin);
      frag.appendChild(signup);
    }
    Array.from(actions.children).forEach((el) => {
      if (!el.classList.contains("menu-toggle")) el.remove();
    });
    if (toggle) actions.insertBefore(frag, toggle);
    else actions.appendChild(frag);

    /* CTAs hero / modules : orienter les invités vers l'inscription */
    if (!logged) {
      document.querySelectorAll(".hero-ctas a.btn-gold, a.module-link").forEach((a) => {
        const href = a.getAttribute("href") || "";
        if (/wallet|swap|transfer|marketplace|parrainage|profil|academy|learning|community/i.test(href)) {
          a.setAttribute("href", "signup.html?next=" + encodeURIComponent(normalizePage(href.split("#")[0] || "index.html")));
        }
      });
      document.querySelectorAll("#main-nav a").forEach((a) => {
        const raw = (a.getAttribute("href") || "").split("#")[0];
        if (!raw) return;
        const href = normalizePage(raw);
        if (isPublicPage(href) || href === "index.html") return;
        if (/\.html$/i.test(href)) {
          a.setAttribute("href", "signup.html?next=" + encodeURIComponent(href));
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

  function setupSignup() {
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
    if (!form || !window.DCS || !DCS.auth) return;
    if (isLoggedIn()) {
      window.location.replace(authNextUrl());
      return;
    }
    const err = document.getElementById("signin-error");
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

  async function boot() {
    if (window.DCS && DCS.backend) await DCS.backend.init();
    if (window.DCS && DCS.auth) await DCS.auth.hydrate();
    setupNav();
    setupLanguage();
    updateAuthNav();
    const page = pageName();
    if (!requireAuth(page)) return;

    if (document.getElementById("ticker-track")) renderTicker();

    /* Détection par DOM + nom de page (plus fiable) */
    const isSwap = page === "swap.html" || !!document.getElementById("swap-from");
    const isTransfer = page === "transfer.html" || !!document.getElementById("tr-asset");
    const isWallet = page === "wallet.html" || !!document.getElementById("wallet-assets");
    const isMarket = page === "marketplace.html" || !!document.getElementById("marketplace-list");
    const isRef = page === "parrainage.html" || !!document.getElementById("ref-link");
    const isProfil = page === "profil.html" || !!document.getElementById("profile-user-form");
    const isHome = page === "index.html" || !!document.getElementById("markets-body");
    const isSignup = page === "signup.html" || !!document.getElementById("signup-form");
    const isSignin = page === "signin.html" || !!document.getElementById("signin-form");

    if (isSignup) setupSignup();
    if (isSignin) setupSignin();

    if (isHome && document.getElementById("markets-body")) {
      renderPiSpotlight();
      renderMarkets("");
      setupMarketSearch();
    }
    if (isWallet) {
      renderWallet();
      setupDeposit();
      renderHistory();
    }
    if (isSwap) {
      renderPiSpotlight();
      setupSwap();
    }
    if (isTransfer) {
      setupTransfer();
      renderHistory();
    }
    if (isMarket) {
      renderMarketplace();
      renderSellers();
      setupMarketplaceForm();
      setupMarketplaceViews();
    }
    if (isRef) {
      renderReferral();
      setupReferralActions();
    }
    if (isProfil) {
      renderProfile();
      setupProfileForms();
    }
    if (page === "academy.html" || document.getElementById("courses-list")) {
      renderCourses();
    }
    if (page === "learning.html" || document.getElementById("articles-list")) {
      renderArticles();
    }
    if (page === "community.html" || document.getElementById("community-feed")) {
      renderCommunity();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      boot();
    });
  } else {
    boot();
  }
})();
