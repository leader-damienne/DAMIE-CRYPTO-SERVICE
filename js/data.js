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

DCS.wallet = [
  { symbol: "PI", name: "PI COIN", amount: 1250.5, iconClass: "pi", iconText: "", logo: "assets/coins/pi.png" },
  { symbol: "XOF", name: "Franc CFA Ouest", amount: 850000, iconClass: "xof", iconText: "", logo: "assets/coins/xof.svg" },
  { symbol: "XAF", name: "Franc CFA Centre", amount: 420000, iconClass: "xaf", iconText: "", logo: "assets/coins/xaf.svg" },
  { symbol: "USDT", name: "Tether", amount: 8420.0, iconClass: "usdt", iconText: "", logo: "assets/coins/usdt.svg" },
  { symbol: "BTC", name: "Bitcoin", amount: 0.085, iconClass: "btc", iconText: "", logo: "assets/coins/btc.svg" },
  { symbol: "ETH", name: "Ethereum", amount: 1.85, iconClass: "eth", iconText: "", logo: "assets/coins/eth.svg" },
  { symbol: "BNB", name: "BNB", amount: 12.4, iconClass: "bnb", iconText: "", logo: "assets/coins/bnb.svg" },
  { symbol: "SOL", name: "Solana", amount: 45.2, iconClass: "sol", iconText: "", logo: "assets/coins/sol.svg" },
  { symbol: "XRP", name: "XRP", amount: 2500, iconClass: "xrp", iconText: "", logo: "assets/coins/xrp.svg" },
  { symbol: "XLM", name: "Stellar", amount: 12000, iconClass: "xlm", iconText: "", logo: "assets/coins/xlm.svg" },
  { symbol: "TRX", name: "TRON", amount: 8500, iconClass: "trx", iconText: "", logo: "assets/coins/trx.svg" }
];

