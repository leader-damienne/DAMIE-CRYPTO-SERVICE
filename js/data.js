/* Marchés DCS — PI COIN + XOF/XAF */
window.DCS = window.DCS || {};

DCS.PI_PRICE = 314159;
/* Marques figées — ne jamais traduire, quelle que soit la langue de l'app */
DCS.APP_NAME = "DAMIE CRYPTO SERVICE";
DCS.LEADER_TITLE = "LEADER DAMIENNE";
DCS.FOUNDER_NAME = "ADILEHOU DAMIENNE";
DCS.LEADER_FLAG = "BJ"; /* Bénin — drapeau toujours affiché devant LEADER DAMIENNE */
/* Parité indicative CFA (démo) : 1 USD ≈ 600 XOF/XAF */
DCS.CFA_PER_USD = 600;

DCS.markets = [
  {
    id: "pi",
    symbol: "PI",
    name: "PI COIN",
    pair: "PI/USDT",
    price: 314159,
    change24h: 0,
    volume: 428500000,
    high: 314159,
    low: 314159,
    featured: true,
    stable: true,
    iconClass: "pi",
    iconText: "",
    logo: "assets/coins/pi.png"
  },
  {
    id: "xof",
    symbol: "XOF",
    name: "Franc CFA Ouest (UEMOA)",
    pair: "XOF/USDT",
    price: 1 / 600,
    change24h: 0,
    volume: 89000000,
    high: 1 / 600,
    low: 1 / 600,
    stable: true,
    fiat: true,
    zone: "UEMOA",
    iconClass: "xof",
    iconText: "",
    logo: "assets/coins/xof.svg"
  },
  {
    id: "xaf",
    symbol: "XAF",
    name: "Franc CFA Centre (CEMAC)",
    pair: "XAF/USDT",
    price: 1 / 600,
    change24h: 0,
    volume: 72000000,
    high: 1 / 600,
    low: 1 / 600,
    stable: true,
    fiat: true,
    zone: "CEMAC",
    iconClass: "xaf",
    iconText: "",
    logo: "assets/coins/xaf.svg"
  },
  {
    id: "usdt",
    symbol: "USDT",
    name: "Tether",
    pair: "USDT/USD",
    price: 1.0,
    change24h: 0,
    volume: 45000000000,
    high: 1.0,
    low: 1.0,
    stable: true,
    iconClass: "usdt",
    iconText: "",
    logo: "assets/coins/usdt.svg"
  },
  {
    id: "btc",
    symbol: "BTC",
    name: "Bitcoin",
    pair: "BTC/USDT",
    price: 68420.5,
    change24h: 2.14,
    volume: 18200000000,
    high: 69100,
    low: 66850,
    iconClass: "btc",
    iconText: "",
    logo: "assets/coins/btc.svg"
  },
  {
    id: "eth",
    symbol: "ETH",
    name: "Ethereum",
    pair: "ETH/USDT",
    price: 3456.8,
    change24h: -0.87,
    volume: 9400000000,
    high: 3520,
    low: 3398,
    iconClass: "eth",
    iconText: "",
    logo: "assets/coins/eth.svg"
  },
  {
    id: "bnb",
    symbol: "BNB",
    name: "BNB",
    pair: "BNB/USDT",
    price: 598.12,
    change24h: 1.35,
    volume: 1200000000,
    high: 605,
    low: 582,
    iconClass: "bnb",
    iconText: "",
    logo: "assets/coins/bnb.svg"
  },
  {
    id: "sol",
    symbol: "SOL",
    name: "Solana",
    pair: "SOL/USDT",
    price: 178.45,
    change24h: 4.62,
    volume: 2100000000,
    high: 182,
    low: 169,
    iconClass: "sol",
    iconText: "",
    logo: "assets/coins/sol.svg"
  },
  {
    id: "xrp",
    symbol: "XRP",
    name: "XRP",
    pair: "XRP/USDT",
    price: 0.6234,
    change24h: -1.22,
    volume: 980000000,
    high: 0.641,
    low: 0.611,
    iconClass: "xrp",
    iconText: "",
    logo: "assets/coins/xrp.svg"
  },
  {
    id: "xlm",
    symbol: "XLM",
    name: "Stellar",
    pair: "XLM/USDT",
    price: 0.1128,
    change24h: 0.95,
    volume: 145000000,
    high: 0.116,
    low: 0.109,
    iconClass: "xlm",
    iconText: "",
    logo: "assets/coins/xlm.svg"
  },
  {
    id: "trx",
    symbol: "TRX",
    name: "TRON",
    pair: "TRX/USDT",
    price: 0.1642,
    change24h: 0.48,
    volume: 520000000,
    high: 0.167,
    low: 0.161,
    iconClass: "trx",
    iconText: "",
    logo: "assets/coins/trx.svg"
  }
];

