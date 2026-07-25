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
    mainAriaLabel: "Main",
    homeAriaLabel: "TowardPCC home",
    skipToContent: "Skip to content",
  },

  footer: {
    pillarsHeading: "Platform",
    siteHeading: "Site",
    navAriaLabel: "Footer",
    residency: "Servers located in Saudi Arabia",
    orgName: "Toward Pediatric Critical Care",
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
      "The mission, story, and honest roadmap of TowardPCC — built from Saudi Arabia for the pediatric critical care community worldwide.",
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
    pendingNote:
      "This is a plain-language summary, not the final legal privacy policy. The full policy — reviewed by counsel — is published before launch.",
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
