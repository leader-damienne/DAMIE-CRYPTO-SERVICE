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

  function genInviteCode(username) {
    var base = String(username || "DCS")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 6);
    var rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
    return "DCS-" + (base || "MEM") + rnd;
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
      displayName: row.display_name || row.username,
      firstName: row.first_name || "",
      lastName: row.last_name || "",
      birthDate: row.birth_date || "",
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
      joined: row.created_at
        ? new Date(row.created_at).toLocaleDateString("fr-FR")
        : "",
      language: row.language || "fr",
      referredBy: row.referred_by || "",
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

  function emptyWallet() {
    return Object.keys(META).map(function (sym) {
      var m = META[sym];
      return {
        symbol: sym,
        name: m.name,
        amount: 0,
        iconClass: m.iconClass,
        iconText: "",
        logo: m.logo
      };
    });
  }

  DCS.backend = {
    client: null,
    ready: false,

    isConfigured: isConfigured,

    setupMessage: function () {
      return (
        "DCS nécessite Supabase pour fonctionner. Ouvrez SETUP-SUPABASE.md, " +
        "créez le projet, exécutez supabase/schema.sql, puis renseignez js/config.js."
      );
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
          (res.data || []).forEach(function (r) {
            map[r.symbol] = Number(r.amount) || 0;
          });
          DCS.wallet = emptyWallet().map(function (w) {
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
                    Promise.all([self.loadWallet(), self.loadHistory()]).then(function () {
                      resolve(true);
                    });
                  });
                }, 600);
              });
            }
            applyProfile(profile);
            return Promise.all([self.loadWallet(), self.loadHistory()]).then(function () {
              return true;
            });
          });
        });
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
            emailRedirectTo: location.origin + "/signin.html"
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

    persistProfile: function () {
      var gate = this.requireClient();
      if (!gate.ok || !DCS.user.id) return Promise.resolve({ ok: false });
      var u = DCS.user;
      return gate.client
        .from("profiles")
        .update({
          display_name: u.displayName || "",
          first_name: u.firstName || "",
          last_name: u.lastName || "",
          birth_date: u.birthDate || "",
          gender: u.gender || "",
          country: u.country || "",
          city: u.city || "",
          address: u.address || "",
          bio: u.bio || "",
          phone: u.phone || "",
          avatar: u.avatar || "",
          kyc: u.kyc || "none",
          gmail_linked: !!u.gmailLinked,
          phone_linked: !!u.phoneLinked,
          google_auth: !!u.googleAuth,
          language: u.language || "fr"
        })
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
          return Promise.all([self.loadWallet(), self.loadHistory()]).then(function () {
            return { ok: true };
          });
        });
    },

    transfer: function (symbol, amount, feePi, detail) {
      var self = this;
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
          return Promise.all([self.loadWallet(), self.loadHistory()]).then(function () {
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