/* Soldes chargés depuis Supabase après connexion (backend.js) */
DCS.wallet = [];

DCS.courses = [
  {
    title: "Introduction à la blockchain",
    level: "Débutant",
    pricePi: 0.00003,
    desc: "Les bases de la blockchain et de l'écosystème Pi."
  },
  {
    title: "Trading crypto pour débutants",
    level: "Débutant",
    pricePi: 0.00008,
    desc: "Ordres, paires, lecture d'un carnet d'ordres."
  },
  {
    title: "Analyse technique avancée",
    level: "Avancé",
    pricePi: 0.00016,
    desc: "Indicateurs, tendances et gestion des positions."
  },
  {
    title: "Sécurité des actifs numériques",
    level: "Intermédiaire",
    pricePi: 0.00006,
    desc: "Wallets, phishing, bonnes pratiques."
  },
  {
    title: "Gestion des risques",
    level: "Intermédiaire",
    pricePi: 0.0001,
    desc: "Money management et psychologie du trader."
  }
];

DCS.articles = [
  {
    title: "Pourquoi PI COIN est au cœur de DCS",
    tag: "Actualité",
    date: "5 août 2026"
  },
  {
    title: "Guide : swap PI COIN → XOF / XAF",
    tag: "Tutoriel",
    date: "2 août 2026"
  },
  {
    title: "Transferts transfrontaliers UEMOA ↔ CEMAC",
    tag: "Guide",
    date: "28 juil. 2026"
  },
  {
    title: "Vendre du contenu payable en PI COIN",
    tag: "Marketplace",
    date: "25 juil. 2026"
  }
];

DCS.marketplace = [];

DCS.purchases = [];

DCS.sellerReports = [];

DCS.community = [
  {
    author: "DCS Officiel",
    time: "Bienvenue",
    text: "Bienvenue sur DCS Community — partagez vos questions et expériences."
  }
];

/* Historique chargé depuis Supabase */
DCS.history = [];

