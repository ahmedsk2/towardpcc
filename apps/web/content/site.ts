/**
 * Every user-visible string lives here (PRD §6.2) — one reviewable layer,
 * and the dormant i18n scaffold (§12: Arabic later is additive).
 * Voice: confident, precise, humane; sentence case; active voice; no hype.
 */
export const site = {
  name: "TowardPCC",
  tagline: "The digital home of pediatric critical care",
  metaTitle: "TowardPCC · the digital home of pediatric critical care",
  description:
    "Free clinical calculators, knowledge and data systems, and research support for the pediatric critical care community. Built from Saudi Arabia for the world.",

  nav: {
    calculators: "Calculators",
    knowledge: "Knowledge",
    data: "Data",
    services: "Services",
    about: "About",
    contact: "Contact",
    menuLabel: "Menu",
    closeMenuLabel: "Close menu",
    mainAriaLabel: "Main",
    homeAriaLabel: "TowardPCC home",
    skipToContent: "Skip to content",
    headerCta: "Open the calculators",
    calculatorsMenuIntro: "Every score cites its published source and computes in your browser.",
    browseAll: "Browse all",
    backToTop: "Back to top",
    breadcrumbAriaLabel: "Breadcrumb",
    breadcrumbHome: "Home",
  },

  utility: {
    email: "info@towardpcc.com",
    emailLabel: "Email TowardPCC",
    residency: "Servers in Saudi Arabia",
    followLabel: "Follow",
    linkedin: "https://www.linkedin.com/in/ahmed-s-alkhalifah/",
    linkedinLabel: "TowardPCC on LinkedIn",
  },

  footer: {
    pillarsHeading: "Platform",
    siteHeading: "Site",
    legalHeading: "Legal",
    navAriaLabel: "Footer",
    residency: "Servers located in Saudi Arabia",
    orgName: "Toward Pediatric Critical Care",
    // The founder-approved vision sentence (PRD §6.2), previously unused.
    vision:
      "Every child in critical care benefits from the same knowledge and tools, no matter where their PICU is.",
    legalLinks: [
      { href: "/legal/data-protection", label: "How we handle data" },
      { href: "/legal/terms", label: "Terms of use" },
      { href: "/legal/disclaimer", label: "Medical disclaimer" },
    ],
  },

  home: {
    heading: "Every child. Every PICU. The same tools.",
    lede: "Free, referenced clinical calculators for pediatric critical care, with knowledge and data systems for every unit and research support for every investigator. Built from Saudi Arabia for the world.",
    promise:
      "Free, referenced clinical calculators that run entirely in your browser — the start of a shared digital home for pediatric critical care.",
    ctaPrimary: "Explore the calculators",
    ctaSecondary: "Request a Knowledge pilot",
    heroSceneLabel: "A calm, breathing respiratory waveform — the signature of TowardPCC.",
    status: "In development. Launching soon.",
    pillarsHeading: "What we are building",
    trust: {
      heading: "How we handle data",
      points: [
        "The calculators run entirely in your browser. Nothing you enter is transmitted or stored.",
        "Our servers are located in Saudi Arabia.",
        "We collect the minimum needed to run the service — and never patient data.",
      ],
      link: "Read how we handle data",
      href: "/legal/data-protection",
    },
    // Hero eyebrow — reflects the live registry count, not a marketing claim.
    badge: "Live now · 22 referenced calculators",
    heroTrust: [
      { value: "22", label: "Calculators live" },
      { value: "89", label: "Cited references" },
      { value: "0", label: "Bytes transmitted" },
    ],
    // Four-up strip beneath the hero.
    features: [
      {
        title: "Referenced",
        body: "89 citations with PMID and DOI. Never a number without a reason.",
        tone: "crimson" as const,
      },
      {
        title: "Private by design",
        body: "Computed in your browser. Nothing you type is ever transmitted.",
        tone: "coral" as const,
      },
      {
        title: "Bedside-ready",
        body: "Installable, works offline, one-handed on a phone at 3am.",
        tone: "plum" as const,
      },
      {
        title: "Honest status",
        body: "Live, piloting or planned — we say which, always.",
        tone: "moss" as const,
      },
    ],
    /**
     * Counters. Every figure is verified against the repo:
     * 22 registered scores, 89 citation entries across their definitions,
     * 64,388 pages indexed in the PedsCC Library corpus, 100% engine coverage
     * enforced in CI. Nothing here is estimated — if a number cannot be
     * sourced it is removed, not guessed.
     */
    countersHeading: "What is actually built",
    counters: [
      { value: 22, label: "Referenced calculators" },
      { value: 89, label: "Literature citations" },
      { value: 64388, label: "Library pages indexed" },
      { value: 100, suffix: "%", label: "Engine test coverage" },
    ] as { value: number; label: string; suffix?: string }[],
    /**
     * Replaces the testimonial slot the reference sites use. These are real,
     * checkable citations — the honest form of social proof for a clinical
     * audience, and the one the authenticity rule permits.
     */
    evidence: {
      eyebrow: "Why this exists",
      heading: "We don't have testimonials. We have the literature.",
      lede: "Every claim we make about the problem is something published that you can check.",
      items: [
        {
          quote:
            "Clinicians budget roughly two to three minutes to answer a clinical question — and abandon the search beyond it.",
          source: "Del Fiol et al. JAMA Intern Med, 2014 — systematic review of 72 studies",
        },
        {
          quote:
            "Clinicians raise about one question for every two patients, but pursue only around half of them.",
          source: "Del Fiol et al. 2014 · Kell et al. JAMIA, 2024",
        },
        {
          quote:
            "59% of 292 surveyed clinicians had received no formal training in searching the literature.",
          source: "Brassil et al. J Med Libr Assoc, 2017",
        },
        {
          quote:
            "Clinicians value a local “our practice” stance that breaks the tie between conflicting guidelines.",
          source: "Baxter et al. Appl Clin Inform, 2022",
        },
        {
          quote:
            "A locally-curated guideline app reached 91 of 152 NHS acute trusts — trust followed local curation.",
          source: "MicroGuide, reported deployment figures",
        },
      ],
    },
    founder: {
      eyebrow: "Who builds this",
      name: "Dr. Ahmed Alkhalifah",
      role: "Pediatric intensivist",
      body: "TowardPCC grew out of the everyday problem of needing a referenced number, a unit protocol, or a statistical answer faster than the ward gives you time for.",
      credentials: [
        "MBBS / MD",
        "Saudi Board — Pediatric Medicine",
        "Fellowship — Pediatric Critical Care",
        "Fellowship — Pediatric Neurocritical Care",
      ],
      publications:
        "Published in PLOS ONE on personalising mechanical power to reduce ICU mortality, and in Open Access Emergency Medicine on machine learning for pediatric triage.",
    },
    ctaBand: {
      heading: "Start with a calculator. Stay for the rest.",
      body: "Free, referenced and offline-ready. No account, no tracking, nothing to install unless you want to.",
      cta: "Open the calculators",
    },
    missionHeading: "Why we are building this",
    mission:
      "TowardPCC builds the digital backbone of pediatric critical care: free calculators for every clinician, knowledge and data systems for every unit, and research support for every investigator. Starting in Saudi Arabia and the Gulf, built for the world.",
    roadmap: {
      heading: "Where we are, honestly",
      columns: [
        {
          state: "Live now",
          items: ["22 referenced PICU calculators", "Offline-capable, installable as an app"],
        },
        {
          state: "Piloting",
          items: ["The PedsCC Library for PICU teams", "Document management, not content"],
        },
        {
          state: "Next",
          items: ["The Gulf and MENA PICU registry", "Free research and biostatistics support"],
        },
      ],
    },
  },

  pillars: {
    calculators: {
      title: "Calculators",
      status: "in development",
      description:
        "Free, clinically referenced PICU scoring calculators. Every computation runs in your browser; every score cites its published source; validation status is always shown honestly.",
    },
    knowledge: {
      title: "Knowledge",
      status: "in pilot",
      description:
        "The PedsCC Library: a purpose-built library and document management platform for PICU teams. Your unit's documents remain your unit's documents; we pilot the software, not the content.",
    },
    data: {
      title: "Data",
      status: "in design",
      description:
        "The future Gulf and MENA PICU registry and unit dashboards, built on the same validated scoring engine as the public calculators. No patient data is collected in this version.",
    },
    services: {
      title: "Research services",
      status: "free · capacity-based",
      description:
        "Research aid, biostatistics analysis, and AI-assisted research guidance for fellows and investigators. Provided free of charge by the TowardPCC team, subject to availability and capacity; requests are queued and answered as bandwidth allows.",
    },
  },

  about: {
    title: "About",
    heading: "About TowardPCC",
    status: "in development",
    description:
      "TowardPCC builds the digital backbone of pediatric critical care: free clinical calculators for every clinician, knowledge and data systems for every unit, and research support for every investigator. Starting in Saudi Arabia and the Gulf, built for the world.",
    metaDescription:
      "The mission, principles, and honest roadmap of TowardPCC — built from Saudi Arabia for the pediatric critical care community worldwide.",
    principlesHeading: "How we build",
    principles: [
      {
        title: "Free and referenced",
        body: "The calculators are free to use, and every score cites its published source with its validation status shown honestly — never a number without a reason.",
      },
      {
        title: "Privacy by design",
        body: "The calculators compute entirely in your browser; nothing you enter is transmitted or stored. We collect the minimum needed to run the service, and never patient data.",
      },
      {
        title: "Honest about where we are",
        body: "We say plainly what is live, what is piloting, and what is still to come. No fake logos, counters, or testimonials — ever.",
      },
      {
        title: "Built from Saudi Arabia, for everyone",
        body: "Servers are located in Saudi Arabia and the work starts in the Gulf, but the tools are for every child and every PICU, anywhere.",
      },
    ],
    roadmapHeading: "Where we are, honestly",
  },

  contactPage: {
    title: "Contact",
    heading: "Contact",
    lede: "Questions, feedback, or a correction on a calculator? Send a message and we'll reply by email. You can also reach us directly.",
    emailLabel: "Or email us at",
    email: "info@towardpcc.com",
    metaDescription: "Reach the TowardPCC team — a message form and direct email.",
  },

  stub: {
    notice:
      "This section is being built right now. What you read above is the real scope; nothing here is final marketing.",
  },

  pillarPages: {
    services: {
      formHeading: "Request research support",
      body: [
        "We help with study design, analysis planning, biostatistics, and interpretation — not with individual patient care. Work is provided free of charge, subject to availability, and requests are answered in order of arrival and complexity.",
        "Describe the question, not the patient: please do not include any patient-identifiable information in your request.",
      ],
    },
    knowledge: {
      formHeading: "Request a pilot",
      body: [
        "The PedsCC Library is a self-hosted, invitation-only library that makes a unit's own protocols, guidelines, and slide decks fully searchable — down to the exact page — with a governed contribute-and-review workflow and locally-authored “our unit's approach” notes.",
        "We pilot the software; each unit brings, owns, and can export its own content at any time. It has been validated on a real, multi-thousand-document collection and is offered as a pilot to interested PICU teams.",
      ],
    },
    data: {
      formHeading: "Register your interest",
      body: [
        "The future Gulf and MENA PICU registry and unit dashboards will be built on the same validated scoring engine as the public calculators. This version collects no patient data — we are gauging interest and shaping governance with prospective participating units.",
        "Servers are located in Saudi Arabia. For the registry itself, deployments will be configured to meet the data-protection requirements of each participating Gulf country — data residency, consent, and governance — in coordination with each institution.",
      ],
    },
  },

  forms: {
    sending: "Sending…",
    noPatientData: "Please do not include any patient-identifiable information.",
    policyLinkText: "how we handle data",
    contact: {
      submitLabel: "Send message",
      fields: [
        { name: "name", label: "Your name", autoComplete: "name" },
        { name: "email", label: "Email", type: "email", autoComplete: "email" },
        { name: "message", label: "Message", type: "textarea" },
      ],
      privacyLine:
        "We collect your name, email, and message only to reply. Stored on our servers in Saudi Arabia, kept up to 24 months, never used for tracking.",
      successTitle: "Message sent",
      successBody: "Thank you — we've received your message and will reply by email.",
    },
    service: {
      submitLabel: "Request research support",
      fields: [
        { name: "name", label: "Your name", autoComplete: "name" },
        { name: "email", label: "Email", type: "email", autoComplete: "email" },
        { name: "affiliation", label: "Affiliation or unit", autoComplete: "organization" },
        {
          name: "message",
          label: "What would you like help with?",
          type: "textarea",
        },
      ],
      privacyLine:
        "We collect your name, email, affiliation, and request to scope the work. No patient-identifiable data — describe the question, not the patient. Stored in Saudi Arabia, kept up to 24 months.",
      successTitle: "Request received",
      successBody:
        "Thank you — your request is queued. We'll reply by email as capacity allows. Requests are answered in order of arrival and complexity.",
    },
    knowledge: {
      submitLabel: "Request a pilot",
      fields: [
        { name: "name", label: "Your name", autoComplete: "name" },
        { name: "email", label: "Email", type: "email", autoComplete: "email" },
        { name: "unit", label: "PICU / unit name", autoComplete: "organization" },
        { name: "country", label: "Country", autoComplete: "country-name" },
        {
          name: "message",
          label: "Tell us about your unit and what you're hoping for",
          type: "textarea",
        },
      ],
      privacyLine:
        "We collect your name, email, unit, and country to arrange the pilot. Your unit's documents always remain yours. Stored in Saudi Arabia, kept up to 24 months.",
      successTitle: "Pilot request received",
      successBody:
        "Thank you — we've received your interest in the PedsCC Library pilot and will follow up by email to discuss next steps.",
    },
    data: {
      submitLabel: "Register interest",
      fields: [
        { name: "name", label: "Your name", autoComplete: "name" },
        { name: "email", label: "Email", type: "email", autoComplete: "email" },
        { name: "institution", label: "Institution", autoComplete: "organization" },
        { name: "country", label: "Country", autoComplete: "country-name" },
        {
          name: "message",
          label: "What interests you about the registry?",
          type: "textarea",
        },
      ],
      privacyLine:
        "We collect your name, email, institution, and country to gauge registry interest. No patient data is collected in this version. Stored in Saudi Arabia, kept up to 24 months.",
      successTitle: "Interest registered",
      successBody:
        "Thank you — we've noted your interest in the future PICU registry and will keep you posted as it takes shape.",
    },
  },

  dataProtection: {
    title: "How we handle data",
    heading: "How we handle data",
    metaDescription:
      "TowardPCC's data-handling approach: client-side calculators, servers in Saudi Arabia, and minimal collection — never patient data.",
    lede: "Privacy is designed into TowardPCC, not bolted on. This page states plainly what happens to data today; the full legal privacy policy lands before public launch.",
    sections: [
      {
        heading: "The calculators never send your inputs anywhere",
        body: "Every calculation runs entirely in your browser. The values you type — a weight, a blood gas, a score — are computed on your own device and are never transmitted to us or stored on any server. You can confirm this: the calculators keep working with the network switched off.",
      },
      {
        heading: "No patient data is collected",
        body: "TowardPCC is not a medical record and does not ask for, receive, or store patient-identifiable information. Please do not enter names, medical record numbers, or other identifiers into any field.",
      },
      {
        heading: "Our servers are in Saudi Arabia",
        body: "The site is hosted on infrastructure located in Saudi Arabia. Where the platform needs to store anything at all — for example, a pilot request you choose to send us — it stays within that hosting.",
      },
      {
        heading: "We collect the minimum to run the service",
        body: "We keep data collection to what is genuinely needed to operate the site securely and reliably. Any analytics we use are privacy-respecting and do not build advertising profiles. When forms arrive, they will collect only what a request requires, and we will say so at the point of collection.",
      },
    ],
    collection: {
      heading: "What we collect, per feature, and why",
      intro:
        "This table is the honest, complete picture of what each part of the site collects today. Where a feature collects nothing, we say so.",
      columns: ["Feature", "What we collect", "Why", "Kept for"],
      rows: [
        ["Calculators", "Nothing", "They compute in your browser", "—"],
        [
          "Contact / pilot / interest / research forms",
          "Your name, email, and what you wrote; a salted, truncated hash of your IP",
          "To reply, and to limit abuse of the forms",
          "24 months, then deleted",
        ],
        [
          "Analytics",
          "Privacy-respecting, cookie-less page counts (no personal profiles)",
          "To understand which tools are used",
          "Aggregated",
        ],
        [
          "Admin access logs",
          "Actions taken by our operators (an audit trail)",
          "Security and accountability",
          "12 months",
        ],
      ],
    },
    security: {
      heading: "How we protect it",
      points: [
        "Encryption in transit (TLS) and at rest for the database.",
        "Administrator access requires a password and a second factor (TOTP), with lockout on repeated failures.",
        "An append-only audit log records administrative actions.",
        "Automated, encrypted backups with a tested restore procedure.",
      ],
    },
    residencyHeading: "Where your data lives",
    // §8.3 approved wording — used in spirit; overclaiming is prohibited.
    residencyBody:
      "TowardPCC is hosted on servers located in Saudi Arabia and operates in alignment with the Saudi Personal Data Protection Law (PDPL). For the upcoming PICU registry, deployments will be configured to comply with the data-protection requirements of each participating Gulf country — including data-residency, consent, and governance requirements — in coordination with each institution.",
    subProcessorsHeading: "Who else touches the data",
    subProcessorsBody:
      "We keep third parties to the minimum. Today the only sub-processors are our hosting provider (in Saudi Arabia) and our email delivery for form replies. We list the real ones here and update this page if that changes; we do not use advertising or profiling third parties.",
    deletionHeading: "Access, correction, and deletion",
    deletionBody:
      "You can ask us what we hold about you, correct it, or have it deleted, at any time — email us and we will act on it. Calculator use leaves nothing to delete.",
    contactLabel: "Email",
    contactEmail: "info@towardpcc.com",
    // TODO(counsel-review): full privacy policy pending counsel review before
    // launch — tracked in LAUNCH-BLOCKERS.md (kept out of the shipped copy).
    pendingNote:
      "This is a plain-language summary written for clinicians and IT departments — not the final legal privacy policy. The full policy receives a counsel review before public launch.",
  },

  terms: {
    title: "Terms of use",
    heading: "Terms of use",
    metaDescription: "The terms for using TowardPCC's clinical calculators and services.",
    lede: "Plain-English terms for using TowardPCC. This is a summary pending a counsel review before launch.",
    sections: [
      {
        heading: "For qualified health professionals",
        body: "TowardPCC's calculators and content are provided as an informational and educational aid for qualified health professionals. They support clinical judgment and do not replace it. Verify every result independently before making any clinical decision. Nothing here is a medical device.",
      },
      {
        heading: "No warranty",
        body: "The service is provided “as is”, without warranties of any kind. While we work hard to cite sources and validate our scores, we cannot guarantee the site is error-free or continuously available, and we are not liable for decisions made using it.",
      },
      {
        heading: "Acceptable use",
        body: "Use the service lawfully and do not attempt to disrupt it, submit others' personal data without a basis, or enter patient-identifiable information into any field. Do not misrepresent the service or scrape it in ways that degrade it for others.",
      },
      {
        heading: "Free to use",
        body: "The public calculators are free. Knowledge, data, and research services are offered subject to availability and capacity, and may change as the platform develops. We will be clear about what is live, piloting, or planned.",
      },
      {
        heading: "Changes",
        body: "We may update these terms as the platform grows. Material changes will be reflected here with a revised date.",
      },
    ],
    // TODO(counsel-review): terms pending counsel review before launch —
    // tracked in LAUNCH-BLOCKERS.md (kept out of the shipped copy).
    pendingNote: "Summary terms pending a counsel review before public launch.",
  },

  disclaimer: {
    title: "Medical disclaimer",
    heading: "Medical disclaimer",
    metaDescription:
      "TowardPCC is an informational and educational aid for qualified health professionals — not a medical device, and not a substitute for clinical judgment.",
    lede: "The same disclaimer summarized on every calculator, in full.",
    sections: [
      {
        heading: "An aid to judgment, not a replacement for it",
        body: "TowardPCC's calculators and content are for use by qualified health professionals as an informational and educational aid. They support clinical judgment; they do not replace it. The responsibility for any clinical decision remains entirely with the treating clinician.",
      },
      {
        heading: "Verify every result",
        body: "Always verify a computed result independently before acting on it. Scores and formulas can be misapplied, inputs mistyped, and published cut-offs debated; treat every number as a prompt to think, not an instruction.",
      },
      {
        heading: "Not a medical device",
        body: "TowardPCC is not a medical device and has not been cleared or certified as one by any regulator. It does not diagnose, treat, or prescribe.",
      },
      {
        heading: "Validation is shown honestly",
        body: "Each calculator shows its validation status plainly. Where independent clinical validators have not yet been named, the badge says so — “Independent clinical validation: pending” — rather than implying an endorsement that does not exist.",
      },
      {
        heading: "No patient-identifiable data",
        body: "Do not enter patient names, medical record numbers, or other identifiers. The calculators compute in your browser and send nothing; the forms are for administrative contact only.",
      },
    ],
  },

  pwa: {
    offline: "You're offline — the calculators still work.",
    updateReady: "A new version is available.",
    updateAction: "Update",
    installTitle: "Install",
    installHeading: "Install TowardPCC on your device",
    installLede:
      "Install the calculators as an app for one-tap access and full offline use at the bedside. Nothing you enter is ever transmitted or stored.",
    installIosHeading: "iPhone and iPad (Safari)",
    installIosSteps: [
      "Open towardpcc.com in Safari.",
      "Tap the Share button (the square with an upward arrow).",
      "Choose “Add to Home Screen”, then tap Add.",
    ],
    installAndroidHeading: "Android (Chrome)",
    installAndroidSteps: [
      "Open towardpcc.com in Chrome.",
      "Tap the menu (three dots) in the top right.",
      "Choose “Install app” or “Add to Home screen”.",
    ],
    installDesktopHeading: "Desktop (Chrome or Edge)",
    installDesktopSteps: [
      "Open towardpcc.com.",
      "Click the install icon in the address bar, or use the browser menu’s “Install” option.",
    ],
    offlineNote:
      "Once installed and opened online at least once, the entire calculator catalogue works with no connection.",
  },

  calculators: {
    indexTitle: "Calculators",
    indexHeading: "PICU calculators",
    indexLede:
      "Free, clinically referenced pediatric critical care scores. Every calculation runs in your browser and cites its published source.",
    searchPlaceholder: "Search calculators",
    searchLabel: "Search calculators by name",
    noResults: "No calculators match your search.",
    noFavorites: "You have not starred any calculators yet.",
    filterGroupLabel: "Filter calculators by category",
    filterAll: "All",
    filterFavorites: "Favorites",
    addFavorite: "Add to favorites:",
    removeFavorite: "Remove from favorites:",
    favoritesNote:
      "Favorites are saved in this browser only — never transmitted or stored on a server.",
    categoryLabels: {
      "mortality-severity": "Mortality and severity",
      "organ-dysfunction": "Organ dysfunction",
      sepsis: "Sepsis",
      respiratory: "Respiratory",
      "sedation-analgesia-withdrawal": "Sedation, analgesia, and withdrawal",
      "fluids-resuscitation": "Fluids and resuscitation",
      "airway-equipment": "Airway and equipment",
      "renal-metabolic": "Renal and metabolic",
      general: "General",
    },
    // Detail page
    backToIndex: "All calculators",
    resultHeading: "Result",
    resultPlaceholder: "Enter values to compute.",
    interpretationLabel: "Interpretation",
    // Shown for additive composites (pSOFA, Phoenix, VIS) where a blank
    // component is scored as normal, so a partial entry is never mistaken
    // for a genuinely low score (PRD §6.4 honest partial-result cue).
    partialResultNote:
      "Components left blank are scored as normal. Enter every component that applies for a complete score.",
    copyResult: "Copy result summary",
    copied: "Copied",
    printLabel: "Print",
    unitLabel: "Unit",
    // Privacy line — must be architecturally true (PRD §6.4)
    privacyLine:
      "Calculations run entirely in your browser. Nothing you enter is transmitted or stored.",
    // Validation badge (PRD §6.4 — honest pending state)
    validationPending: "Independent clinical validation: pending",
    validationPendingDetail:
      "Two independent clinical validators will be named here once review is complete.",
    validatedByPrefix: "Validated by",
    formulaHeading: "How it is calculated",
    referencesHeading: "References",
    versionHeading: "Version and changelog",
    limitationsHeading: "Limitations and notes",
    acceptedRangesHeading: "Accepted input ranges",
    disclaimerHeading: "Important",
    // Medical disclaimer summary on every calculator (PRD §6.6)
    disclaimer:
      "For use by qualified health professionals as an informational and educational aid. It supports clinical judgment and does not replace it. Verify every result independently before making a clinical decision. This is not a medical device.",
    validatorSlotEmpty: "Validator slot open",
  },

  errors: {
    notFound: {
      metaTitle: "Page not found",
      code: "404",
      heading: "This page does not exist",
      body: "The address may have changed or never existed. The pages below are real.",
      homeLink: "Go to the home page",
    },
    serverError: {
      heading: "Something went wrong on our side",
      body: "Try again. If it keeps happening, let us know on the contact page.",
      retry: "Try again",
      contactLink: "Go to the contact page",
    },
  },
} as const;
