/* DAMIE CRYPTO SERVICE — i18n (fr / en / pt / ar) */
(function (global) {
  var DCS = (global.DCS = global.DCS || {});

  var LABELS = {
    fr: "Français",
    en: "English",
    pt: "Português",
    ar: "العربية"
  };

  var DICT = {
    fr: {
      "brand.tagline": "Sécuriser · Échanger · Apprendre · Prospérer",
      "nav.home": "Accueil",
      "nav.markets": "Marchés",
      "nav.wallet": "Wallet",
      "nav.swap": "Swap",
      "nav.transfer": "Transfer",
      "nav.marketplace": "Marketplace",
      "nav.referral": "Parrainage",
      "nav.profile": "Profil",
      "nav.academy": "Academy",
      "nav.learning": "Learning",
      "nav.community": "Community",
      "nav.contact": "Contact",
      "nav.menu": "Menu",
      "footer.blurb":
        "Rendre Pi et les actifs numériques accessibles en Afrique — transactions, paiements et éducation blockchain.",
      "footer.services": "Services",
      "footer.learn": "Apprendre",
      "footer.dcs": "DCS",
      "footer.mission": "Mission & Vision",
      "footer.founder": "Fondatrice",
      "footer.copy": "© 2026 Damie Crypto Service (DCS)",
      "footer.founderLine": "Fondatrice :",
      "index.hero.tagline":
        "La plateforme qui simplifie les transactions en Pi, l'apprentissage de la crypto et les services numériques en Afrique.",
      "index.cta.wallet": "Ouvrir le Wallet",
      "index.cta.mission": "Mission & Vision",
      "index.pi.stable": "Stable",
      "index.pi.sub": "Stable · non volatil · DCS",
      "index.pi.value": "Valeur PI COIN",
      "index.pi.xof": "En XOF",
      "index.pi.xaf": "En XAF",
      "index.pi.vol": "Volume",
      "index.stats.corridors": "Corridors",
      "index.mission.label": "Mission",
      "index.mission.title": "Notre mission",
      "index.mission.text":
        "Rendre Pi et les actifs numériques accessibles, simples et sécurisés en Afrique grâce à une plateforme innovante de transactions, de paiements et d'éducation blockchain.",
      "index.vision.label": "Vision",
      "index.vision.title": "Notre vision",
      "index.vision.text":
        "Devenir la plateforme de référence en Afrique pour les services liés à Pi, aux actifs numériques et à l'éducation blockchain, en favorisant l'innovation, l'inclusion financière et la transformation numérique.",
      "index.founder.label": "Fondatrice",
      "index.markets.title": "Marchés",
      "index.markets.sub": "PI COIN, francs CFA et cryptos — sans volatilité sur PI COIN",
      "index.tab.all": "Tous",
      "index.tab.other": "Autres",
      "index.search": "Rechercher PI, XOF, XAF…",
      "index.th.asset": "Actif",
      "index.th.price": "Prix",
      "index.th.change": "24h %",
      "index.th.volume": "Volume",
      "index.th.trend": "Tendance",
      "index.modules.title": "Modules DCS",
      "mod.wallet.title": "Wallet",
      "mod.wallet.desc": "Soldes multi-actifs et dépôt PI COIN.",
      "mod.swap.title": "Swap",
      "mod.swap.desc": "Échangez entre PI, XOF, XAF et cryptos.",
      "mod.transfer.title": "Transfer",
      "mod.transfer.desc": "Envoyez vers Mobile Money et banques.",
      "mod.market.title": "Marketplace",
      "mod.market.desc": "Achetez et vendez en PI COIN.",
      "mod.ref.title": "Parrainage",
      "mod.ref.desc": "Invitez et gagnez sur 3 niveaux.",
      "mod.profile.title": "Profil & KYC",
      "mod.profile.desc": "Photo, e-mail, 2FA, téléphone et sécurité.",
      "mod.academy.title": "DCS Academy",
      "mod.academy.desc": "Cours payables uniquement en PI COIN.",
      "mod.community.title": "DCS Community",
      "mod.community.desc": "Discussions, Q&R et annonces.",
      "page.profil.title": "Mon Profil",
      "page.profil.sub": "Identité, langue, KYC, sécurité, support et déconnexion.",
      "page.wallet.title": "Wallet",
      "page.wallet.sub": "Soldes, dépôt PI COIN et historique.",
      "page.swap.title": "Swap",
      "page.swap.sub": "Échangez vos actifs en quelques secondes.",
      "page.transfer.title": "Transfer",
      "page.transfer.sub": "Envoyez vers l'Afrique via Mobile Money ou banque.",
      "page.marketplace.title": "Marketplace",
      "page.marketplace.sub": "Articles et services payés en PI COIN.",
      "page.parrainage.title": "Parrainage",
      "page.parrainage.sub": "Votre réseau et vos commissions.",
      "page.academy.title": "Academy",
      "page.academy.sub": "Formations crypto et blockchain.",
      "page.learning.title": "Learning",
      "page.learning.sub": "Ressources pour progresser.",
      "page.community.title": "Community",
      "page.community.sub": "Échanges avec la communauté DCS.",
      "page.contact.title": "Contact",
      "page.contact.sub": "Support et coordonnées DCS.",
      "page.signin.title": "Connexion",
      "page.signin.sub": "Accédez à votre compte DCS.",
      "page.signup.title": "Inscription",
      "page.signup.sub": "Créez votre compte Damie Crypto Service.",
      "page.join.title": "Rejoindre",
      "page.join.sub": "Inscription via lien de parrainage.",
      "lang.title": "Langue de l'application",
      "lang.label": "Langue",
      "lang.current": "Langue actuelle",
      "lang.save": "Enregistrer",
      "lang.saved.fr": "Langue enregistrée : Français. L'interface est mise à jour.",
      "lang.saved.en": "Language saved: English. The interface has been updated.",
      "lang.saved.pt": "Idioma guardado: Português. A interface foi atualizada.",
      "lang.saved.ar": "تم حفظ اللغة: العربية. تم تحديث الواجهة."
    },
    en: {
      "brand.tagline": "Secure · Trade · Learn · Prosper",
      "nav.home": "Home",
      "nav.markets": "Markets",
      "nav.wallet": "Wallet",
      "nav.swap": "Swap",
      "nav.transfer": "Transfer",
      "nav.marketplace": "Marketplace",
      "nav.referral": "Referral",
      "nav.profile": "Profile",
      "nav.academy": "Academy",
      "nav.learning": "Learning",
      "nav.community": "Community",
      "nav.contact": "Contact",
      "nav.menu": "Menu",
      "footer.blurb":
        "Making Pi and digital assets accessible in Africa — transactions, payments and blockchain education.",
      "footer.services": "Services",
      "footer.learn": "Learn",
      "footer.dcs": "DCS",
      "footer.mission": "Mission & Vision",
      "footer.founder": "Founder",
      "footer.copy": "© 2026 Damie Crypto Service (DCS)",
      "footer.founderLine": "Founder:",
      "index.hero.tagline":
        "The platform that simplifies Pi transactions, crypto learning and digital services in Africa.",
      "index.cta.wallet": "Open Wallet",
      "index.cta.mission": "Mission & Vision",
      "index.pi.stable": "Stable",
      "index.pi.sub": "Stable · non-volatile · DCS",
      "index.pi.value": "PI COIN value",
      "index.pi.xof": "In XOF",
      "index.pi.xaf": "In XAF",
      "index.pi.vol": "Volume",
      "index.stats.corridors": "Corridors",
      "index.mission.label": "Mission",
      "index.mission.title": "Our mission",
      "index.mission.text":
        "Make Pi and digital assets accessible, simple and secure in Africa through an innovative platform for transactions, payments and blockchain education.",
      "index.vision.label": "Vision",
      "index.vision.title": "Our vision",
      "index.vision.text":
        "Become the reference platform in Africa for Pi-related services, digital assets and blockchain education, driving innovation, financial inclusion and digital transformation.",
      "index.founder.label": "Founder",
      "index.markets.title": "Markets",
      "index.markets.sub": "PI COIN, CFA francs and cryptos — no volatility on PI COIN",
      "index.tab.all": "All",
      "index.tab.other": "Others",
      "index.search": "Search PI, XOF, XAF…",
      "index.th.asset": "Asset",
      "index.th.price": "Price",
      "index.th.change": "24h %",
      "index.th.volume": "Volume",
      "index.th.trend": "Trend",
      "index.modules.title": "DCS modules",
      "mod.wallet.title": "Wallet",
      "mod.wallet.desc": "Multi-asset balances and PI COIN deposit.",
      "mod.swap.title": "Swap",
      "mod.swap.desc": "Trade between PI, XOF, XAF and cryptos.",
      "mod.transfer.title": "Transfer",
      "mod.transfer.desc": "Send to Mobile Money and banks.",
      "mod.market.title": "Marketplace",
      "mod.market.desc": "Buy and sell with PI COIN.",
      "mod.ref.title": "Referral",
      "mod.ref.desc": "Invite and earn across 3 levels.",
      "mod.profile.title": "Profile & KYC",
      "mod.profile.desc": "Photo, email, 2FA, phone and security.",
      "mod.academy.title": "DCS Academy",
      "mod.academy.desc": "Courses payable only in PI COIN.",
      "mod.community.title": "DCS Community",
      "mod.community.desc": "Discussions, Q&A and announcements.",
      "page.profil.title": "My Profile",
      "page.profil.sub": "Identity, language, KYC, security, support and logout.",
      "page.wallet.title": "Wallet",
      "page.wallet.sub": "Balances, PI COIN deposit and history.",
      "page.swap.title": "Swap",
      "page.swap.sub": "Exchange your assets in seconds.",
      "page.transfer.title": "Transfer",
      "page.transfer.sub": "Send across Africa via Mobile Money or bank.",
      "page.marketplace.title": "Marketplace",
      "page.marketplace.sub": "Goods and services paid in PI COIN.",
      "page.parrainage.title": "Referral",
      "page.parrainage.sub": "Your network and commissions.",
      "page.academy.title": "Academy",
      "page.academy.sub": "Crypto and blockchain training.",
      "page.learning.title": "Learning",
      "page.learning.sub": "Resources to level up.",
      "page.community.title": "Community",
      "page.community.sub": "Connect with the DCS community.",
      "page.contact.title": "Contact",
      "page.contact.sub": "DCS support and details.",
      "page.signin.title": "Sign in",
      "page.signin.sub": "Access your DCS account.",
      "page.signup.title": "Sign up",
      "page.signup.sub": "Create your Damie Crypto Service account.",
      "page.join.title": "Join",
      "page.join.sub": "Sign up via referral link.",
      "lang.title": "App language",
      "lang.label": "Language",
      "lang.current": "Current language",
      "lang.save": "Save",
      "lang.saved.fr": "Langue enregistrée : Français. L'interface est mise à jour.",
      "lang.saved.en": "Language saved: English. The interface has been updated.",
      "lang.saved.pt": "Idioma guardado: Português. A interface foi atualizada.",
      "lang.saved.ar": "تم حفظ اللغة: العربية. تم تحديث الواجهة."
    },
    pt: {
      "brand.tagline": "Proteger · Trocar · Aprender · Prosperar",
      "nav.home": "Início",
      "nav.markets": "Mercados",
      "nav.wallet": "Carteira",
      "nav.swap": "Swap",
      "nav.transfer": "Transferência",
      "nav.marketplace": "Marketplace",
      "nav.referral": "Indicação",
      "nav.profile": "Perfil",
      "nav.academy": "Academy",
      "nav.learning": "Learning",
      "nav.community": "Community",
      "nav.contact": "Contacto",
      "nav.menu": "Menu",
      "footer.blurb":
        "Tornar o Pi e os ativos digitais acessíveis em África — transações, pagamentos e educação blockchain.",
      "footer.services": "Serviços",
      "footer.learn": "Aprender",
      "footer.dcs": "DCS",
      "footer.mission": "Missão & Visão",
      "footer.founder": "Fundadora",
      "footer.copy": "© 2026 Damie Crypto Service (DCS)",
      "footer.founderLine": "Fundadora:",
      "index.hero.tagline":
        "A plataforma que simplifica as transações em Pi, a aprendizagem de cripto e os serviços digitais em África.",
      "index.cta.wallet": "Abrir carteira",
      "index.cta.mission": "Missão & Visão",
      "index.pi.stable": "Estável",
      "index.pi.sub": "Estável · não volátil · DCS",
      "index.pi.value": "Valor PI COIN",
      "index.pi.xof": "Em XOF",
      "index.pi.xaf": "Em XAF",
      "index.pi.vol": "Volume",
      "index.stats.corridors": "Corredores",
      "index.mission.label": "Missão",
      "index.mission.title": "A nossa missão",
      "index.mission.text":
        "Tornar o Pi e os ativos digitais acessíveis, simples e seguros em África através de uma plataforma inovadora de transações, pagamentos e educação blockchain.",
      "index.vision.label": "Visão",
      "index.vision.title": "A nossa visão",
      "index.vision.text":
        "Tornar-se a plataforma de referência em África para serviços ligados ao Pi, ativos digitais e educação blockchain, promovendo inovação, inclusão financeira e transformação digital.",
      "index.founder.label": "Fundadora",
      "index.markets.title": "Mercados",
      "index.markets.sub": "PI COIN, francos CFA e criptos — sem volatilidade no PI COIN",
      "index.tab.all": "Todos",
      "index.tab.other": "Outros",
      "index.search": "Pesquisar PI, XOF, XAF…",
      "index.th.asset": "Ativo",
      "index.th.price": "Preço",
      "index.th.change": "24h %",
      "index.th.volume": "Volume",
      "index.th.trend": "Tendência",
      "index.modules.title": "Módulos DCS",
      "mod.wallet.title": "Carteira",
      "mod.wallet.desc": "Saldos multiativos e depósito PI COIN.",
      "mod.swap.title": "Swap",
      "mod.swap.desc": "Troque entre PI, XOF, XAF e criptos.",
      "mod.transfer.title": "Transferência",
      "mod.transfer.desc": "Envie para Mobile Money e bancos.",
      "mod.market.title": "Marketplace",
      "mod.market.desc": "Compre e venda em PI COIN.",
      "mod.ref.title": "Indicação",
      "mod.ref.desc": "Convide e ganhe em 3 níveis.",
      "mod.profile.title": "Perfil & KYC",
      "mod.profile.desc": "Foto, e-mail, 2FA, telefone e segurança.",
      "mod.academy.title": "DCS Academy",
      "mod.academy.desc": "Cursos pagos apenas em PI COIN.",
      "mod.community.title": "DCS Community",
      "mod.community.desc": "Discussões, Q&A e anúncios.",
      "page.profil.title": "O meu Perfil",
      "page.profil.sub": "Identidade, idioma, KYC, segurança, suporte e saída.",
      "page.wallet.title": "Carteira",
      "page.wallet.sub": "Saldos, depósito PI COIN e histórico.",
      "page.swap.title": "Swap",
      "page.swap.sub": "Troque os seus ativos em segundos.",
      "page.transfer.title": "Transferência",
      "page.transfer.sub": "Envie para África via Mobile Money ou banco.",
      "page.marketplace.title": "Marketplace",
      "page.marketplace.sub": "Artigos e serviços pagos em PI COIN.",
      "page.parrainage.title": "Indicação",
      "page.parrainage.sub": "A sua rede e comissões.",
      "page.academy.title": "Academy",
      "page.academy.sub": "Formação em cripto e blockchain.",
      "page.learning.title": "Learning",
      "page.learning.sub": "Recursos para evoluir.",
      "page.community.title": "Community",
      "page.community.sub": "Fale com a comunidade DCS.",
      "page.contact.title": "Contacto",
      "page.contact.sub": "Suporte e contactos DCS.",
      "page.signin.title": "Entrar",
      "page.signin.sub": "Aceda à sua conta DCS.",
      "page.signup.title": "Registo",
      "page.signup.sub": "Crie a sua conta Damie Crypto Service.",
      "page.join.title": "Juntar-se",
      "page.join.sub": "Registo via link de indicação.",
      "lang.title": "Idioma da aplicação",
      "lang.label": "Idioma",
      "lang.current": "Idioma atual",
      "lang.save": "Guardar",
      "lang.saved.fr": "Langue enregistrée : Français. L'interface est mise à jour.",
      "lang.saved.en": "Language saved: English. The interface has been updated.",
      "lang.saved.pt": "Idioma guardado: Português. A interface foi atualizada.",
      "lang.saved.ar": "تم حفظ اللغة: العربية. تم تحديث الواجهة."
    },
    ar: {
      "brand.tagline": "تأمين · تبادل · تعلّم · ازدهار",
      "nav.home": "الرئيسية",
      "nav.markets": "الأسواق",
      "nav.wallet": "المحفظة",
      "nav.swap": "المبادلة",
      "nav.transfer": "التحويل",
      "nav.marketplace": "السوق",
      "nav.referral": "الإحالة",
      "nav.profile": "الملف",
      "nav.academy": "الأكاديمية",
      "nav.learning": "التعلّم",
      "nav.community": "المجتمع",
      "nav.contact": "اتصل بنا",
      "nav.menu": "القائمة",
      "footer.blurb":
        "جعل Pi والأصول الرقمية في متناول أفريقيا — معاملات ومدفوعات وتعليم البلوكشين.",
      "footer.services": "الخدمات",
      "footer.learn": "تعلّم",
      "footer.dcs": "DCS",
      "footer.mission": "المهمة والرؤية",
      "footer.founder": "المؤسسة",
      "footer.copy": "© 2026 Damie Crypto Service (DCS)",
      "footer.founderLine": "المؤسسة:",
      "index.hero.tagline":
        "المنصة التي تبسّط معاملات Pi وتعلّم العملات الرقمية والخدمات الرقمية في أفريقيا.",
      "index.cta.wallet": "فتح المحفظة",
      "index.cta.mission": "المهمة والرؤية",
      "index.pi.stable": "مستقر",
      "index.pi.sub": "مستقر · غير متقلب · DCS",
      "index.pi.value": "قيمة PI COIN",
      "index.pi.xof": "بـ XOF",
      "index.pi.xaf": "بـ XAF",
      "index.pi.vol": "الحجم",
      "index.stats.corridors": "الممرات",
      "index.mission.label": "المهمة",
      "index.mission.title": "مهمتنا",
      "index.mission.text":
        "جعل Pi والأصول الرقمية سهلة وآمنة في أفريقيا عبر منصة مبتكرة للمعاملات والمدفوعات وتعليم البلوكشين.",
      "index.vision.label": "الرؤية",
      "index.vision.title": "رؤيتنا",
      "index.vision.text":
        "أن نصبح المنصة المرجعية في أفريقيا لخدمات Pi والأصول الرقمية وتعليم البلوكشين، مع تعزيز الابتكار والشمول المالي والتحول الرقمي.",
      "index.founder.label": "المؤسسة",
      "index.markets.title": "الأسواق",
      "index.markets.sub": "PI COIN وفرنك CFA والعملات الرقمية — بدون تقلب على PI COIN",
      "index.tab.all": "الكل",
      "index.tab.other": "أخرى",
      "index.search": "ابحث عن PI أو XOF أو XAF…",
      "index.th.asset": "الأصل",
      "index.th.price": "السعر",
      "index.th.change": "٪ 24س",
      "index.th.volume": "الحجم",
      "index.th.trend": "الاتجاه",
      "index.modules.title": "وحدات DCS",
      "mod.wallet.title": "المحفظة",
      "mod.wallet.desc": "أرصدة متعددة وإيداع PI COIN.",
      "mod.swap.title": "المبادلة",
      "mod.swap.desc": "بدّل بين PI وXOF وXAF والعملات الرقمية.",
      "mod.transfer.title": "التحويل",
      "mod.transfer.desc": "أرسل إلى Mobile Money والبنوك.",
      "mod.market.title": "السوق",
      "mod.market.desc": "اشترِ وبِع بـ PI COIN.",
      "mod.ref.title": "الإحالة",
      "mod.ref.desc": "ادعُ واربح عبر 3 مستويات.",
      "mod.profile.title": "الملف وKYC",
      "mod.profile.desc": "صورة، بريد، 2FA، هاتف وأمان.",
      "mod.academy.title": "DCS Academy",
      "mod.academy.desc": "دورات تُدفع فقط بـ PI COIN.",
      "mod.community.title": "DCS Community",
      "mod.community.desc": "نقاشات وأسئلة وإعلانات.",
      "page.profil.title": "ملفي",
      "page.profil.sub": "الهوية، اللغة، KYC، الأمان، الدعم وتسجيل الخروج.",
      "page.wallet.title": "المحفظة",
      "page.wallet.sub": "الأرصدة وإيداع PI COIN والسجل.",
      "page.swap.title": "المبادلة",
      "page.swap.sub": "بدّل أصولك في ثوانٍ.",
      "page.transfer.title": "التحويل",
      "page.transfer.sub": "أرسل عبر أفريقيا عبر Mobile Money أو البنك.",
      "page.marketplace.title": "السوق",
      "page.marketplace.sub": "سلع وخدمات تُدفع بـ PI COIN.",
      "page.parrainage.title": "الإحالة",
      "page.parrainage.sub": "شبكتك وعمولاتك.",
      "page.academy.title": "الأكاديمية",
      "page.academy.sub": "تدريب في العملات الرقمية والبلوكشين.",
      "page.learning.title": "التعلّم",
      "page.learning.sub": "موارد للتقدم.",
      "page.community.title": "المجتمع",
      "page.community.sub": "تواصل مع مجتمع DCS.",
      "page.contact.title": "اتصل بنا",
      "page.contact.sub": "الدعم وبيانات DCS.",
      "page.signin.title": "تسجيل الدخول",
      "page.signin.sub": "ادخل إلى حسابك DCS.",
      "page.signup.title": "إنشاء حساب",
      "page.signup.sub": "أنشئ حساب Damie Crypto Service.",
      "page.join.title": "انضم",
      "page.join.sub": "التسجيل عبر رابط الإحالة.",
      "lang.title": "لغة التطبيق",
      "lang.label": "اللغة",
      "lang.current": "اللغة الحالية",
      "lang.save": "حفظ",
      "lang.saved.fr": "Langue enregistrée : Français. L'interface est mise à jour.",
      "lang.saved.en": "Language saved: English. The interface has been updated.",
      "lang.saved.pt": "Idioma guardado: Português. A interface foi atualizada.",
      "lang.saved.ar": "تم حفظ اللغة: العربية. تم تحديث الواجهة."
    }
  };

  var NAV_BY_HREF = [
    { test: /#markets/i, key: "nav.markets" },
    { test: /#vision/i, key: "footer.mission" },
    { test: /#fondatrice/i, key: "footer.founder" },
    { test: /(^|\/)index\.html$/i, key: "nav.home" },
    { test: /(^|\/)wallet\.html$/i, key: "nav.wallet" },
    { test: /(^|\/)swap\.html$/i, key: "nav.swap" },
    { test: /(^|\/)transfer\.html$/i, key: "nav.transfer" },
    { test: /(^|\/)marketplace\.html$/i, key: "nav.marketplace" },
    { test: /(^|\/)parrainage\.html$/i, key: "nav.referral" },
    { test: /(^|\/)profil\.html$/i, key: "nav.profile" },
    { test: /(^|\/)academy\.html$/i, key: "nav.academy" },
    { test: /(^|\/)learning\.html$/i, key: "nav.learning" },
    { test: /(^|\/)community\.html$/i, key: "nav.community" },
    { test: /(^|\/)contact\.html$/i, key: "nav.contact" }
  ];

  var PAGE_META = {
    "profil.html": { title: "page.profil.title", sub: "page.profil.sub" },
    "wallet.html": { title: "page.wallet.title", sub: "page.wallet.sub" },
    "swap.html": { title: "page.swap.title", sub: "page.swap.sub" },
    "transfer.html": { title: "page.transfer.title", sub: "page.transfer.sub" },
    "marketplace.html": { title: "page.marketplace.title", sub: "page.marketplace.sub" },
    "parrainage.html": { title: "page.parrainage.title", sub: "page.parrainage.sub" },
    "academy.html": { title: "page.academy.title", sub: "page.academy.sub" },
    "learning.html": { title: "page.learning.title", sub: "page.learning.sub" },
    "community.html": { title: "page.community.title", sub: "page.community.sub" },
    "contact.html": { title: "page.contact.title", sub: "page.contact.sub" },
    "signin.html": { title: "page.signin.title", sub: "page.signin.sub" },
    "signup.html": { title: "page.signup.title", sub: "page.signup.sub" },
    "join.html": { title: "page.join.title", sub: "page.join.sub" }
  };

  function pageName() {
    var p = (location.pathname || "").replace(/\/+$/, "");
    p = p.split("/").pop() || "index.html";
    p = p.split("?")[0].toLowerCase();
    if (!p || p === "/" || p === ".") return "index.html";
    if (!/\.html$/i.test(p)) p += ".html";
    return p;
  }

  function t(key, lang) {
    lang = lang || DCS.i18n.lang || "fr";
    var pack = DICT[lang] || DICT.fr;
    if (pack[key] != null) return pack[key];
    if (DICT.fr[key] != null) return DICT.fr[key];
    return key;
  }

  function setText(el, value) {
    if (!el || value == null) return;
    if (el.childElementCount > 0) {
      var marked = el.querySelector("[data-i18n-keep]");
      if (marked) {
        /* leave mixed nodes alone unless data-i18n-html */
        return;
      }
    }
    el.textContent = value;
  }

  function translateAttrNodes(lang) {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (!key) return;
      var val = t(key, lang);
      if (el.hasAttribute("data-i18n-html")) el.innerHTML = val;
      else setText(el, val);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      if (key) el.setAttribute("placeholder", t(key, lang));
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-aria");
      if (key) el.setAttribute("aria-label", t(key, lang));
    });
  }

  /* Ne jamais a.textContent = … : ça efface .nav-illust (icônes hamburger). */
  function setNavAnchorText(a, text) {
    var label = a.querySelector(".nav-label");
    if (label) {
      label.textContent = text;
      return;
    }
    if (a.querySelector(".nav-illust") || a.childElementCount > 0) {
      Array.prototype.forEach.call(a.childNodes, function (n) {
        if (n.nodeType === 3) a.removeChild(n);
      });
      label = document.createElement("span");
      label.className = "nav-label";
      label.textContent = text;
      a.appendChild(label);
      return;
    }
    a.textContent = text;
  }

  function translateNav(lang) {
    document.querySelectorAll("#main-nav a, .header-actions a, .footer-col a").forEach(function (a) {
      if (a.hasAttribute("data-i18n")) return;
      var href = (a.getAttribute("href") || "").split("?")[0];
      for (var i = 0; i < NAV_BY_HREF.length; i++) {
        if (NAV_BY_HREF[i].test.test(href)) {
          setNavAnchorText(a, t(NAV_BY_HREF[i].key, lang));
          return;
        }
      }
    });
  }

  function translateChrome(lang) {
    document.querySelectorAll(".brand-sub, .footer-brand .tag").forEach(function (el) {
      el.textContent = t("brand.tagline", lang);
    });
    document.querySelectorAll(".footer-brand > p:not(.founder-footer)").forEach(function (el) {
      if (!el.querySelector("strong") && !el.hasAttribute("data-leader-title")) {
        el.textContent = t("footer.blurb", lang);
      }
    });
    document.querySelectorAll(".footer-col h4").forEach(function (el, idx) {
      var keys = ["footer.services", "footer.learn", "footer.dcs"];
      if (keys[idx]) el.textContent = t(keys[idx], lang);
    });
    document.querySelectorAll(".footer-bottom span").forEach(function (el, idx) {
      if (idx === 0) el.textContent = t("footer.copy", lang);
    });
    document.querySelectorAll(".menu-toggle").forEach(function (el) {
      el.setAttribute("aria-label", t("nav.menu", lang));
    });
  }

  function titleWithAccent(text) {
    var parts = String(text || "")
      .trim()
      .split(/\s+/);
    if (!parts.length) return text;
    if (parts.length === 1) return "<span>" + parts[0] + "</span>";
    var last = parts.pop();
    return parts.join(" ") + " <span>" + last + "</span>";
  }

  function translatePageHero(lang) {
    var meta = PAGE_META[pageName()];
    if (!meta) return;
    var hero = document.querySelector(".page-hero");
    if (!hero) return;
    var h1 = hero.querySelector("h1");
    var p = hero.querySelector("p");
    if (h1 && !h1.hasAttribute("data-i18n") && !h1.querySelector("[data-brand-name]")) {
      h1.innerHTML = titleWithAccent(t(meta.title, lang));
    }
    if (p && !p.hasAttribute("data-i18n")) p.textContent = t(meta.sub, lang);
  }

  function translateIndex(lang) {
    if (pageName() !== "index.html") return;
    var map = [
      [".hero-tagline", "index.hero.tagline"],
      [".hero-ctas .btn-gold", "index.cta.wallet"],
      [".hero-ctas .btn-outline", "index.cta.mission"],
      [".pi-live", "index.pi.stable"],
      [".pi-pair small", "index.pi.sub"],
      ["#markets .section-head h2", "index.markets.title"],
      ["#markets .section-head p", "index.markets.sub"]
    ];
    map.forEach(function (pair) {
      document.querySelectorAll(pair[0]).forEach(function (el) {
        if (!el.hasAttribute("data-i18n")) el.textContent = t(pair[1], lang);
      });
    });
    var metaSpans = document.querySelectorAll(".pi-meta > div > span");
    var metaKeys = ["index.pi.value", "index.pi.xof", "index.pi.xaf", "index.pi.vol"];
    metaSpans.forEach(function (el, i) {
      if (metaKeys[i]) el.textContent = t(metaKeys[i], lang);
    });
    var stats = document.querySelectorAll(".stats-strip .stat-cell > span");
    if (stats[3]) stats[3].textContent = t("index.stats.corridors", lang);

    var blocks = document.querySelectorAll(".vision-block");
    if (blocks[0]) {
      var l0 = blocks[0].querySelector(".vision-label");
      var h0 = blocks[0].querySelector("h2");
      var t0 = blocks[0].querySelector(".vision-text");
      if (l0) l0.textContent = t("index.mission.label", lang);
      if (h0) h0.textContent = t("index.mission.title", lang);
      if (t0) t0.textContent = t("index.mission.text", lang);
    }
    if (blocks[1]) {
      var l1 = blocks[1].querySelector(".vision-label");
      var h1 = blocks[1].querySelector("h2");
      var t1 = blocks[1].querySelector(".vision-text");
      if (l1) l1.textContent = t("index.vision.label", lang);
      if (h1) h1.textContent = t("index.vision.title", lang);
      if (t1) t1.textContent = t("index.vision.text", lang);
    }
    var founderLabel = document.querySelector(".founder-block .vision-label");
    if (founderLabel) founderLabel.textContent = t("index.founder.label", lang);

    document.querySelectorAll(".tabs [data-tab]").forEach(function (btn) {
      var tab = btn.getAttribute("data-tab");
      if (tab === "all") btn.textContent = t("index.tab.all", lang);
      else if (tab === "gainers") btn.textContent = t("index.tab.other", lang);
    });
    var search = document.getElementById("market-search");
    if (search) search.placeholder = t("index.search", lang);
    var ths = document.querySelectorAll(".markets-table thead th");
    var thKeys = ["index.th.asset", "index.th.price", "index.th.change", "index.th.volume", "index.th.trend"];
    ths.forEach(function (th, i) {
      if (thKeys[i]) th.textContent = t(thKeys[i], lang);
    });

    var modulesHead = document.querySelector(".modules")
      ? document.querySelector(".modules") &&
        document.querySelector(".modules").previousElementSibling &&
        document.querySelector(".modules").previousElementSibling.querySelector("h2")
      : null;
    if (!modulesHead) {
      document.querySelectorAll(".section-head h2").forEach(function (el) {
        if (/Modules/i.test(el.textContent) || el.textContent.indexOf("DCS") >= 0 && /module/i.test(el.textContent)) {
          modulesHead = el;
        }
      });
    }
    /* Prefer explicit section near modules */
    document.querySelectorAll(".section-head h2").forEach(function (el) {
      var section = el.closest(".section, .container, div");
      if (section && section.querySelector(".modules")) modulesHead = el;
    });
    if (modulesHead) modulesHead.textContent = t("index.modules.title", lang);
    /* modules titles from FR text fallbacks */
    var modMap = {
      "wallet.html": ["mod.wallet.title", "mod.wallet.desc"],
      "swap.html": ["mod.swap.title", "mod.swap.desc"],
      "transfer.html": ["mod.transfer.title", "mod.transfer.desc"],
      "marketplace.html": ["mod.market.title", "mod.market.desc"],
      "parrainage.html": ["mod.ref.title", "mod.ref.desc"],
      "profil.html": ["mod.profile.title", "mod.profile.desc"],
      "academy.html": ["mod.academy.title", "mod.academy.desc"],
      "community.html": ["mod.community.title", "mod.community.desc"]
    };
    document.querySelectorAll("a.module-link").forEach(function (a) {
      var href = (a.getAttribute("href") || "").split("?")[0].toLowerCase();
      var keys = modMap[href];
      if (!keys) return;
      var h3 = a.querySelector("h3");
      var p = a.querySelector("p");
      if (h3) h3.textContent = t(keys[0], lang);
      if (p) p.textContent = t(keys[1], lang);
    });
  }

  function translateLangPanel(lang) {
    var panel = document.getElementById("profile-language");
    if (!panel) return;
    var h3 = panel.querySelector("h3");
    var label = panel.querySelector('label[for="app-language"]');
    var current = document.getElementById("lang-current-label");
    var save = document.getElementById("save-language");
    if (h3) h3.textContent = t("lang.title", lang);
    if (label) label.textContent = t("lang.label", lang);
    if (current) current.textContent = t("lang.current", lang);
    if (save) save.textContent = t("lang.save", lang);
  }

  function apply(lang) {
    if (!DICT[lang]) lang = "fr";
    DCS.i18n.lang = lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    translateAttrNodes(lang);
    translateNav(lang);
    translateChrome(lang);
    translatePageHero(lang);
    translateIndex(lang);
    translateLangPanel(lang);
    return lang;
  }

  DCS.i18n = {
    lang: "fr",
    labels: LABELS,
    dict: DICT,
    t: t,
    apply: apply,
    savedMessage: function (lang) {
      return t("lang.saved." + (DICT[lang] ? lang : "fr"), lang);
    }
  };
})(typeof window !== "undefined" ? window : this);