/* Pays africains + Mobile Money disponibles à l'arrivée */
DCS.africaPayout = [
  /* UEMOA — XOF */
  { name: "Bénin", zone: "UEMOA", currency: "XOF", methods: ["MTN MoMo", "Moov Money"] },
  { name: "Burkina Faso", zone: "UEMOA", currency: "XOF", methods: ["Orange Money", "Moov Money"] },
  { name: "Côte d'Ivoire", zone: "UEMOA", currency: "XOF", methods: ["Orange Money", "MTN MoMo", "Moov Money", "Wave"] },
  { name: "Guinée-Bissau", zone: "UEMOA", currency: "XOF", methods: ["Orange Money"] },
  { name: "Mali", zone: "UEMOA", currency: "XOF", methods: ["Orange Money", "Moov Money", "Wave"] },
  { name: "Niger", zone: "UEMOA", currency: "XOF", methods: ["Airtel Money", "Orange Money", "Moov Money"] },
  { name: "Sénégal", zone: "UEMOA", currency: "XOF", methods: ["Wave", "Orange Money", "Free Money"] },
  { name: "Togo", zone: "UEMOA", currency: "XOF", methods: ["Flooz (Moov)", "TMoney (Togocel)"] },
  /* CEMAC — XAF */
  { name: "Cameroun", zone: "CEMAC", currency: "XAF", methods: ["MTN MoMo", "Orange Money"] },
  { name: "Centrafrique", zone: "CEMAC", currency: "XAF", methods: ["Orange Money"] },
  { name: "Congo", zone: "CEMAC", currency: "XAF", methods: ["Airtel Money", "MTN MoMo"] },
  { name: "Gabon", zone: "CEMAC", currency: "XAF", methods: ["Airtel Money", "Moov Money"] },
  { name: "Guinée équatoriale", zone: "CEMAC", currency: "XAF", methods: ["Muni Money"] },
  { name: "Tchad", zone: "CEMAC", currency: "XAF", methods: ["Airtel Money", "Moov Money"] },
  /* Afrique de l'Ouest (hors UEMOA) */
  { name: "Cabo Verde", zone: "Afrique de l'Ouest", currency: "CVE", methods: ["vinti4", "Banque locale"] },
  { name: "Gambie", zone: "Afrique de l'Ouest", currency: "GMD", methods: ["Wave", "Africell Money"] },
  { name: "Ghana", zone: "Afrique de l'Ouest", currency: "GHS", methods: ["MTN MoMo", "Vodafone Cash", "AirtelTigo Money"] },
  { name: "Guinée", zone: "Afrique de l'Ouest", currency: "GNF", methods: ["Orange Money", "MTN MoMo"] },
  { name: "Liberia", zone: "Afrique de l'Ouest", currency: "LRD", methods: ["Orange Money", "MTN MoMo"] },
  { name: "Nigeria", zone: "Afrique de l'Ouest", currency: "NGN", methods: ["OPay", "PalmPay", "MTN MoMo", "Banque locale"] },
  { name: "Sierra Leone", zone: "Afrique de l'Ouest", currency: "SLE", methods: ["Orange Money", "Africell Money"] },
  /* Afrique centrale / Est */
  { name: "Burundi", zone: "Afrique de l'Est", currency: "BIF", methods: ["Lumicash", "EcoCash"] },
  { name: "Djibouti", zone: "Afrique de l'Est", currency: "DJF", methods: ["Waafi", "D-Money"] },
  { name: "Érythrée", zone: "Afrique de l'Est", currency: "ERN", methods: ["Banque locale"] },
  { name: "Éthiopie", zone: "Afrique de l'Est", currency: "ETB", methods: ["Telebirr", "CBE Birr"] },
  { name: "Kenya", zone: "Afrique de l'Est", currency: "KES", methods: ["M-Pesa", "Airtel Money"] },
  { name: "Ouganda", zone: "Afrique de l'Est", currency: "UGX", methods: ["MTN MoMo", "Airtel Money"] },
  { name: "Rwanda", zone: "Afrique de l'Est", currency: "RWF", methods: ["MTN MoMo", "Airtel Money"] },
  { name: "Seychelles", zone: "Afrique de l'Est", currency: "SCR", methods: ["Banque locale"] },
  { name: "Somalie", zone: "Afrique de l'Est", currency: "SOS", methods: ["EVC Plus", "Zaad", "Sahal"] },
  { name: "Soudan", zone: "Afrique de l'Est", currency: "SDG", methods: ["Bankak", "Banque locale"] },
  { name: "Soudan du Sud", zone: "Afrique de l'Est", currency: "SSP", methods: ["mGurush"] },
  { name: "Tanzanie", zone: "Afrique de l'Est", currency: "TZS", methods: ["M-Pesa", "Tigo Pesa", "Airtel Money", "HaloPesa"] },
  /* Afrique centrale élargie */
  { name: "Angola", zone: "Afrique centrale", currency: "AOA", methods: ["Multicaixa", "Banque locale"] },
  { name: "RDC", zone: "Afrique centrale", currency: "CDF", methods: ["Orange Money", "M-Pesa", "Airtel Money"] },
  { name: "Sao Tomé-et-Principe", zone: "Afrique centrale", currency: "STN", methods: ["Banque locale"] },
  /* Afrique australe */
  { name: "Afrique du Sud", zone: "Afrique australe", currency: "ZAR", methods: ["Capitec Pay", "SnapScan", "Mukuru", "Banque locale"] },
  { name: "Botswana", zone: "Afrique australe", currency: "BWP", methods: ["Orange Money", "MyZaka"] },
  { name: "Eswatini", zone: "Afrique australe", currency: "SZL", methods: ["MoMo", "eWallet"] },
  { name: "Lesotho", zone: "Afrique australe", currency: "LSL", methods: ["EcoCash", "M-Pesa"] },
  { name: "Malawi", zone: "Afrique australe", currency: "MWK", methods: ["Airtel Money", "TNM Mpamba"] },
  { name: "Mozambique", zone: "Afrique australe", currency: "MZN", methods: ["M-Pesa", "e-Mola"] },
  { name: "Namibie", zone: "Afrique australe", currency: "NAD", methods: ["eWallet", "BlueWallet"] },
  { name: "Zambie", zone: "Afrique australe", currency: "ZMW", methods: ["MTN MoMo", "Airtel Money", "Zamtel Kwacha"] },
  { name: "Zimbabwe", zone: "Afrique australe", currency: "USD", methods: ["EcoCash", "OneMoney"] },
  /* Afrique du Nord */
  { name: "Algérie", zone: "Afrique du Nord", currency: "DZD", methods: ["BaridiMob", "Banque locale"] },
  { name: "Égypte", zone: "Afrique du Nord", currency: "EGP", methods: ["Vodafone Cash", "Orange Cash", "Etisalat Cash"] },
  { name: "Libye", zone: "Afrique du Nord", currency: "LYD", methods: ["Banque locale"] },
  { name: "Maroc", zone: "Afrique du Nord", currency: "MAD", methods: ["Orange Money", "inwi money", "Banque locale"] },
  { name: "Mauritanie", zone: "Afrique du Nord", currency: "MRU", methods: ["Bankily", "Sedad", "Masrivi"] },
  { name: "Tunisie", zone: "Afrique du Nord", currency: "TND", methods: ["Orange Money", "Flouci", "Banque locale"] },
  /* Océan Indien */
  { name: "Comores", zone: "Océan Indien", currency: "KMF", methods: ["Banque locale"] },
  { name: "Madagascar", zone: "Océan Indien", currency: "MGA", methods: ["Orange Money", "MVola", "Airtel Money"] },
  { name: "Maurice", zone: "Océan Indien", currency: "MUR", methods: ["Juice by MCB", "My.t Money"] }
];

