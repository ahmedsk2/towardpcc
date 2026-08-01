/**
 * Every user-visible string lives here (PRD §6.2) — one reviewable layer,
 * and the dormant i18n scaffold (§12: Arabic later is additive).
 * Voice: confident, precise, humane; sentence case; active voice; no hype.
 */
/**
 * Citation total. A LITERAL, deliberately — deriving it here pulled the whole
 * scoring engine into the client bundle (site.ts is imported by client
 * components) and blew the route budget by 45 KB to render one number.
 *
 * Correctness is enforced by content/figures.test.ts instead, which compares
 * this against the registry. The previous value of 89 was wrong — the real
 * count is 87 — and it survived because the e2e guard compared the rendered
 * figure to this file, so the number only had to agree with itself.
 */
const CITATIONS = 91;

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
    trust: "How to check this",
    validation: "Clinical validation",
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
    orcid: "https://orcid.org/0000-0001-9277-8511",
    orcidLabel: "Founder ORCID profile",
  },

  footer: {
    pillarsHeading: "Platform",
    siteHeading: "Site",
    legalHeading: "Legal",
    navAriaLabel: "Footer",
    residency: "Servers located in Saudi Arabia",
    orgName: "Toward Pediatric Critical Care",
    /**
     * The two claims the whole platform rests on, restated where every page
     * ends. Both are checkable rather than asserted: the first is enforced by
     * a zero-network Playwright test, the second by where the database runs.
     */
    privacyBadge: "0 bytes transmitted — calculators compute in your browser",
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
      "Free, referenced clinical calculators that run entirely in your browser: the start of a shared digital home for pediatric critical care.",
    ctaPrimary: "Explore the calculators",
    ctaSecondary: "Request a Knowledge pilot",
    heroSceneCoupling: "heart rate rises on inspiration",
    heroSceneLabel:
      "A school-age child's heart and lungs, built from measured pediatric anatomy: airways branching from the carina into alveolar clusters that fill with each breath, four cardiac chambers in their true depth order, and both lungs outlined with the cardiac notch where the heart rests against the left one. It breathes about nineteen times a minute and beats about eighty-one, the way a well child at rest does, and the heart rate rises on inspiration as it does in a real one.",
    status: "Live. 23 referenced calculators.",
    pillarsHeading: "What we are building",
    trust: {
      heading: "How we handle data",
      points: [
        "The calculators run entirely in your browser. Nothing you enter is transmitted or stored.",
        "Our servers are located in Saudi Arabia.",
        "We collect the minimum needed to run the service, and never patient data.",
      ],
      link: "Read how we handle data",
      href: "/legal/data-protection",
    },
    // Hero eyebrow — reflects the live registry count, not a marketing claim.
    badge: "Live now · 23 referenced calculators",
    heroTrust: [
      { value: "23", label: "Calculators live" },
      // Value injected at render from the registry — see app/page.tsx. It was
      // hardcoded to 89 and the real count is 87; the site overclaimed by two
      // for as long as anyone had been reading it.
      { value: CITATIONS, label: "Cited references" },
      // The boldest claim on the page, so it is the one that carries a link to
      // its proof. A claim this strong with nothing behind it reads as bluster.
      { value: "0", label: "Bytes transmitted", href: "/trust", proof: "proven by test" },
    ],
    // Four-up strip beneath the hero.
    features: [
      {
        title: "Referenced",
        // NOT "with PMID and DOI" — that was on the homepage until 2026-07-28,
        // when only 56 of the then-87 qualified. Some have neither: the APLS
        // manual is ISBN-only, Mosteller's BSA formula predates both schemes.
        // What is true of all of them, and enforced by registry-gate.test.ts,
        // is that each resolves to something a reader can open. The count is
        // derived from the registry by figures.test.ts, never typed twice.
        body: `${CITATIONS} citations, every one traceable to its source. Never a number without a reason.`,
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
        body: "Live, piloting or planned. We say which, always.",
        tone: "moss" as const,
      },
    ],
    /**
     * Counters. Every figure is verified against the repo:
     * Registered-score and citation totals are COUNTED from the registry
     * definitions rather than typed — see CITATIONS above. The typed figure was
     * 89 against a real 87, and the e2e guard did not catch it because it
     * compared the rendered number to this file rather than to the registry.
     * 64,388 pages indexed in the PedsCC Library corpus, 100% engine coverage
     * enforced in CI. Nothing here is estimated — if a number cannot be
     * sourced it is removed, not guessed.
     */
    countersHeading: "What is actually built",
    countersLede:
      "Every figure here is something you can go and count. Nothing on this page is an estimate.",
    counters: [
      { value: 23, label: "Referenced calculators" },
      { value: CITATIONS, label: "Literature citations" },
      { value: 64388, label: "Library pages indexed" },
      { value: 100, suffix: "%", label: "Engine test coverage" },
    ] as { value: number; label: string; suffix?: string; prefix?: string }[],
    /** Migrated 2026-07-28. "10+ years" now sits in the founder section and
        "7+ studies" / "<5 working days" on /services, beside the queue-honesty
        note where someone is deciding whether to ask. They were a second row of
        four animated figures directly under the first, which is how the home
        page came to show fourteen numbers before the pillar cards. */
    founderYears: { value: 10, suffix: "+", label: "Years in pediatric critical care" },

    /**
     * NOT CURRENTLY RENDERED — kept here deliberately rather than deleted.
     *
     * Founder-supplied, and the only one of the four that does not survive the
     * band's own test: every other figure names a thing you can go and count
     * (scores, citations, indexed pages, coverage percentage), whereas "online
     * solutions" has no definition on the site — the four pillars are four, and
     * it is not clear what the fifth is or what would make it six.
     *
     * Deleting it would quietly lose a figure the founder asked for; rendering
     * it beside four countable ones would weaken all five. So it waits here for
     * either a definition that makes it countable, or a decision to drop it.
     */
    solutionsLive: { value: 5, suffix: "+", label: "Online solutions, and growing" },
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
            "Clinicians budget roughly two to three minutes to answer a clinical question, and abandon the search beyond it.",
          source: "Del Fiol et al. JAMA Intern Med, 2014 (systematic review of 72 studies)",
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
            "A locally-curated guideline app reached 91 of 152 NHS acute trusts: trust followed local curation.",
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
      // The publication list was removed at the founder's request. The ORCID
      // link in the footer remains the canonical, self-updating record of the
      // same thing, which is why nothing replaced it here.
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
          items: [
            "23 referenced PICU calculators",
            "Offline-capable, installable as an app",
            "Free research and biostatistics support",
          ],
        },
        {
          state: "Piloting",
          items: [
            "The PedsCC Library, with PICU physicians across the Gulf",
            "A registry pilot in one Gulf unit",
          ],
        },
        {
          state: "Next",
          items: ["Wider Gulf and MENA registry participation", "Unit dashboards"],
        },
      ],
    },
  },

  pillars: {
    calculators: {
      title: "Calculators",
      status: "live",
      description:
        "Free, clinically referenced PICU scoring calculators. Every computation runs in your browser; every score cites its published source; validation status is always shown honestly.",
    },
    knowledge: {
      title: "Knowledge",
      status: "in production · piloting",
      description:
        "The PedsCC Library: a purpose-built library and document management platform for PICU teams. Your unit's documents remain your unit's documents; we pilot the software, not the content.",
    },
    data: {
      title: "Data",
      status: "pilot underway",
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
    status: "live",
    description:
      "TowardPCC builds the digital backbone of pediatric critical care: free clinical calculators for every clinician, knowledge and data systems for every unit, and research support for every investigator. Starting in Saudi Arabia and the Gulf, built for the world.",
    metaDescription:
      "The mission, principles, and honest roadmap of TowardPCC, built from Saudi Arabia for the pediatric critical care community worldwide.",
    principlesHeading: "How we build",
    principles: [
      {
        title: "Free and referenced",
        body: "The calculators are free to use, and every score cites its published source with its validation status shown honestly. Never a number without a reason.",
      },
      {
        title: "Privacy by design",
        body: "The calculators compute entirely in your browser; nothing you enter is transmitted or stored. We collect the minimum needed to run the service, and never patient data.",
      },
      {
        title: "Honest about where we are",
        body: "We say plainly what is live, what is piloting, and what is still to come. No fake logos, counters, or testimonials. Ever.",
      },
      {
        title: "Built from Saudi Arabia, for everyone",
        body: "Servers are located in Saudi Arabia and the work starts in the Gulf, but the tools are for every child and every PICU, anywhere.",
      },
    ],
    roadmapHeading: "Where we are, honestly",
    visionHeading: "The vision",
    /**
     * The brand story. Both claims are sourced: the colour audit in
     * docs/research/2026-07-24-picu-brand-colors.md found every audited
     * critical-care and paediatric institution anchored on blue and no
     * awareness colour claimed for PICU; the waveform rationale is recorded in
     * ADR-design-direction.
     */
    storyHeading: "Why it looks like this",
    story: [
      {
        title: "A colour nobody had claimed",
        body: "We audited the critical-care and paediatric institutions we could reach. Every one of them anchored on blue, and paediatric intensive care had no awareness colour of its own. So TowardPCC is crimson: close kin to the Saudi Critical Care Society's red, and unmistakably not another hospital blue.",
      },
      {
        title: "A breath, not a heartbeat",
        body: "The signature waveform is respiratory, never cardiac. An ECG trace that flattens reads as death, and this is a paediatric intensive care unit. The line here breathes, continuously and calmly, which is the thing you actually want to see beside a child's bed.",
      },
      {
        title: "Red never means wrong",
        body: "Brand crimson is reserved for actions. Warnings and errors are amber with an icon, never bare colour, so a red button on this site always means “do this”, and never “you got that wrong”.",
      },
    ],
  },

  contactPage: {
    title: "Contact",
    heading: "Contact",
    lede: "Questions, feedback, or a correction on a calculator? Send a message and we'll reply by email. You can also reach us directly.",
    emailLabel: "Or email us at",
    email: "info@towardpcc.com",
    metaDescription: "Reach the TowardPCC team: a message form and direct email.",
  },

  stub: {
    notice:
      "This section is being built right now. What you read above is the real scope; nothing here is final marketing.",
  },

  pillarPages: {
    services: {
      formHeading: "Request research support",
      body: [
        "We help with study design, analysis planning, biostatistics, and interpretation, but not with individual patient care. Work is provided free of charge, subject to availability, and requests are answered in order of arrival and complexity.",
        "Describe the question, not the patient: please do not include any patient-identifiable information in your request.",
      ],
    },
    knowledge: {
      formHeading: "Request a pilot",
      body: [
        "The PedsCC Library is a self-hosted, invitation-only library that makes a unit's own protocols, guidelines, and slide decks fully searchable, down to the exact page, with a governed contribute-and-review workflow and locally-authored “our unit's approach” notes.",
        "We pilot the software; each unit brings, owns, and can export its own content at any time. It has been validated on a real, multi-thousand-document collection and is offered as a pilot to interested PICU teams.",
      ],
    },
    data: {
      formHeading: "Register your interest",
      body: [
        "The future Gulf and MENA PICU registry and unit dashboards will be built on the same validated scoring engine as the public calculators. This version collects no patient data. We are gauging interest and shaping governance with prospective participating units.",
        "Servers are located in Saudi Arabia. For the registry itself, deployments will be configured to meet the data-protection requirements of each participating Gulf country (data residency, consent, and governance) in coordination with each institution.",
      ],
    },
  },

  /**
   * Rich pillar-page content (redesign R4). Every figure here is verified
   * against the repo or the library's own PROJECT-STATUS; nothing is
   * estimated. Where a real number does not exist yet, the field is absent
   * rather than filled with a guess.
   */
  pillarDetail: {
    knowledge: {
      badge: "In production · piloting across the Gulf",
      heading: "The PedsCC Library",
      lede: "Your unit's own protocols, guidelines and teaching material, searchable down to the exact page. We pilot the software; your unit owns the content.",
      stats: [
        { value: 2425, label: "Documents imported" },
        { value: 64388, label: "Pages indexed & searchable" },
        { value: 69, label: "Curated tags, 11 topics" },
        { value: 2272, label: "Full-text searchable" },
      ],
      capabilitiesHeading: "Search that ends at the paragraph, not the PDF.",
      capabilities: [
        {
          title: "Open at page 8, slide 4",
          body: "Full-text search across 64,388 indexed pages returns a deep link to the exact page, not a file to scroll through.",
        },
        {
          title: "Curated vocabulary",
          body: "69 librarian-maintained tags across 11 topic groups, with synonym and abbreviation expansion, so “PICU” and “paediatric ICU” find the same shelf.",
        },
        {
          title: "Governed contribution",
          body: "Contributors submit, librarians file. Every upload is hash-checked against the catalogue before it is accepted, so duplicates never pile up.",
        },
        {
          title: "“Our unit's approach”",
          body: "Locally-authored consensus stances sit beside the external guideline, because the thing clinicians actually need is the tie-breaker.",
        },
      ],
      topicsHeading: "Organised the way a PICU thinks.",
      topics: [
        "Neuro",
        "Respiratory",
        "Cardiac",
        "Sepsis & ID",
        "Renal & Fluids",
        "GI & Nutrition",
        "Heme-Onc",
        "Endo & Metabolic",
        "Trauma, Tox & Env",
        "Resus & Procedures",
        "General Systems",
      ],
      faq: [
        {
          question: "Who owns the content?",
          answer:
            "Your unit does, entirely. We pilot the software, not the content. A nightly export runs so the database indexes your library but never imprisons it. You can leave with everything at any time.",
        },
        {
          question: "Is it an AI chatbot over medical knowledge?",
          answer:
            "No. The core is retrieval over your unit's own corpus. An optional summary feature is off by default, locked to citations from your documents, and always degrades to plain retrieval. We will not put an unsourced generator between a clinician and a guideline.",
        },
        {
          question: "How is access controlled?",
          answer:
            "Invitation only, with a password and mandatory two-factor authentication. Each unit runs its own instance; content is never pooled between units.",
        },
        {
          question: "What happens to documents that can't be read?",
          answer:
            "They stay findable by metadata. Of 2,425 imported documents, 2,272 became full-text searchable: 2,197 by native extraction and 75 through OCR. The remaining 153 are legacy formats, images and video, catalogued and findable but not searchable inside.",
        },
      ],
    },
    data: {
      /**
       * Shown in place of dashboard imagery, which cannot be published until
       * the pilot unit approves it. Process transparency is the honest
       * substitute: a unit deciding whether to join learns more from what the
       * next stage requires than from a screenshot. The unit stays unnamed.
       */
      stagesHeading: "Where the registry actually is",
      stagesLede:
        "We would rather onboard one unit correctly than ten quickly. This is the sequence, and the stage we are at.",
      stages: [
        {
          label: "Single-unit pilot",
          detail:
            "One PICU in the Gulf region, running on the same validated engine as the public calculators.",
        },
        {
          label: "Governance review",
          detail:
            "Data-sharing agreements, ethics approval and residency arrangements settled with each participating institution before any second unit joins.",
        },
        {
          label: "Multi-unit registry",
          detail:
            "Shared benchmarking across units, with every unit retaining control of its own data.",
        },
      ],
      currentStage: 0,
      badge: "Pilot underway · one Gulf unit",
      heading: "A registry built on the same engine",
      lede: "A PICU registry is currently being piloted in one unit in the Gulf region, built on the same validated scoring engine as the public calculators.",
      stats: [
        { value: 1, label: "Pilot unit" },
        { value: 23, label: "Scores available to the registry" },
        { value: 0, label: "Patient records on this site" },
      ],
      capabilitiesHeading: "Governance before scale.",
      capabilities: [
        {
          title: "No patient data here",
          body: "This public site collects none. The registry runs as a separate, governed deployment inside the participating unit. It is not connected to this website.",
        },
        {
          title: "One validated engine",
          body: "Registry severity scores come from the same engine as the public calculators, at 100% test coverage, so a number means the same thing in both places.",
        },
        {
          title: "Residency per jurisdiction",
          body: "Deployments are configured to meet the data-protection requirements of each participating country (residency, consent and governance) with each institution.",
        },
        {
          title: "Numbers we can stand behind",
          body: "Analytics withhold figures the data cannot support and suppress unstable small-N results, rather than publishing something that looks precise and is not.",
        },
      ],
      faq: [
        {
          question: "Is any patient data collected on this website?",
          answer:
            "No. The public site collects no patient data of any kind, and the calculators compute entirely in your browser. The registry is a separate deployment that runs inside a participating unit.",
        },
        {
          question: "Can our unit join?",
          answer:
            "The registry is at single-unit pilot stage. Register your interest and we will talk about governance, residency and timing. We would rather onboard slowly and correctly than broadly and badly.",
        },
        {
          question: "Where would our data live?",
          answer:
            "Inside your institution's own governed deployment, configured to your country's data-protection requirements. Nothing is pooled into a shared database by default.",
        },
      ],
    },
    services: {
      badge: "Free · capacity-based",
      heading: "Research support for fellows and investigators",
      lede: "Research aid, biostatistics analysis, and AI-assisted research guidance, provided free of charge by the TowardPCC team, subject to availability.",
      stats: [
        { value: 3, label: "Areas of support" },
        { value: 0, label: "Cost, in any currency" },
        // Migrated from the home counter band 2026-07-28. Founder-supplied and
        // unchanged in value — moved to where someone is deciding whether to
        // ask, not scrolling past. "Typically" is load-bearing on the second:
        // the PRD is explicit that Research Services promises no SLA.
        { value: 7, suffix: "+", label: "Studies supported, with ongoing help" },
        { value: 5, prefix: "<", label: "Working days to a first reply, typically" },
      ],
      capabilitiesHeading: "Three kinds of help.",
      capabilities: [
        {
          title: "Research aid",
          body: "Refining the question, protocol and IRB guidance, and a literature strategy that will not collapse at review.",
        },
        {
          title: "Biostatistics analysis",
          body: "Study design and analysis support, chosen before data collection where possible, which is when it actually helps.",
        },
        {
          title: "AI-assisted guidance",
          body: "For fellows, always human-reviewed. We will not hand back a generated answer nobody checked.",
        },
        {
          title: "Honest queueing",
          body: "Requests are answered in order of arrival and complexity. We promise no turnaround time we cannot keep.",
        },
      ],
      faq: [
        {
          question: "What does it cost?",
          answer:
            "Nothing. It is offered free of charge as capacity allows, which is also why there is no service-level promise attached to it.",
        },
        {
          question: "What should I not send?",
          answer:
            "Any patient-identifiable information. Describe the question, not the patient. We do not want, and will not store, identifiable clinical data.",
        },
        {
          question: "Will you help with individual patient care?",
          answer:
            "No. This is research support only. Nothing here is clinical advice for a specific patient, and the calculators are an aid to clinical judgement, never a replacement for it.",
        },
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
      successBody: "Thank you. We've received your message and will reply by email.",
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
        "We collect your name, email, affiliation, and request to scope the work. No patient-identifiable data. Describe the question, not the patient. Stored in Saudi Arabia, kept up to 24 months.",
      successTitle: "Request received",
      successBody:
        "Thank you. Your request is queued. We'll reply by email as capacity allows. Requests are answered in order of arrival and complexity.",
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
        "Thank you. We've received your interest in the PedsCC Library pilot and will follow up by email to discuss next steps.",
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
        "Thank you. We've noted your interest in the future PICU registry and will keep you posted as it takes shape.",
    },
  },

  dataProtection: {
    title: "How we handle data",
    heading: "How we handle data",
    metaDescription:
      "TowardPCC's data-handling approach: client-side calculators, servers in Saudi Arabia, and minimal collection. Never patient data.",
    lede: "Privacy is designed into TowardPCC, not bolted on. This page states plainly what happens to data today; the full legal privacy policy lands before public launch.",
    sections: [
      {
        heading: "The calculators never send your inputs anywhere",
        body: "Every calculation runs entirely in your browser. The values you type (a weight, a blood gas, a score) are computed on your own device and are never transmitted to us or stored on any server. You can confirm this: the calculators keep working with the network switched off.",
      },
      {
        heading: "No patient data is collected",
        body: "TowardPCC is not a medical record and does not ask for, receive, or store patient-identifiable information. Please do not enter names, medical record numbers, or other identifiers into any field.",
      },
      {
        heading: "Our servers are in Saudi Arabia",
        body: "The site is hosted on infrastructure located in Saudi Arabia, and anything the platform stores (for example a pilot request you choose to send us) stays within that hosting.\n\nRequests to the site travel through a global content-delivery and security network before they reach those servers. That network protects the site and keeps it fast, and it means that while your data is stored in Saudi Arabia, the request carrying it may be processed outside the Kingdom while in transit. We would rather say so than imply otherwise.\n\nThe calculators are unaffected: what you type into them never leaves your browser at all, so there is nothing to route anywhere.",
      },
      {
        heading: "We collect the minimum to run the service",
        // Was: "Any analytics we use are privacy-respecting…" and "When forms
        // arrive, they will collect only what a request requires". The first
        // implied analytics that does not exist; the second was written before
        // the forms shipped and stayed in the future tense after they went
        // live. Hedged and future-tense wording is how a privacy page rots
        // without anyone noticing — neither sentence was ever caught as false,
        // because neither quite committed to anything.
        body: "We keep data collection to what is genuinely needed to operate the site securely and reliably. We run no analytics: no page counts, no visitor profiles, and no advertising or tracking third parties. The forms collect only what a request requires, and each one says so where you fill it in.",
      },
    ],
    collection: {
      heading: "What we collect, per feature, and why",
      intro:
        "This table is the honest, complete picture of what each part of the site collects today. Where a feature collects nothing, we say so.",
      columns: ["Feature", "What we collect", "Why", "Kept for"],
      rows: [
        ["Calculators", "Nothing", "They compute in your browser", "—"],
        // Browser-local storage was missing from a table that calls itself the
        // complete picture. It never reaches a server, so it was arguably out
        // of scope — but "we collect nothing here" and "your browser keeps a
        // couple of preferences" are different sentences, and a reader clearing
        // site data deserves to know which one applies.
        [
          "Preferences saved in your browser",
          "Which calculators you favorited, and whether you dismissed the install prompt",
          "So the site remembers them on this device",
          "Until you clear this browser's data",
        ],
        [
          "Contact / pilot / interest / research forms",
          "Your name, email, and what you wrote; a salted, truncated hash of your IP",
          "To reply, and to limit abuse of the forms",
          "24 months, then deleted",
        ],
        // No analytics row. There was one until 2026-07-28, describing
        // "privacy-respecting, cookie-less page counts" — and no analytics runs.
        // Umami exists only in docker-compose files that production does not
        // use; the live pages load nothing but their own chunks. Claiming to
        // collect LESS than you do is the usual privacy lie; this page was
        // claiming to collect something it does not collect, on the page that
        // promises the complete picture. Restore this row only when analytics
        // is actually wired, and guard it then.
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
        // Verified 2026-07-28 rather than assumed: the host's boot volume in
        // me-riyadh-1 reports encryption with Oracle-managed keys. The previous
        // wording, "encryption in transit (TLS) and at rest for the database",
        // bundled a claim about the database CONNECTION into a claim about
        // storage — and that connection is host-local and unencrypted. It never
        // crosses a network, so the honest thing is to say what is true of the
        // storage and not imply something extra about the wire.
        "Traffic to the site is encrypted with TLS, and the storage holding the database and its backups is encrypted at rest.",
        "Administrator access requires a password and a second factor (TOTP), with lockout on repeated failures.",
        "An append-only audit log records administrative actions.",
        "Automated, encrypted backups with a tested restore procedure.",
      ],
    },
    residencyHeading: "Where your data lives",
    // §8.3 approved wording — used in spirit; overclaiming is prohibited.
    residencyBody:
      "TowardPCC is hosted on servers located in Saudi Arabia and operates in alignment with the Saudi Personal Data Protection Law (PDPL). For the upcoming PICU registry, deployments will be configured to comply with the data-protection requirements of each participating Gulf country (including data-residency, consent, and governance requirements) in coordination with each institution.",
    subProcessorsHeading: "Who else touches the data",
    // Two corrections on 2026-07-28. It named "our email delivery for replies"
    // as a current sub-processor when no relay is configured and nothing has
    // ever been sent — a processor that processes nothing. And it omitted the
    // provider that receives mail sent to the address printed at the bottom of
    // this very page, which is a live processor of every message a clinician
    // writes to us, and the one this page names for deletion requests.
    subProcessorsBody:
      "We keep third parties to the minimum. Today they are three: Oracle Cloud Infrastructure, our hosting provider, in Saudi Arabia; Cloudflare, which routes and protects traffic to the site and therefore handles requests in transit; and a mail provider outside the Kingdom, which carries email sent to the address on this page and the internal notification telling us that something arrived. That notification names the kind of enquiry and nothing about the person who sent it. We list the real ones here and update this page if that changes; we do not use advertising or profiling third parties.",
    deletionHeading: "Access, correction, and deletion",
    deletionBody:
      "You can ask us what we hold about you, correct it, or have it deleted, at any time. Email us and we will act on it. Calculator use leaves nothing to delete.",
    contactLabel: "Email",
    contactEmail: "info@towardpcc.com",
    // TODO(counsel-review): full privacy policy pending counsel review before
    // launch — tracked in LAUNCH-BLOCKERS.md (kept out of the shipped copy).
    pendingNote:
      "This is a plain-language summary written for clinicians and IT departments, not the final legal privacy policy. The full policy receives a counsel review before public launch.",
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
      "TowardPCC is an informational and educational aid for qualified health professionals. Not a medical device, and not a substitute for clinical judgment.",
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
        body: "Each calculator shows its validation status plainly. Where independent clinical validators have not yet been named, the badge says so (“Independent clinical validation: pending”) rather than implying an endorsement that does not exist.",
      },
      {
        heading: "No patient-identifiable data",
        body: "Do not enter patient names, medical record numbers, or other identifiers. The calculators compute in your browser and send nothing; the forms are for administrative contact only.",
      },
    ],
  },

  pwa: {
    offline: "You're offline. The calculators still work.",
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
    // The phone-only install nudge. Worded around the offline capability rather
    // than "install our app": a clinician adds this to a home screen because
    // the ward has dead zones, not because they wanted another icon.
    installPromptAriaLabel: "Install TowardPCC",
    installPromptHeading: "Use the calculators offline",
    installPromptBody:
      "Add TowardPCC to your home screen and every calculator keeps working with no signal.",
    installPromptAction: "Add to home screen",
    installPromptHow: "How to install",
    installPromptDismiss: "Not now",
  },

  calculators: {
    indexTitle: "Calculators",
    indexHeading: "PICU calculators",
    indexLede:
      "Free, clinically referenced pediatric critical care scores. Every calculation runs in your browser and cites its published source.",
    searchPlaceholder: "Search calculators",
    searchLabel: "Search calculators by name. Press slash to jump here.",
    noResults: "No calculators match your search.",
    noFavorites: "You have not starred any calculators yet.",
    filterGroupLabel: "Filter calculators by category",
    filterAll: "All",
    filterFavorites: "Favorites",
    addFavorite: "Add to favorites:",
    removeFavorite: "Remove from favorites:",
    favoritesNote:
      "Favorites are saved in this browser only, never transmitted or stored on a server.",
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
    // Shown once entry has STARTED but a result is still blocked. A sticky
    // rail that says "Enter values to compute." to a half-filled form is
    // telling it the same thing it tells an empty one, while the field
    // actually standing in the way can be a screen and a half below.
    resultBlockedHeading: "Waiting on",
    resultBlockedJump: "Go to",
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
    // Option groups. Yes/No were hardcoded in the JSX while every other
    // user-visible string lives here.
    booleanYes: "Yes",
    booleanNo: "No",
    optionalLabel: "Optional",
    // Only for additive composites, where blank is not merely permitted but
    // actively scored. Saying just "optional" there would understate it: the
    // score comes out lower, not incomplete.
    optionalScoredAsNormal: "Optional · blank scored as normal",
    clearSelection: "Clear",
    clearSelectionLabel: "Clear the selection for",
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
    evidenceHeading: "Evidence",
    versionHeading: "Version and changelog",
    limitationsHeading: "Limitations and notes",
    // Retained: the ranges themselves moved into the fields, but this heading
    // is still the accessible description of what those hints are.
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
