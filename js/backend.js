/* Backend production — Supabase Auth + wallets + txs */
(function () {
  "use strict";

  function cfg() {
    return window.DCS_CONFIG || {};
  }

  function isConfigured() {
    var c = cfg();
    return !!(
      c.supabaseUrl &&
      c.supabaseAnonKey &&
      String(c.supabaseUrl).indexOf("http") === 0 &&
      String(c.supabaseAnonKey).length > 20
    );
  }

  function setLocalSession(userId, username) {
    try {
      localStorage.setItem(
        "dcs_session",
        JSON.stringify({ userId: userId, username: username, at: Date.now() })
      );
    } catch (e) {}
  }

  function clearLocalSession() {
    try {
      localStorage.removeItem("dcs_session");
    } catch (e) {}
  }

  /** Date de naissance calendaire YYYY-MM-DD — jamais via new Date() (décalage TZ) */
  function normalizeBirthDate(raw) {
    var s = String(raw || "").trim();
    if (!s) return "";
    var iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return iso[1] + "-" + iso[2] + "-" + iso[3];
    var fr = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
    if (fr) {
      var d = ("0" + fr[1]).slice(-2);
      var m = ("0" + fr[2]).slice(-2);
      return fr[3] + "-" + m + "-" + d;
    }
    return "";
  }

  function genInviteCode(username) {
    var base = String(username || "membre")
      .trim()
      .replace(/^@+/, "")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .slice(0, 32);
    return base || "membre";
  }

  function usernameFromEmail(email) {
    var local = String(email || "").split("@")[0] || "membre";
    var username = local
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, ".")
      .replace(/\.+/g, ".")
      .replace(/^\.|\.$/g, "");
    if (username.length < 3) username = "membre" + Math.random().toString(36).slice(2, 6);
    return username;
  }

  function mapProfile(row) {
    if (!row) return null;
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      displayName: row.display_name || row.pi_username || row.username,
      firstName: row.first_name || "",
      lastName: row.last_name || "",
      birthDate: normalizeBirthDate(row.birth_date),
      gender: row.gender || "",
      country: row.country || "",
      city: row.city || "",
      address: row.address || "",
      bio: row.bio || "",
      phone: row.phone || "",
      inviteCode: row.invite_code || "",
      avatar: row.avatar || "",
      kyc: row.kyc || "none",
      gmailLinked: !!row.gmail_linked,
      phoneLinked: !!row.phone_linked,
      googleAuth: !!row.google_auth,
      piUid: row.pi_uid || "",
      piUsername: row.pi_username || "",
      joined: row.created_at
        ? new Date(row.created_at).toLocaleDateString("fr-FR")
        : "",
      language: row.language || "fr",
      referredBy: row.referred_by || "",
      depositPiAddress: row.deposit_pi_address || "",
      loggedIn: true
    };
  }

  function applyProfile(profile) {
    if (!profile) {
      DCS.user.loggedIn = false;
      DCS.user.username = "";
      DCS.user.displayName = "Invité DCS";
      DCS.user.id = "";
      if (typeof DCS.buildShareLinks === "function") DCS.buildShareLinks();
      return false;
    }
    var keys = Object.keys(profile);
    for (var i = 0; i < keys.length; i++) {
      DCS.user[keys[i]] = profile[keys[i]];
    }
    DCS.user.loggedIn = true;
    setLocalSession(profile.id, profile.username);
    if (typeof DCS.buildShareLinks === "function") DCS.buildShareLinks();
    return true;
  }

  var META = {
    PI: { name: "PI COIN", iconClass: "pi", logo: "assets/coins/pi.png" },
    XOF: { name: "Franc CFA Ouest", iconClass: "xof", logo: "assets/coins/xof.svg" },
    XAF: { name: "Franc CFA Centre", iconClass: "xaf", logo: "assets/coins/xaf.svg" },
    USDT: { name: "Tether", iconClass: "usdt", logo: "assets/coins/usdt.svg" },
    BTC: { name: "Bitcoin", iconClass: "btc", logo: "assets/coins/btc.svg" },
    ETH: { name: "Ethereum", iconClass: "eth", logo: "assets/coins/eth.svg" },
    BNB: { name: "BNB", iconClass: "bnb", logo: "assets/coins/bnb.svg" },
    SOL: { name: "Solana", iconClass: "sol", logo: "assets/coins/sol.svg" },
    XRP: { name: "XRP", iconClass: "xrp", logo: "assets/coins/xrp.svg" },
    XLM: { name: "Stellar", iconClass: "xlm", logo: "assets/coins/xlm.svg" },
    TRX: { name: "TRON", iconClass: "trx", logo: "assets/coins/trx.svg" }
  };

  function emptyWallet(symbolsOnly) {
    var symbols = symbolsOnly && symbolsOnly.length ? symbolsOnly : Object.keys(META);
    return symbols.map(function (sym) {
      var m = META[sym] || { name: sym, iconClass: "", logo: "" };
      return {
        symbol: sym,
        name: m.name || sym,
        amount: 0,
        iconClass: m.iconClass || "",
        iconText: "",
        logo: m.logo || ""
      };
    });
  }

  DCS.backend = {
    client: null,
    ready: false,

    isConfigured: isConfigured,

    setupMessage: function () {
      return "Service temporairement indisponible. Réessayez dans quelques instants.";
    },

    init: function () {
      if (this.client) return Promise.resolve(this.client);
      if (!isConfigured()) {
        this.ready = false;
        return Promise.resolve(null);
      }
      if (!window.supabase || !window.supabase.createClient) {
        console.error("SDK Supabase absent");
        this.ready = false;
        return Promise.resolve(null);
      }
      var c = cfg();
      this.client = window.supabase.createClient(c.supabaseUrl, c.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      this.ready = true;
      return Promise.resolve(this.client);
    },

    requireClient: function () {
      if (!this.ready || !this.client) {
        return { ok: false, error: this.setupMessage() };
      }
      return { ok: true, client: this.client };
    },

    loadWallet: function () {
      var self = this;
      var gate = this.requireClient();
      if (!gate.ok || !DCS.user.id) {
        DCS.wallet = emptyWallet();
        return Promise.resolve(DCS.wallet);
      }
      return gate.client
        .from("wallets")
        .select("symbol, amount")
        .eq("user_id", DCS.user.id)
        .then(function (res) {
          if (res.error) {
            console.warn(res.error);
            DCS.wallet = emptyWallet();
            return DCS.wallet;
          }
          var map = {};
          var symbols = Object.keys(META);
          (res.data || []).forEach(function (r) {
            var sym = String(r.symbol || "").toUpperCase();
            if (!sym) return;
            map[sym] = Number(r.amount) || 0;
            if (symbols.indexOf(sym) < 0) symbols.push(sym);
          });
          /* Toujours charger TOUS les soldes DB (même hors affichage Pi-only) */
          DCS.wallet = emptyWallet(symbols).map(function (w) {
            if (map[w.symbol] != null) w.amount = map[w.symbol];
            return w;
          });
          return DCS.wallet;
        });
    },

    loadHistory: function () {
      var gate = this.requireClient();
      if (!gate.ok || !DCS.user.id) {
        DCS.history = [];
        return Promise.resolve([]);
      }
      return gate.client
        .from("transactions")
        .select("type, detail, amount, status, created_at")
        .eq("user_id", DCS.user.id)
        .order("created_at", { ascending: false })
        .limit(50)
        .then(function (res) {
          if (res.error) {
            DCS.history = [];
            return [];
          }
          DCS.history = (res.data || []).map(function (t) {
            return {
              type: t.type,
              detail: t.detail,
              amount: t.amount,
              status: t.status,
              date: t.created_at
                ? new Date(t.created_at).toLocaleDateString("fr-FR")
                : ""
            };
          });
          return DCS.history;
        });
    },

    fetchProfile: function (userId) {
      var gate = this.requireClient();
      if (!gate.ok) return Promise.resolve(null);
      return gate.client
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle()
        .then(function (res) {
          if (res.error) {
            console.warn(res.error);
            return null;
          }
          return mapProfile(res.data);
        });
    },

    hydrate: function () {
      var self = this;
      return this.init().then(function () {
        if (!self.ready) {
          clearLocalSession();
          applyProfile(null);
          return false;
        }
        return self.client.auth.getSession().then(function (sess) {
          var session = sess.data && sess.data.session;
          if (!session || !session.user) {
            clearLocalSession();
            applyProfile(null);
            return false;
          }
          return self.fetchProfile(session.user.id).then(function (profile) {
            if (!profile) {
              /* Profil pas encore créé (trigger lent) — retry court */
              return new Promise(function (resolve) {
                setTimeout(function () {
                  self.fetchProfile(session.user.id).then(function (p2) {
                    if (!p2) {
                      clearLocalSession();
                      applyProfile(null);
                      resolve(false);
                      return;
                    }
                    applyProfile(p2);
                    self
                      .syncSecurityFlags(session.user)
                      .then(function () {
                        return Promise.all([self.loadWallet(), self.loadHistory()]);
                      })
                      .catch(function () {});
                    resolve(true);
                  });
                }, 600);
              });
            }
            applyProfile(profile);
            /* Ne pas bloquer l'ouverture : soldes / MFA en arrière-plan */
            self
              .syncSecurityFlags(session.user)
              .then(function () {
                return Promise.all([self.loadWallet(), self.loadHistory()]);
              })
              .catch(function () {});
            return true;
          });
        });
      });
    },

    /* Alignement des drapeaux sécurité avec la vraie session Auth */
    syncSecurityFlags: function (authUser) {
      var self = this;
      var gate = this.requireClient();
      if (!gate.ok || !DCS.user.id) return Promise.resolve();

      var emailConfirmed = !!(authUser && (authUser.email_confirmed_at || authUser.confirmed_at));
      DCS.user.gmailLinked = emailConfirmed && !!DCS.user.email;

      return gate.client.auth.mfa.listFactors().then(function (res) {
        var totp = (res.data && res.data.totp) || [];
        DCS.user.googleAuth = totp.some(function (f) {
          return f.status === "verified";
        });
        /* Téléphone : lié seulement si vérifié côté Auth */
        var phoneOk = !!(authUser && authUser.phone && authUser.phone_confirmed_at);
        if (phoneOk) {
          DCS.user.phoneLinked = true;
          if (!DCS.user.phone) DCS.user.phone = authUser.phone;
        } else {
          DCS.user.phoneLinked = false;
        }
        return self.persistProfile().catch(function () {});
      });
    },

    startTotpEnroll: function () {
      var self = this;
      var gate = this.requireClient();
      if (!gate.ok) return Promise.resolve(gate);

      function friendlyMfaError(msg) {
        var m = String(msg || "");
        if (/already|exists|friendly name|duplicate/i.test(m)) {
          return "Une configuration 2FA est déjà en cours ou active. Réessayez : on nettoie l'ancienne.";
        }
        return m || "Impossible de démarrer le 2FA.";
      }

      /* Nettoyer les facteurs TOTP non vérifiés (QR abandonné) qui bloquent un nouvel enroll */
      return gate.client.auth.mfa.listFactors().then(function (listed) {
        var totp = (listed.data && listed.data.totp) || [];
        var verified = totp.find(function (f) {
          return f.status === "verified";
        });
        if (verified) {
          DCS.user.googleAuth = true;
          return {
            ok: false,
            error: "La 2FA est déjà active sur ce compte. Cliquez sur « Désactiver 2FA » pour la retirer."
          };
        }
        var stale = totp.filter(function (f) {
          return f.status !== "verified";
        });
        var clean = Promise.resolve();
        stale.forEach(function (f) {
          clean = clean.then(function () {
            return gate.client.auth.mfa.unenroll({ factorId: f.id }).catch(function () {});
          });
        });
        return clean.then(function () {
          return gate.client.auth.mfa
            .enroll({ factorType: "totp", friendlyName: "DAMIE CRYPTO SERVICE" })
            .then(function (res) {
              if (res.error) {
                /* 2e tentative après un conflit de nom */
                if (/already|exists|friendly name|duplicate/i.test(res.error.message || "")) {
                  return gate.client.auth.mfa.listFactors().then(function (again) {
                    var all = (again.data && again.data.totp) || [];
                    var wipe = Promise.resolve();
                    all.forEach(function (f) {
                      if (f.status === "verified") return;
                      wipe = wipe.then(function () {
                        return gate.client.auth.mfa.unenroll({ factorId: f.id }).catch(function () {});
                      });
                    });
                    return wipe.then(function () {
                      return gate.client.auth.mfa
                        .enroll({
                          factorType: "totp",
                          friendlyName: "DCS " + Date.now().toString(36)
                        })
                        .then(function (res2) {
                          if (res2.error) {
                            return { ok: false, error: friendlyMfaError(res2.error.message) };
                          }
                          var d2 = res2.data || {};
                          return {
                            ok: true,
                            factorId: d2.id,
                            qr: (d2.totp && d2.totp.qr_code) || "",
                            secret: (d2.totp && d2.totp.secret) || ""
                          };
                        });
                    });
                  });
                }
                return { ok: false, error: friendlyMfaError(res.error.message) };
              }
              var d = res.data || {};
              return {
                ok: true,
                factorId: d.id,
                qr: (d.totp && d.totp.qr_code) || "",
                secret: (d.totp && d.totp.secret) || ""
              };
            });
        });
      });
    },

    verifyTotpEnroll: function (factorId, code) {
      var self = this;
      var gate = this.requireClient();
      if (!gate.ok) return Promise.resolve(gate);
      code = String(code || "").replace(/\s/g, "");
      return gate.client.auth.mfa
        .challenge({ factorId: factorId })
        .then(function (ch) {
          if (ch.error) {
            return { ok: false, error: ch.error.message || "Challenge 2FA impossible." };
          }
          return gate.client.auth.mfa
            .verify({
              factorId: factorId,
              challengeId: ch.data.id,
              code: code
            })
            .then(function (v) {
              if (v.error) {
                return { ok: false, error: v.error.message || "Code 2FA incorrect." };
              }
              DCS.user.googleAuth = true;
              return self.persistProfile().then(function () {
                return { ok: true };
              });
            });
        });
    },

    disableTotp: function (factorId) {
      var self = this;
      var gate = this.requireClient();
      if (!gate.ok) return Promise.resolve(gate);
      function unenroll(id) {
        return gate.client.auth.mfa.unenroll({ factorId: id });
      }
      var p = factorId
        ? Promise.resolve([factorId])
        : gate.client.auth.mfa.listFactors().then(function (res) {
            var totp = (res.data && res.data.totp) || [];
            /* Supprimer vérifiés ET non vérifiés (QR abandonnés) */
            return totp
              .map(function (x) {
                return x && x.id;
              })
              .filter(Boolean);
          });
      return p.then(function (ids) {
        if (!ids || !ids.length) return { ok: false, error: "Aucun 2FA actif." };
        var chain = Promise.resolve();
        ids.forEach(function (id) {
          chain = chain.then(function () {
            return unenroll(id).catch(function () {});
          });
        });
        return chain.then(function () {
          DCS.user.googleAuth = false;
          return self.persistProfile().then(function () {
            return { ok: true };
          });
        });
      });
    },

    sendPasswordReset: function (email) {
      var gate = this.requireClient();
      if (!gate.ok) return Promise.resolve(gate);
      email = String(email || "")
        .trim()
        .toLowerCase();
      if (!email) return Promise.resolve({ ok: false, error: "E-mail requis." });
      return gate.client.auth
        .resetPasswordForEmail(email, {
          redirectTo: location.origin + "/profil.html"
        })
        .then(function (res) {
          if (res.error) return { ok: false, error: res.error.message };
          return { ok: true };
        });
    },

    savePhoneUnverified: function (phone) {
      var self = this;
      phone = String(phone || "").trim();
      if (phone.length < 8) {
        return Promise.resolve({ ok: false, error: "Numéro invalide." });
      }
      DCS.user.phone = phone;
      DCS.user.phoneLinked = false;
      return self.persistProfile().then(function (p) {
        if (!p.ok) return p;
        return {
          ok: true,
          verified: false,
          message:
            "Numéro enregistré, mais non vérifié. La vérification SMS (OTP) nécessite un fournisseur SMS dans Supabase."
        };
      });
    },

    register: function (payload) {
      var self = this;
      var gate = this.requireClient();
      if (!gate.ok) return Promise.resolve(gate);

      var email = String(payload.email || "")
        .trim()
        .toLowerCase();
      var password = String(payload.password || "");
      if (!email || email.indexOf("@") < 1) {
        return Promise.resolve({ ok: false, error: "E-mail invalide." });
      }
      if (password.length < 6) {
        return Promise.resolve({
          ok: false,
          error: "Mot de passe : 6 caractères minimum."
        });
      }

      var referredBy = "";
      try {
        referredBy = localStorage.getItem("dcs_ref") || "";
      } catch (e) {}
      if (referredBy === "—") referredBy = "";

      var username = usernameFromEmail(email);
      var inviteCode = genInviteCode(username);

      return gate.client.auth
        .signUp({
          email: email,
          password: password,
          options: {
            data: {
              first_name: payload.firstName || "",
              last_name: payload.lastName || "",
              phone: payload.phone || "",
              country: payload.country || "",
              username: username,
              invite_code: inviteCode,
              referred_by: referredBy
            },
            emailRedirectTo: location.origin + "/signin.html?confirmed=1"
          }
        })
        .then(function (res) {
          if (res.error) {
            return { ok: false, error: res.error.message || "Inscription impossible." };
          }
          var session = res.data && res.data.session;
          var user = res.data && res.data.user;
          /* Confirmation e-mail requise → pas de session */
          if (!session) {
            return {
              ok: true,
              needsOtp: true,
              email: email,
              user: user
            };
          }
          return self.fetchProfile(user.id).then(function (profile) {
            if (profile) applyProfile(profile);
            return Promise.all([self.loadWallet(), self.loadHistory()]).then(function () {
              return { ok: true, needsOtp: false, user: profile };
            });
          });
        });
    },

    verifySignupOtp: function (email, token) {
      var self = this;
      var gate = this.requireClient();
      if (!gate.ok) return Promise.resolve(gate);
      email = String(email || "")
        .trim()
        .toLowerCase();
      token = String(token || "").trim();
      return gate.client.auth
        .verifyOtp({ email: email, token: token, type: "signup" })
        .then(function (res) {
          if (res.error) {
            /* Certains projets utilisent type email */
            return gate.client.auth
              .verifyOtp({ email: email, token: token, type: "email" })
              .then(function (res2) {
                if (res2.error) {
                  return {
                    ok: false,
                    error: res2.error.message || "Code OTP incorrect ou expiré."
                  };
                }
                return self._afterAuth(res2.data);
              });
          }
          return self._afterAuth(res.data);
        });
    },

    resendSignupOtp: function (email) {
      var gate = this.requireClient();
      if (!gate.ok) return Promise.resolve(gate);
      email = String(email || "")
        .trim()
        .toLowerCase();
      return gate.client.auth
        .resend({ type: "signup", email: email })
        .then(function (res) {
          if (res.error) {
            return { ok: false, error: res.error.message || "Renvoi impossible." };
          }
          return { ok: true };
        });
    },

    _afterAuth: function (data) {
      var self = this;
      var user = data && data.user;
      if (!user) return Promise.resolve({ ok: false, error: "Session invalide." });
      return self.fetchProfile(user.id).then(function (profile) {
        if (!profile) {
          return new Promise(function (resolve) {
            setTimeout(function () {
              self.fetchProfile(user.id).then(function (p2) {
                if (!p2) {
                  resolve({ ok: false, error: "Profil en cours de création. Réessayez." });
                  return;
                }
                applyProfile(p2);
                Promise.all([self.loadWallet(), self.loadHistory()]).then(function () {
                  resolve({ ok: true, user: p2 });
                });
              });
            }, 700);
          });
        }
        applyProfile(profile);
        return Promise.all([self.loadWallet(), self.loadHistory()]).then(function () {
          return { ok: true, user: profile };
        });
      });
    },

    login: function (email, password) {
      var self = this;
      var gate = this.requireClient();
      if (!gate.ok) return Promise.resolve(gate);
      email = String(email || "")
        .trim()
        .toLowerCase();
      return gate.client.auth
        .signInWithPassword({ email: email, password: password })
        .then(function (res) {
          if (res.error) {
            return {
              ok: false,
              error: res.error.message || "Identifiants incorrects."
            };
          }
          return self._afterAuth(res.data);
        });
    },

    logout: function () {
      var gate = this.requireClient();
      clearLocalSession();
      applyProfile(null);
      DCS.wallet = emptyWallet();
      DCS.history = [];
      if (!gate.ok) return Promise.resolve();
      return gate.client.auth.signOut();
    },

    ensureDepositAddress: function () {
      var self = this;
      if (!DCS.user || !DCS.user.id) {
        return Promise.resolve({ ok: false, address: "" });
      }
      if (DCS.user.depositPiAddress) {
        return Promise.resolve({ ok: true, address: DCS.user.depositPiAddress });
      }
      var addr =
        "DCS-PI-" +
        String(DCS.user.id)
          .replace(/-/g, "")
          .toUpperCase()
          .slice(0, 16);
      DCS.user.depositPiAddress = addr;
      var gate = this.requireClient();
      if (!gate.ok) return Promise.resolve({ ok: true, address: addr });
      return gate.client
        .from("profiles")
        .update({ deposit_pi_address: addr })
        .eq("id", DCS.user.id)
        .then(function (res) {
          if (res.error) {
            console.warn(res.error);
            return { ok: true, address: addr, saved: false };
          }
          return { ok: true, address: addr, saved: true };
        });
    },

    uploadAvatar: function (file) {
      var self = this;
      var gate = this.requireClient();
      if (!gate.ok) return Promise.resolve(gate);
      if (!DCS.user.id) {
        return Promise.resolve({ ok: false, error: "Non connecté." });
      }
      if (!file) {
        return Promise.resolve({ ok: false, error: "Aucun fichier." });
      }

      function resizeToDataUrl(blobFile) {
        return new Promise(function (resolve, reject) {
          var reader = new FileReader();
          reader.onerror = function () {
            reject(new Error("Lecture impossible."));
          };
          reader.onload = function () {
            var img = new Image();
            img.onerror = function () {
              reject(new Error("Image invalide."));
            };
            img.onload = function () {
              var max = 400;
              var w = img.width;
              var h = img.height;
              if (w > max || h > max) {
                var r = Math.min(max / w, max / h);
                w = Math.round(w * r);
                h = Math.round(h * r);
              }
              var canvas = document.createElement("canvas");
              canvas.width = w;
              canvas.height = h;
              var ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0, w, h);
              resolve(canvas.toDataURL("image/jpeg", 0.82));
            };
            img.src = reader.result;
          };
          reader.readAsDataURL(blobFile);
        });
      }

      var ext = (file.name && file.name.split(".").pop()) || "jpg";
      ext = String(ext).toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      if (ext === "jpeg") ext = "jpg";
      var path = DCS.user.id + "/avatar." + (ext === "png" ? "png" : "jpg");

      return resizeToDataUrl(file)
        .then(function (dataUrl) {
          /* Convertir dataURL → Blob pour Storage */
          var parts = dataUrl.split(",");
          var mime = (parts[0].match(/:(.*?);/) || [])[1] || "image/jpeg";
          var bin = atob(parts[1]);
          var arr = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          var blob = new Blob([arr], { type: mime });

          return gate.client.storage
            .from("avatars")
            .upload(path, blob, { upsert: true, contentType: mime })
            .then(function (up) {
              if (!up.error) {
                var pub = gate.client.storage.from("avatars").getPublicUrl(path);
                var url =
                  (pub.data && pub.data.publicUrl ? pub.data.publicUrl : "") +
                  "?t=" +
                  Date.now();
                DCS.user.avatar = url;
                return self.persistProfile().then(function (p) {
                  if (!p.ok) return { ok: false, error: p.error || "Profil non enregistré." };
                  return { ok: true, url: url };
                });
              }
              /* Fallback : enregistrer l'image compressée dans le profil (sans Storage) */
              DCS.user.avatar = dataUrl;
              return self.persistProfile().then(function (p) {
                if (!p.ok) {
                  return {
                    ok: false,
                    error:
                      (up.error && up.error.message) ||
                      p.error ||
                      "Impossible d'enregistrer la photo."
                  };
                }
                return { ok: true, url: dataUrl, fallback: true };
              });
            });
        })
        .catch(function (err) {
          return { ok: false, error: (err && err.message) || "Upload impossible." };
        });
    },

    persistProfile: function () {
      var gate = this.requireClient();
      if (!gate.ok || !DCS.user.id) return Promise.resolve({ ok: false });
      var u = DCS.user;
      var patch = {
        display_name: u.displayName || "",
        first_name: u.firstName || "",
        last_name: u.lastName || "",
        birth_date: normalizeBirthDate(u.birthDate),
        gender: u.gender || "",
        country: u.country || "",
        city: u.city || "",
        address: u.address || "",
        bio: u.bio || "",
        phone: u.phone || "",
        avatar: u.avatar || "",
        language: u.language || "fr"
      };
      /* KYC verified uniquement côté ops ; le client peut seulement demander pending */
      if (u.kyc === "pending") patch.kyc = "pending";
      return gate.client
        .from("profiles")
        .update(patch)
        .eq("id", u.id)
        .then(function (res) {
          if (res.error) return { ok: false, error: res.error.message };
          return { ok: true };
        });
    },

    updatePassword: function (currentPw, newPw) {
      var self = this;
      var gate = this.requireClient();
      if (!gate.ok) return Promise.resolve(gate);
      if (!DCS.user.email) {
        return Promise.resolve({ ok: false, error: "Non connecté." });
      }
      if (String(newPw || "").length < 8) {
        return Promise.resolve({
          ok: false,
          error: "Nouveau mot de passe trop court (min. 8)."
        });
      }
      return gate.client.auth
        .signInWithPassword({ email: DCS.user.email, password: currentPw })
        .then(function (check) {
          if (check.error) {
            return { ok: false, error: "Mot de passe actuel incorrect." };
          }
          return gate.client.auth.updateUser({ password: newPw }).then(function (res) {
            if (res.error) {
              return { ok: false, error: res.error.message };
            }
            return { ok: true };
          });
        });
    },

    swap: function (from, to, fromAmt, toAmt, feePi, detail) {
      var self = this;
      var gate = this.requireClient();
      if (!gate.ok) return Promise.resolve(gate);
      return gate.client
        .rpc("dcs_swap", {
          p_from: from,
          p_to: to,
          p_from_amt: fromAmt,
          p_to_amt: toAmt,
          p_fee_pi: feePi || 0,
          p_detail: detail || ""
        })
        .then(function (res) {
          if (res.error) {
            return { ok: false, error: res.error.message || "Swap échoué." };
          }
          return Promise.all([self.loadWallet(), self.loadHistory(), self.loadNotifications()]).then(function () {
            return { ok: true };
          });
        });
    },

    transfer: function (symbol, amount, feePi, detail, extra) {
      var self = this;
      if (extra && extra.destination) {
        return this.createPayout({
          symbol: symbol,
          amount: amount,
          feePi: feePi || 0,
          country: extra.country || "",
          method: extra.method || "",
          destination: extra.destination,
          detail: detail || ""
        });
      }
      var gate = this.requireClient();
      if (!gate.ok) return Promise.resolve(gate);
      return gate.client
        .rpc("dcs_transfer", {
          p_symbol: symbol,
          p_amount: amount,
          p_fee_pi: feePi || 0,
          p_detail: detail || ""
        })
        .then(function (res) {
          if (res.error) {
            return { ok: false, error: res.error.message || "Transfert échoué." };
          }
          return Promise.all([self.loadWallet(), self.loadHistory(), self.loadNotifications()]).then(function () {
            return { ok: true };
          });
        });
    },

    createTicket: function (subject, message) {
      var gate = this.requireClient();
      if (!gate.ok) return Promise.resolve(gate);
      if (!DCS.user.id) {
        return Promise.resolve({ ok: false, error: "Non connecté." });
      }
      return gate.client
        .from("support_tickets")
        .insert({
          user_id: DCS.user.id,
          subject: subject,
          message: message
        })
        .select("id")
        .single()
        .then(function (res) {
          if (res.error) return { ok: false, error: res.error.message };
          return { ok: true, id: res.data.id };
        });
    },

    listTickets: function () {
      var gate = this.requireClient();
      if (!gate.ok || !DCS.user.id) return Promise.resolve([]);
      return gate.client
        .from("support_tickets")
        .select("id, subject, message, status, created_at")
        .eq("user_id", DCS.user.id)
        .order("created_at", { ascending: false })
        .limit(20)
        .then(function (res) {
          if (res.error) return [];
          return res.data || [];
        });
    },

    loadNotifications: function () {
      var gate = this.requireClient();
      if (!gate.ok || !DCS.user.id) {
        DCS.notifications = [];
        return Promise.resolve([]);
      }
      return gate.client
        .from("notifications")
        .select("id, title, body, kind, read, created_at")
        .eq("user_id", DCS.user.id)
        .order("created_at", { ascending: false })
        .limit(30)
        .then(function (res) {
          if (res.error) {
            DCS.notifications = [];
            return [];
          }
          DCS.notifications = res.data || [];
          return DCS.notifications;
        });
    },

    /** Notification persistée (RPC) — anti-doublon côté SQL */
    notifyMe: function (title, body, kind) {
      var gate = this.requireClient();
      if (!gate.ok || !DCS.user.id) return Promise.resolve({ ok: false });
      return gate.client
        .rpc("dcs_notify_me", {
          p_title: title || "Notification",
          p_body: body || "",
          p_kind: kind || "info"
        })
        .then(function (res) {
          if (res.error) {
            /* Fallback insert direct si RPC pas encore déployé */
            return gate.client
              .from("notifications")
              .insert({
                user_id: DCS.user.id,
                title: title || "Notification",
                body: body || "",
                kind: kind || "info"
              })
              .then(function (ins) {
                return { ok: !ins.error };
              });
          }
          return { ok: true };
        });
    },

    createDepositRequest: function (amountPi, note) {
      var gate = this.requireClient();
      if (!gate.ok) return Promise.resolve(gate);
      if (!DCS.user.id) return Promise.resolve({ ok: false, error: "Non connecté." });
      var amt = Number(amountPi);
      if (!(amt >= 0.0000001)) {
        return Promise.resolve({
          ok: false,
          error: "Montant minimum de dépôt : 0,0000001 PI."
        });
      }
      return gate.client
        .from("deposit_requests")
        .insert({
          user_id: DCS.user.id,
          amount_pi: amt,
          note: note || "",
          status: "pending"
        })
        .select("id")
        .single()
        .then(function (res) {
          if (res.error) return { ok: false, error: res.error.message };
          return { ok: true, id: res.data.id };
        });
    },

    loadListings: function () {
      var gate = this.requireClient();
      var self = this;
      if (!gate.ok) {
        return Promise.resolve([]);
      }
      return gate.client
        .from("marketplace_listings")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(100)
        .then(function (res) {
          if (res.error) {
            console.warn(res.error);
            DCS.marketplace = [];
            return [];
          }
          DCS.marketplace = (res.data || []).map(function (row) {
            return {
              id: row.id,
              title: row.title,
              author: row.seller_name,
              sellerId: row.seller_id,
              pricePi: Number(row.price_pi),
              category: row.category || "Divers",
              excerpt: row.excerpt || "",
              content: row.content || "",
              photos: Array.isArray(row.photos) ? row.photos : []
            };
          });
          return DCS.marketplace;
        })
        .then(function (list) {
          if (!DCS.user.id) {
            DCS.purchases = [];
            return list;
          }
          return gate.client
            .from("marketplace_purchases")
            .select("id, listing_id, price_pi, created_at")
            .eq("buyer_id", DCS.user.id)
            .then(function (p) {
              DCS.purchases = (p.data || []).map(function (row) {
                var art = (DCS.marketplace || []).find(function (a) {
                  return a.id === row.listing_id;
                });
                return {
                  id: row.id,
                  articleId: row.listing_id,
                  title: art ? art.title : "Article",
                  author: art ? art.author : "",
                  pricePi: Number(row.price_pi),
                  date: row.created_at
                    ? new Date(row.created_at).toLocaleDateString("fr-FR")
                    : ""
                };
              });
              return list;
            });
        });
    },

    uploadMarketplacePhoto: function (file) {
      var gate = this.requireClient();
      if (!gate.ok) return Promise.resolve({ ok: false, error: gate.error });
      if (!DCS.user.id || !file) {
        return Promise.resolve({ ok: false, error: "Fichier manquant." });
      }
      var ext = (file.name && file.name.split(".").pop()) || "jpg";
      var path = DCS.user.id + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
      return gate.client.storage
        .from("marketplace")
        .upload(path, file, { upsert: false, contentType: file.type || "image/jpeg" })
        .then(function (up) {
          if (up.error) return { ok: false, error: up.error.message };
          var pub = gate.client.storage.from("marketplace").getPublicUrl(path);
          return { ok: true, url: pub.data && pub.data.publicUrl ? pub.data.publicUrl : path };
        });
    },

    createListing: function (payload) {
      var gate = this.requireClient();
      if (!gate.ok) return Promise.resolve(gate);
      if (!DCS.user.id) return Promise.resolve({ ok: false, error: "Non connecté." });
      return gate.client
        .from("marketplace_listings")
        .insert({
          seller_id: DCS.user.id,
          seller_name: payload.sellerName || DCS.user.displayName || DCS.user.username,
          title: payload.title,
          price_pi: payload.pricePi,
          category: payload.category || "Divers",
          excerpt: payload.excerpt || "",
          content: payload.content || "",
          photos: payload.photos || [],
          active: true
        })
        .select("*")
        .single()
        .then(function (res) {
          if (res.error) return { ok: false, error: res.error.message };
          return { ok: true, listing: res.data };
        });
    },

    buyListing: function (listingId) {
      var gate = this.requireClient();
      var self = this;
      if (!gate.ok) return Promise.resolve(gate);
      return gate.client
        .rpc("dcs_buy_listing", { p_listing_id: listingId })
        .then(function (res) {
          if (res.error) return { ok: false, error: res.error.message };
          return Promise.all([self.loadWallet(), self.loadHistory(), self.loadListings(), self.loadNotifications()]).then(
            function () {
              return { ok: true, data: res.data };
            }
          );
        });
    },

    reportListing: function (listingId, reason, details) {
      var gate = this.requireClient();
      if (!gate.ok) return Promise.resolve(gate);
      if (!DCS.user.id) return Promise.resolve({ ok: false, error: "Non connecté." });
      return gate.client
        .from("seller_reports")
        .insert({
          listing_id: listingId,
          reporter_id: DCS.user.id,
          reason: reason || "signalement",
          details: details || ""
        })
        .then(function (res) {
          if (res.error) return { ok: false, error: res.error.message };
          return { ok: true };
        });
    },

    loadCommunity: function () {
      var gate = this.requireClient();
      if (!gate.ok) return Promise.resolve(DCS.community || []);
      return gate.client
        .from("community_posts")
        .select("id, author_name, body, created_at")
        .order("created_at", { ascending: false })
        .limit(50)
        .then(function (res) {
          if (res.error || !res.data) return DCS.community || [];
          DCS.community = res.data.map(function (p) {
            var ago = p.created_at ? new Date(p.created_at) : null;
            return {
              id: p.id,
              author: p.author_name,
              time: ago ? ago.toLocaleString("fr-FR") : "",
              text: p.body
            };
          });
          return DCS.community;
        });
    },

    createPost: function (body) {
      var gate = this.requireClient();
      if (!gate.ok) return Promise.resolve(gate);
      if (!DCS.user.id) return Promise.resolve({ ok: false, error: "Non connecté." });
      var text = String(body || "").trim();
      if (!text) return Promise.resolve({ ok: false, error: "Message vide." });
      return gate.client
        .from("community_posts")
        .insert({
          author_id: DCS.user.id,
          author_name: DCS.user.displayName || DCS.user.username || "Membre",
          body: text
        })
        .select("id")
        .single()
        .then(function (res) {
          if (res.error) return { ok: false, error: res.error.message };
          return { ok: true, id: res.data.id };
        });
    },

    /* URLs signées pour vidéos des cours débloqués (bucket academy) */
    resolveCourseVideos: function (courses) {
      var gate = this.requireClient();
      var list = courses || DCS.courses || [];
      if (!gate.ok) return Promise.resolve(list);
      var jobs = list
        .filter(function (c) {
          return c && c.enrolled && c.videoPath;
        })
        .map(function (c) {
          var path = String(c.videoPath || "").replace(/^\/+/, "");
          if (/^https?:\/\//i.test(path)) {
            c.videoUrl = path;
            return Promise.resolve();
          }
          return gate.client.storage
            .from("academy")
            .createSignedUrl(path, 60 * 60 * 6)
            .then(function (res) {
              if (res.error) {
                console.warn(res.error);
                c.videoUrl = "";
                return;
              }
              c.videoUrl = (res.data && res.data.signedUrl) || "";
            })
            .catch(function () {
              c.videoUrl = "";
            });
        });
      return Promise.all(jobs).then(function () {
        return list;
      });
    },

    loadCourses: function () {
      var gate = this.requireClient();
      var self = this;
      /* Prix canoniques des 5 cours (évite les anciens prix DB type 10/25 PI) */
      var priceByTitle = {
        "introduction à la blockchain": 0.00003,
        "trading crypto pour débutants": 0.00008,
        "analyse technique avancée": 0.00016,
        "sécurité des actifs numériques": 0.00006,
        "gestion des risques": 0.0001
      };
      function resolvePrice(title, dbPrice) {
        var key = String(title || "")
          .trim()
          .toLowerCase();
        if (Object.prototype.hasOwnProperty.call(priceByTitle, key)) {
          return priceByTitle[key];
        }
        var n = Number(dbPrice);
        return isFinite(n) && n > 0 ? n : 0;
      }
      if (!gate.ok) {
        (DCS.courses || []).forEach(function (c) {
          c.pricePi = resolvePrice(c.title, c.pricePi);
        });
        return Promise.resolve(DCS.courses || []);
      }
      var fetchCourses = function () {
        return gate.client
          .from("courses")
          .select("id, title, level, price_pi, description, content, video_path, sort_order")
          .eq("active", true)
          .order("sort_order", { ascending: true })
          .then(function (res) {
            if (res.error || !res.data || !res.data.length) {
              (DCS.courses || []).forEach(function (c) {
                c.pricePi = resolvePrice(c.title, c.pricePi);
              });
              return DCS.courses || [];
            }
            DCS.courses = res.data.map(function (c) {
              return {
                id: c.id,
                title: c.title,
                level: c.level,
                pricePi: resolvePrice(c.title, c.price_pi),
                desc: c.description,
                content: c.content || "",
                videoPath: String(c.video_path || "").trim(),
                videoUrl: "",
                enrolled: false
              };
            });
            if (!DCS.user.id) return DCS.courses;
            return gate.client
              .from("course_enrollments")
              .select("course_id")
              .eq("user_id", DCS.user.id)
              .then(function (en) {
                var set = {};
                (en.data || []).forEach(function (e) {
                  set[e.course_id] = true;
                });
                DCS.courses.forEach(function (c) {
                  c.enrolled = !!set[c.id];
                });
                return self.resolveCourseVideos(DCS.courses);
              });
          });
      };
      /* Aligne les prix en base si la fonction SQL est déployée */
      return gate.client
        .rpc("dcs_sync_academy_prices")
        .then(function () {
          return fetchCourses();
        })
        .catch(function () {
          return fetchCourses();
        });
    },

    enrollCourse: function (courseId) {
      var gate = this.requireClient();
      var self = this;
      if (!gate.ok) return Promise.resolve(gate);
      return gate.client
        .rpc("dcs_enroll_course", { p_course_id: courseId })
        .then(function (res) {
          if (res.error) return { ok: false, error: res.error.message };
          return Promise.all([self.loadWallet(), self.loadHistory(), self.loadCourses(), self.loadNotifications()]).then(
            function () {
              return { ok: true, data: res.data };
            }
          );
        });
    },

    loadArticles: function () {
      var gate = this.requireClient();
      if (!gate.ok) return Promise.resolve(DCS.articles || []);
      return gate.client
        .from("learning_articles")
        .select("id, title, tag, body, published_at")
        .eq("active", true)
        .order("published_at", { ascending: false })
        .then(function (res) {
          if (res.error || !res.data || !res.data.length) return DCS.articles || [];
          DCS.articles = res.data.map(function (a) {
            return {
              id: a.id,
              title: a.title,
              tag: a.tag,
              body: a.body || "",
              date: a.published_at
                ? new Date(a.published_at).toLocaleDateString("fr-FR")
                : ""
            };
          });
          return DCS.articles;
        });
    },

    loadReferrals: function () {
      var gate = this.requireClient();
      var aliases =
        typeof DCS.referralAliases === "function"
          ? DCS.referralAliases(DCS.user)
          : [DCS.user && DCS.user.inviteCode].filter(Boolean);
      if (!gate.ok || !DCS.user.id || !aliases.length) {
        return Promise.resolve({
          level1: [],
          level2: [],
          level3: [],
          earnings: { fromFeesPi: 0, recent: [] }
        });
      }
      var empty = { level1: [], level2: [], level3: [], earnings: { fromFeesPi: 0, recent: [] } };

      function memberAliases(row) {
        var list = [];
        function add(v) {
          var x = String(v || "")
            .trim()
            .replace(/^@+/, "");
          if (x && list.indexOf(x) < 0) list.push(x);
        }
        add(row.pi_username);
        add(row.username);
        add(row.invite_code);
        return list;
      }

      function pickHandle(row) {
        var bare =
          typeof DCS.bareInviteHandle === "function"
            ? DCS.bareInviteHandle
            : function (v) {
                return String(v || "")
                  .trim()
                  .replace(/^@+/, "");
              };
        var candidates = [
          row.pi_username,
          row.username,
          row.display_name,
          row.invite_code
        ];
        var i;
        for (i = 0; i < candidates.length; i++) {
          var h = bare(candidates[i]);
          if (!h) continue;
          if (/^pi\.[a-f0-9]{6,}$/i.test(h)) continue;
          return h;
        }
        return bare(row.invite_code || row.username) || "membre";
      }

      function mapMember(row, via) {
        var handle = pickHandle(row);
        return {
          id: row.id,
          username: handle,
          piUsername: row.pi_username || "",
          displayName: row.display_name || "",
          code: handle,
          earned: "—",
          via: via || "",
          date: row.created_at ? new Date(row.created_at).toLocaleDateString("fr-FR") : ""
        };
      }

      function fetchByCodes(codes) {
        if (!codes || !codes.length) return Promise.resolve([]);
        return gate.client.rpc("dcs_list_referrals_by_codes", { p_codes: codes }).then(function (res) {
          if (res.error) {
            console.warn(res.error);
            return [];
          }
          return res.data || [];
        });
      }

      /* Codes du parrain courant — ne jamais les réutiliser pour N2/N3 */
      var sponsorCodeSet = {};
      aliases.forEach(function (a) {
        sponsorCodeSet[String(a).toLowerCase()] = true;
      });

      var seenIds = {};
      function takeNewMembers(rows) {
        var out = [];
        (rows || []).forEach(function (r) {
          if (!r || !r.id || seenIds[r.id]) return;
          /* Ne jamais se compter soi-même */
          if (DCS.user.id && r.id === DCS.user.id) return;
          seenIds[r.id] = true;
          out.push(r);
        });
        return out;
      }

      function codesFromMembers(rows) {
        var codes = [];
        (rows || []).forEach(function (r) {
          memberAliases(r).forEach(function (a) {
            var key = String(a).toLowerCase();
            /* Empêche de rappeler les filleuls N1 (même code que le parrain) */
            if (sponsorCodeSet[key]) return;
            if (codes.indexOf(a) < 0) codes.push(a);
          });
        });
        return codes;
      }

      return fetchByCodes(aliases)
        .then(function (l1raw) {
          var l1 = takeNewMembers(l1raw);
          empty.level1 = l1.map(function (r) {
            return mapMember(r);
          });
          if (!l1.length) return empty;
          var codes = codesFromMembers(l1);
          var viaMap = {};
          l1.forEach(function (r) {
            var label = pickHandle(r);
            memberAliases(r).forEach(function (a) {
              viaMap[a] = label;
              viaMap[String(a).toLowerCase()] = label;
            });
          });
          if (!codes.length) return empty;
          return fetchByCodes(codes).then(function (l2raw) {
            var l2 = takeNewMembers(l2raw);
            empty.level2 = l2.map(function (r) {
              return mapMember(
                r,
                viaMap[r.referred_by] || viaMap[String(r.referred_by || "").toLowerCase()] || ""
              );
            });
            if (!l2.length) return empty;
            var codes2 = codesFromMembers(l2);
            var via2 = {};
            l2.forEach(function (r) {
              var label = pickHandle(r);
              memberAliases(r).forEach(function (a) {
                via2[a] = label;
                via2[String(a).toLowerCase()] = label;
              });
            });
            if (!codes2.length) return empty;
            return fetchByCodes(codes2).then(function (l3raw) {
              var l3 = takeNewMembers(l3raw);
              empty.level3 = l3.map(function (r) {
                return mapMember(
                  r,
                  via2[r.referred_by] || via2[String(r.referred_by || "").toLowerCase()] || ""
                );
              });
              return empty;
            });
          });
        })
        .then(function (tree) {
          return gate.client
            .from("referral_commissions")
            .select("commission_pi, fee_pi, level, kind, created_at, from_user_id")
            .eq("beneficiary_id", DCS.user.id)
            .order("created_at", { ascending: false })
            .limit(20)
            .then(function (cres) {
              var rows = cres.data || [];
              var total = 0;
              var fromIds = [];
              rows.forEach(function (r) {
                total += Number(r.commission_pi) || 0;
                if (r.from_user_id && fromIds.indexOf(r.from_user_id) < 0) {
                  fromIds.push(r.from_user_id);
                }
              });
              var namePromise =
                fromIds.length === 0
                  ? Promise.resolve({})
                  : gate.client
                      .rpc("dcs_public_handles", { p_ids: fromIds })
                      .then(function (pres) {
                        var map = {};
                        (pres.data || []).forEach(function (p) {
                          map[p.id] = pickHandle(p);
                        });
                        return map;
                      })
                      .catch(function () {
                        return {};
                      });
              return namePromise.then(function (nameMap) {
                tree.earnings = {
                  fromFeesPi: Math.round(total * 1000) / 1000,
                  recent: rows.map(function (r) {
                    return {
                      from: nameMap[r.from_user_id] || "membre",
                      type: r.kind || "Frais",
                      feePi: Number(r.fee_pi),
                      commissionPi: Number(r.commission_pi),
                      level: r.level,
                      date: r.created_at
                        ? new Date(r.created_at).toLocaleDateString("fr-FR")
                        : ""
                    };
                  })
                };
                DCS.referrals = {
                  level1: tree.level1,
                  level2: tree.level2,
                  level3: tree.level3
                };
                DCS.referralEarnings = tree.earnings;
                return tree;
              });
            });
        })
        .catch(function () {
          return empty;
        });
    },

    createPayout: function (payload) {
      var gate = this.requireClient();
      var self = this;
      if (!gate.ok) return Promise.resolve(gate);
      return gate.client
        .rpc("dcs_create_payout", {
          p_symbol: payload.symbol,
          p_amount: payload.amount,
          p_fee_pi: payload.feePi || 0,
          p_country: payload.country || "",
          p_method: payload.method || "",
          p_destination: payload.destination || "",
          p_detail: payload.detail || ""
        })
        .then(function (res) {
          if (res.error) return { ok: false, error: res.error.message };
          return Promise.all([self.loadWallet(), self.loadHistory(), self.loadNotifications()]).then(function () {
            return { ok: true, data: res.data };
          });
        });
    },

    submitKyc: function (payload) {
      var gate = this.requireClient();
      var self = this;
      if (!gate.ok) return Promise.resolve(gate);
      if (!DCS.user.id) return Promise.resolve({ ok: false, error: "Non connecté." });

      function uploadOne(fileOrDataUrl, nameHint) {
        if (!fileOrDataUrl) return Promise.resolve({ ok: true, path: "" });
        var path =
          DCS.user.id +
          "/" +
          nameHint +
          "-" +
          Date.now() +
          ".jpg";
        var blobPromise;
        if (typeof fileOrDataUrl === "string" && fileOrDataUrl.indexOf("data:") === 0) {
          blobPromise = fetch(fileOrDataUrl).then(function (r) {
            return r.blob();
          });
        } else {
          blobPromise = Promise.resolve(fileOrDataUrl);
        }
        return blobPromise.then(function (blob) {
          return gate.client.storage
            .from("kyc")
            .upload(path, blob, { upsert: true, contentType: "image/jpeg" })
            .then(function (up) {
              if (up.error) return { ok: false, error: up.error.message };
              return { ok: true, path: path };
            });
        });
      }

      return Promise.all([
        uploadOne(payload.idFile, "id"),
        uploadOne(payload.selfieDataUrl, "selfie"),
        uploadOne(payload.addressFile, "address")
      ]).then(function (ups) {
        for (var i = 0; i < ups.length; i++) {
          if (!ups[i].ok) return { ok: false, error: ups[i].error || "Upload KYC impossible." };
        }
        return gate.client
          .from("kyc_submissions")
          .insert({
            user_id: DCS.user.id,
            doc_type: payload.docType || "cni",
            id_path: ups[0].path || "",
            selfie_path: ups[1].path || "",
            address_path: ups[2].path || "",
            status: "pending"
          })
          .then(function (ins) {
            if (ins.error) return { ok: false, error: ins.error.message };
            DCS.user.kyc = "pending";
            DCS.user.kycDocType = payload.docType || "";
            return self.persistProfile().then(function () {
              return { ok: true };
            });
          });
      });
    }
  };

  /* API auth unifiée (remplace le mode localStorage) */
  DCS.auth = {
    isConfigured: function () {
      return isConfigured();
    },
    hydrate: function () {
      return DCS.backend.hydrate();
    },
    register: function (payload) {
      return DCS.backend.register(payload);
    },
    verifySignupOtp: function (email, token) {
      return DCS.backend.verifySignupOtp(email, token);
    },
    resendSignupOtp: function (email) {
      return DCS.backend.resendSignupOtp(email);
    },
    login: function (login, password) {
      return DCS.backend.login(login, password);
    },
    loginWithPi: function () {
      if (!DCS.pi || typeof DCS.pi.loginWithPi !== "function") {
        return Promise.resolve({
          ok: false,
          error: "Module Pi non chargé."
        });
      }
      return DCS.pi.loginWithPi();
    },
    logout: function () {
      return DCS.backend.logout();
    },
    persistCurrentUser: function () {
      return DCS.backend.persistProfile();
    },
    updatePassword: function (currentPw, newPw) {
      return DCS.backend.updatePassword(currentPw, newPw);
    },
    /* Compat UI OTP locale (état temporaire inscription) */
    OTP_KEY: "dcs_signup_pending",
    savePendingSignup: function (payload) {
      try {
        sessionStorage.setItem(
          this.OTP_KEY,
          JSON.stringify({ email: payload.email, payload: payload, at: Date.now() })
        );
      } catch (e) {}
    },
    getPendingSignup: function () {
      try {
        var raw = sessionStorage.getItem(this.OTP_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    clearPendingSignup: function () {
      try {
        sessionStorage.removeItem(this.OTP_KEY);
      } catch (e) {}
    }
  };

  /* Soldes vides par défaut (remplacés après hydrate) */
  DCS.wallet = emptyWallet();
  DCS.history = [];
})();