DCS.getCountryInfo = function (name) {
  return (DCS.africaPayout || []).find(function (c) {
    return c.name === name;
  }) || null;
};

DCS.corridors = {
  get XOF() {
    return (DCS.africaPayout || [])
      .filter(function (c) {
        return c.currency === "XOF";
      })
      .map(function (c) {
        return c.name;
      });
  },
  get XAF() {
    return (DCS.africaPayout || [])
      .filter(function (c) {
        return c.currency === "XAF";
      })
      .map(function (c) {
        return c.name;
      });
  },
  get PI() {
    return (DCS.africaPayout || []).map(function (c) {
      return c.name;
    });
  },
  get USDT() {
    return (DCS.africaPayout || []).map(function (c) {
      return c.name;
    });
  }
};

/* Compte invité par défaut — remplacé si session active */
DCS.user = {
  username: "",
  displayName: "Invité DCS",
  firstName: "",
  lastName: "",
  birthDate: "",
  gender: "",
  country: "",
  city: "",
  address: "",
  bio: "",
  email: "",
  phone: "",
  inviteCode: "",
  referralLink: "",
  siteLink: "",
  avatar: "",
  kyc: "none",
  gmailLinked: false,
  phoneLinked: false,
  googleAuth: false,
  joined: "",
  language: "fr",
  loggedIn: false,
  referredBy: "",
  depositPiAddress: ""
};

DCS.bareInviteHandle = function (raw) {
  return String(raw || "")
    .trim()
    .replace(/^@+/, "");
};

/** Code d'invitation affiché / partagé : username Pi en priorité */
DCS.primaryInviteCode = function (user) {
  var u = user || DCS.user || {};
  return (
    DCS.bareInviteHandle(u.piUsername) ||
    DCS.bareInviteHandle(u.username) ||
    DCS.bareInviteHandle(u.inviteCode) ||
    "DCS"
  );
};

/** Alias pour retrouver filleuls (anciens codes DCS-… + username Pi) */
DCS.referralAliases = function (user) {
  var u = user || DCS.user || {};
  var out = [];
  function add(v) {
    var s = DCS.bareInviteHandle(v);
    if (s && out.indexOf(s) < 0) out.push(s);
  }
  add(u.piUsername);
  add(u.username);
  add(u.inviteCode);
  return out;
};

DCS.buildShareLinks = function () {
  var cfg = window.DCS_CONFIG || {};
  var base = String(cfg.piNetBaseUrl || "https://damiecrypto3760.pinet.com/").trim();
  if (!base) base = "./";
  if (base.slice(-1) !== "/") base += "/";
  var code = DCS.primaryInviteCode(DCS.user);
  var user = code;
  var join =
    base + "join.html?ref=" + encodeURIComponent(code) + "&u=" + encodeURIComponent(user);
  if (DCS.user) {
    DCS.user.siteLink = base + "index.html";
    DCS.user.referralLink = join;
  }
  return {
    site: base + "index.html",
    join: join
  };
};

/* Auth / wallets : voir js/backend.js (Supabase) */

DCS.buildShareLinks();

DCS.referralRates = [
  { level: 1, rate: 5, label: "Sur frais des filleuls directs" },
  { level: 2, rate: 3, label: "Sur frais du niveau 2" },
  { level: 3, rate: 1, label: "Sur frais du niveau 3" }
];

/* Frais swap / transfer payés en PI COIN uniquement — 1 % fixe sur la valeur USD */
DCS.fees = {
  currency: "PI",
  percent: 1,
  swap: [{ maxUsd: Infinity, percent: 1 }],
  transfer: [{ maxUsd: Infinity, percent: 1 }],
  note: "Frais de transaction : 1 % pour tout (swap et transfer), payés en PI COIN. Les commissions N1–N3 sont prélevées sur ces frais."
};

DCS.referralEarnings = {
  totalPi: 0,
  fromFeesPi: 0,
  recent: []
};

DCS.referrals = {
  level1: [],
  level2: [],
  level3: []
};

DCS.notifications = [];
DCS.supportTickets = [];