DCS.courses = [
  {
    title: "Introduction à la blockchain",
    level: "Débutant",
    pricePi: 10,
    desc: "Les bases de la blockchain et de l'écosystème Pi."
  },
  {
    title: "Trading crypto pour débutants",
    level: "Débutant",
    pricePi: 25,
    desc: "Ordres, paires, lecture d'un carnet d'ordres."
  },
  {
    title: "Analyse technique avancée",
    level: "Avancé",
    pricePi: 50,
    desc: "Indicateurs, tendances et gestion des positions."
  },
  {
    title: "Sécurité des actifs numériques",
    level: "Intermédiaire",
    pricePi: 20,
    desc: "Wallets, phishing, bonnes pratiques."
  },
  {
    title: "Gestion des risques",
    level: "Intermédiaire",
    pricePi: 30,
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

DCS.marketplace = [
  {
    id: 1,
    title: "Stratégie DCA avec PI COIN",
    author: "Amina K.",
    pricePi: 5,
    category: "Trading",
    excerpt: "Comment accumuler sans stress de volatilité grâce à PI COIN sur DCS.",
    content:
      "Ce guide détaille une stratégie d'achat programmé (DCA) basée sur PI COIN, stable à $314,159 sur DCS. Vous apprendrez à planifier vos apports, éviter le timing de marché et convertir ensuite vers XOF ou XAF selon vos besoins.",
    photos: ["assets/coins/pi.png", "assets/logo.png"]
  },
  {
    id: 2,
    title: "Corridors XOF → XAF expliqués",
    author: "Jean-Marc D.",
    pricePi: 8,
    category: "Transfer",
    excerpt: "Comprendre les frais et délais des transferts UEMOA / CEMAC.",
    content:
      "Tour d'horizon des corridors UEMOA (XOF) et CEMAC (XAF) sur DCS : délais indicatifs, conversion 1:1, bonnes pratiques pour sécuriser un transfert transfrontalier et lier votre wallet PI COIN.",
    photos: ["assets/coins/xof.svg", "assets/coins/xaf.svg"]
  },
  {
    id: 3,
    title: "Lancer une boutique payable en PI COIN",
    author: "Fatou S.",
    pricePi: 12,
    category: "Business",
    excerpt: "Checklist pour publier et monétiser vos articles sur DCS.",
    content:
      "De l'inscription vendeur à la première vente : fixer un prix en PI COIN, ajouter des photos attractives, rédiger un contenu clair et répondre aux acheteurs. Inclut un modèle de fiche produit.",
    photos: ["assets/logo.png", "assets/coins/pi.png", "assets/coins/usdt.svg"]
  },
  {
    id: 4,
    title: "Sécurité wallet : checklist Afrique",
    author: "Omar B.",
    pricePi: 6,
    category: "Sécurité",
    excerpt: "Bonnes pratiques pour protéger PI, XOF et XAF.",
    content:
      "Checklist anti-phishing, 2FA Google Authenticator, sauvegarde des accès et réflexes pour les transferts XOF/XAF. Destinée aux utilisateurs DCS en Afrique de l'Ouest et Centrale.",
    photos: ["assets/coins/btc.svg", "assets/coins/eth.svg"]
  },
  {
    id: 5,
    title: "Swap PI COIN → XOF pas à pas",
    author: "Amina K.",
    pricePi: 4,
    category: "Transfer",
    excerpt: "Tutoriel illustré pour convertir PI COIN en francs CFA Ouest.",
    content:
      "Capture d'écran mentale du parcours Swap DCS : choisir PI COIN, montant, destination XOF, vérifier le taux indicatif ≈ 600 XOF / $ puis confirmer. Idéal pour les débutants.",
    photos: ["assets/coins/pi.png", "assets/coins/xof.svg"]
  },
  {
    id: 6,
    title: "Pack formation trading débutant",
    author: "Jean-Marc D.",
    pricePi: 15,
    category: "Formation",
    excerpt: "Les bases du trading crypto adaptées au marché africain.",
    content:
      "Modules : lecture d'un carnet d'ordres, gestion du risque, psychologie et utilisation de PI COIN comme unité de compte stable sur DCS avant d'entrer sur des actifs volatils.",
    photos: ["assets/coins/bnb.svg", "assets/coins/sol.svg", "assets/logo.png"]
  }
];

DCS.purchases = [];

DCS.sellerReports = [];

DCS.community = [
  {
    author: "Amina K.",
    time: "Il y a 12 min",
    text: "PI COIN reste stable à 314 159 $ — parfait pour vendre mes articles en PI COIN sans risque de change."
  },
  {
    author: "Jean-Marc D.",
    time: "Il y a 1 h",
    text: "Swap PI → XOF réussi, puis transfer vers le Sénégal. Corridor UEMOA fluide."
  },
  {
    author: "Fatou S.",
    time: "Il y a 3 h",
    text: "Je viens de m'inscrire vendeur Marketplace — paiement 100 % en PI COIN."
  },
  {
    author: "DCS Officiel",
    time: "Hier",
    text: "Annonce : XOF et XAF disponibles pour swaps et transferts transfrontaliers."
  }
];

DCS.history = [
  { type: "Swap", detail: "PI → XOF", amount: "1 PI", status: "Terminé", date: "05/08/2026" },
  { type: "Transfer", detail: "XOF → Sénégal", amount: "150 000 XOF", status: "Confirmé", date: "05/08/2026" },
  { type: "Swap", detail: "XAF → PI", amount: "600 000 XAF", status: "Terminé", date: "04/08/2026" },
  { type: "Marketplace", detail: "Article Amina K.", amount: "-5 PI", status: "Payé", date: "04/08/2026" },
  { type: "Transfer", detail: "XOF → Cameroun (XAF)", amount: "200 000 XOF", status: "En cours", date: "03/08/2026" }
];

DCS.corridors = {
  XOF: ["Sénégal", "Côte d'Ivoire", "Bénin", "Togo", "Mali", "Burkina Faso", "Niger", "Guinée-Bissau"],
  XAF: ["Cameroun", "Gabon", "Tchad", "Congo", "Guinée équatoriale", "Centrafrique"],
  get PI() {
    return this.XOF.concat(this.XAF);
  },
  get USDT() {
    return this.XOF.concat(this.XAF);
  }
};

/* Compte membre démo */
DCS.user = {
  username: "damie.pro",
  displayName: "Damie Crypto",
  firstName: "Damie",
  lastName: "Crypto",
  birthDate: "",
  gender: "",
  country: "Sénégal",
  city: "Dakar",
  address: "",
  bio: "Passionné de PI COIN et des services DCS en Afrique.",
  email: "",
  phone: "",
  inviteCode: "DCS-DAMIE7X",
  referralLink: "",
  avatar: "",
  kyc: "pending",
  gmailLinked: false,
  phoneLinked: false,
  googleAuth: false,
  joined: "12/07/2026",
  language: "fr"
};

DCS.user.referralLink = "";

DCS.buildShareLinks = function () {
  var base = "./";
  try {
    if (typeof location !== "undefined" && location.protocol && location.protocol !== "file:") {
      var path = location.pathname || "/";
      var dir = path.replace(/\/[^/]*$/, "/");
      if (dir.indexOf(".") === -1 && dir.slice(-1) !== "/") dir += "/";
      if (/\/[^/]+\.html$/i.test(path)) {
        dir = path.replace(/\/[^/]+\.html$/i, "/");
      }
      if (!dir || dir === "") dir = "/";
      base = location.origin + dir;
      if (base.slice(-1) !== "/") base += "/";
    }
  } catch (e) {}
  var code = DCS.user.inviteCode || "DCS";
  var user = DCS.user.username || "membre";
  DCS.user.siteLink = base + "index.html";
  DCS.user.referralLink =
    base + "join.html?ref=" + encodeURIComponent(code) + "&u=" + encodeURIComponent(user);
  return { site: DCS.user.siteLink, join: DCS.user.referralLink };
};
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
  totalPi: 25.7,
  fromFeesPi: 25.7,
  recent: [
    { from: "amina.k", type: "Swap", feePi: 2.4, commissionPi: 0.12, level: 1, date: "05/08/2026" },
    { from: "jean.marc", type: "Transfer", feePi: 1.8, commissionPi: 0.09, level: 1, date: "04/08/2026" },
    { from: "omar.b", type: "Swap", feePi: 3.0, commissionPi: 0.09, level: 2, date: "03/08/2026" },
    { from: "paul.t", type: "Transfer", feePi: 1.2, commissionPi: 0.012, level: 3, date: "02/08/2026" }
  ]
};

DCS.referrals = {
  level1: [
    { username: "amina.k", code: "DCS-AMI42", earned: "12.5 PI", date: "01/08/2026" },
    { username: "jean.marc", code: "DCS-JM19", earned: "8.0 PI", date: "28/07/2026" },
    { username: "fatou.s", code: "DCS-FAT08", earned: "5.2 PI", date: "20/07/2026" }
  ],
  level2: [
    { username: "omar.b", code: "DCS-OM33", earned: "3.1 PI", via: "amina.k", date: "02/08/2026" },
    { username: "lea.m", code: "DCS-LEA21", earned: "1.8 PI", via: "jean.marc", date: "30/07/2026" }
  ],
  level3: [
    { username: "paul.t", code: "DCS-PAU55", earned: "0.6 PI", via: "omar.b", date: "04/08/2026" }
  ]
};
