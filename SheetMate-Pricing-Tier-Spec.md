# PracticeMitra — Pricing & Tier Strategy Specification

**Version:** 0.1 (Draft for Engineering Review)
**Owner:** Product (Sentient Digital)
**Status:** Ready for implementation planning
**Last updated:** 2026-06-26

---

## 1. Purpose & Scope

This document specifies the monetization tier structure for PracticeMitra: who gets what, at what limits, and how a user moves between tiers. It is written for the engineering team to implement the **access-control, quota-enforcement, and billing-hook logic**.

**Hard requirement for implementation:** every numeric value in this document (prices, quotas, thresholds, expiry windows) must be implemented as a **remotely configurable parameter**, not a hardcoded constant. Product will need to change these values — likely frequently in the first 3-6 months post-launch — without requiring an app store release. See Section 4 for the canonical config schema; Section 12 for how changes should be rolled out.

This document does **not** cover: payment gateway integration specifics, OTP/identity provider selection, or the worksheet generation/evaluation AI pipeline itself (covered in the base PRD). It covers the tier logic that sits on top of those systems.

---

## 2. Tier Overview

| | **Guest** | **Registered (Free)** | **Plus** | **Family / Pro** |
|---|---|---|---|---|
| Signup required | None | Phone OTP | Phone OTP + payment | Phone OTP + payment |
| Worksheet generation | `guest.dailyGenerationLimit` /day | `registeredFree.dailyGenerationLimit` /day | Unlimited | Unlimited |
| Detailed AI feedback | Not available (score-only) | `registeredFree.monthlyDetailedFeedbackQuota` /month, then falls back to score-only | Unlimited | Unlimited |
| Basic auto-scoring (right/wrong, %) | Always available | Always available | Always available | Always available |
| History / streaks saved | No | Yes | Yes | Yes |
| Weak-topic analytics dashboard | No | No | No | Yes |
| Multiple child profiles | No | No | No | Up to `familyPro.maxChildProfiles` |
| Weekly parent summary email | No | No | Yes | Yes |
| Priority evaluation speed | No | No | No | Yes |
| Price | Free | Free | ₹`plus.monthlyPriceINR`/month | ₹`familyPro.monthlyPriceINR`/month |

Plus a standalone, non-subscription **Credit Pack** (Section 3.5) available to any Registered or Paid user as a top-up.

**No advertisements anywhere in the product**, on any tier. This is an explicit product decision — see Section 9.

---

## 3. Tier Definitions

### 3.1 Guest

- No account creation. Identified by device + soft IP-based fingerprint for the daily limit.
- Generation limit: `guest.dailyGenerationLimit` (default: **1 worksheet/day**).
- Evaluation: basic auto-score only (correct/incorrect count, percentage). **No step-by-step detailed feedback** — this is reserved as the registration incentive, not a cost-saving measure, so do not relax this even if AI costs drop.
- No history, no streaks, no saved profile. Closing the app loses all state.
- Purpose: a zero-friction first-touch experience. Must work with **zero signup screens** before the first worksheet is generated.

### 3.2 Registered (Free)

- Requires phone number + OTP verification. No email required.
- **Important:** per the base PRD's user, this product processes data belonging to minors. Registration flow must capture and record **verifiable parental consent** at this step — flagged as `compliance.parentalConsentRequiredAtRegistration` in config, but the actual consent-capture mechanism is a hard requirement, not a toggle. See Section 10.
- Generation limit: `registeredFree.dailyGenerationLimit` (default: **5/day**) and `registeredFree.monthlyGenerationLimit` (default: **150/month**) — the monthly cap exists to prevent daily-limit gaming via date/timezone manipulation.
- Detailed feedback quota: `registeredFree.monthlyDetailedFeedbackQuota` (default: **18/month**). Once exhausted, evaluations continue to return basic auto-score (never a hard block on usage — the student should never see "you can't practice today").
- History, streaks, and score trends are saved against the account.
- This is the **conversion funnel's core engine**. The free quota must be generous enough that a regular user experiences real value repeatedly, not once as a teaser.

### 3.3 Plus (Paid Individual)

- Price: `plus.monthlyPriceINR` (default: **₹199/month**). Annual price `plus.annualPriceINR` left unset until monthly pricing is validated post-launch (see Section 12 — do not hardcode an annual price assumption into UI yet, but the field must exist in config so it can be lit up later without a schema change).
- Unlimited generation, unlimited detailed feedback.
- Adds: weekly parent summary email (`plus.weeklyParentSummaryEmail`).
- Single child profile only — multi-child requires Family/Pro.

### 3.4 Family / Pro (Paid Household)

- Price: `familyPro.monthlyPriceINR` (default: **₹349/month**).
- Includes everything in Plus, plus:
  - Up to `familyPro.maxChildProfiles` (default: **5**) child profiles under one paying account.
  - Weak-topic analytics dashboard (`familyPro.weakTopicAnalyticsDashboard`).
  - Priority evaluation speed — route these requests with elevated queue priority (`familyPro.prioritySpeedEnabled`).

### 3.5 Credit Pack (Non-subscription add-on)

- Available to Registered (Free) and Plus users who have exhausted their detailed-feedback quota but don't want a subscription commitment.
- Price: `creditPack.priceINR` (default: **₹99**) grants `creditPack.detailedFeedbackCreditsGranted` (default: **20**) detailed feedback credits.
- Credits expire after `creditPack.expiryDays` (default: **90 days**) from purchase, to prevent unlimited hoarding from distorting usage analytics.
- `creditPack.stackable` (default: **true**) — purchasing a new pack while one is partially used adds to the existing balance rather than replacing it.
- **Product rationale (do not strip this from the UX):** this exists specifically as a low-commitment first transaction for price-wary parents who won't subscribe on a first purchase. It should be presented as a one-tap purchase, not buried in settings.

---

## 4. Configuration Schema

This is the canonical shape of the dynamic config object. All values shown are **defaults**, expected to change post-launch based on observed usage data (see Section 11).

```json
{
  "configVersion": "1.0.0",
  "tiers": {
    "guest": {
      "dailyGenerationLimit": 1,
      "detailedFeedbackEnabled": false,
      "basicScoringEnabled": true,
      "historySaved": false
    },
    "registeredFree": {
      "dailyGenerationLimit": 5,
      "monthlyGenerationLimit": 150,
      "monthlyDetailedFeedbackQuota": 18,
      "detailedFeedbackFallbackBehavior": "basicScoreOnly",
      "historySaved": true,
      "streaksEnabled": true
    },
    "plus": {
      "monthlyPriceINR": 199,
      "annualPriceINR": null,
      "generationLimit": "unlimited",
      "detailedFeedbackLimit": "unlimited",
      "weeklyParentSummaryEmail": true,
      "maxChildProfiles": 1
    },
    "familyPro": {
      "monthlyPriceINR": 349,
      "annualPriceINR": null,
      "generationLimit": "unlimited",
      "detailedFeedbackLimit": "unlimited",
      "maxChildProfiles": 5,
      "weakTopicAnalyticsDashboard": true,
      "prioritySpeedEnabled": true,
      "includesPlusFeatures": true
    }
  },
  "creditPack": {
    "priceINR": 99,
    "detailedFeedbackCreditsGranted": 20,
    "expiryDays": 90,
    "stackable": true
  },
  "modelRouting": {
    "generation": {
      "defaultModel": "haiku",
      "escalateToSonnetOnLowOcrConfidence": true,
      "ocrConfidenceEscalationThreshold": 0.70
    },
    "evaluation": {
      "defaultModel": "haiku",
      "escalateToSonnetOnLowOcrConfidence": true,
      "ocrConfidenceEscalationThreshold": 0.65,
      "escalateOnMultiStepProblem": true
    }
  },
  "rateLimiting": {
    "identityBasis": "phoneNumber",
    "maxAccountsPerPhoneNumber": 1,
    "maxGuestAccountsPerDeviceFingerprintPerDay": 1
  },
  "paywallTriggers": {
    "softNudgeAtQuotaPercent": 80,
    "hardUpsellAtQuotaPercent": 100,
    "consecutiveMonthsAtFullQuotaToEscalateMessaging": 2
  },
  "ads": {
    "enabledStudentFacing": false,
    "enabledParentFacing": false
  },
  "compliance": {
    "minorDataHandlingEnabled": true,
    "parentalConsentRequiredAtRegistration": true,
    "behavioralTrackingForAdsDisabled": true,
    "ageDefinedAsMinorUnder": 18
  }
}
```

**Implementation note:** this should live in whatever remote-config / admin-settings system the team stands up (feature-flag service, DB-backed settings table with an admin UI, etc.) — not in app code or environment variables that require a deploy to change. Pricing and quota changes are expected to happen weekly during the post-launch tuning period.

---

## 5. Identity & Rate-Limiting Rules

- **Rate-limit by `rateLimiting.identityBasis` = phone number, not device.** Device-based limits are trivially bypassed by an app reinstall or data clear. Phone-number-based limiting via OTP is the standard pattern for Indian consumer apps and should be treated as non-negotiable, not a config option to weaken.
- `rateLimiting.maxAccountsPerPhoneNumber` (default: **1**) prevents one number from registering multiple free accounts.
- Guest-tier abuse (one device farming multiple guest sessions) is bounded by `rateLimiting.maxGuestAccountsPerDeviceFingerprintPerDay`, but treat this as a soft deterrent only — guest tier has no payment/identity attached, so this can't be airtight. The real abuse-resistance happens at the registration gate.

---

## 6. AI Model Routing Strategy

Cost control depends on this more than on quota limits. Default behavior:

- **Generation and routine evaluation default to the Haiku-tier model** (`modelRouting.*.defaultModel`).
- **Escalate to the Sonnet-tier model** when:
  - OCR confidence on the uploaded image falls below `modelRouting.evaluation.ocrConfidenceEscalationThreshold` (default **0.65**) — i.e., handwriting is hard to read and a more capable model is needed to interpret it correctly.
  - The problem is flagged as multi-step (`modelRouting.evaluation.escalateOnMultiStepProblem`), where explanation quality matters more.
- This routing logic should be implemented so the **thresholds are config values**, not embedded in pipeline code — expect these to be tuned based on observed evaluation-quality metrics post-launch (see Section 11).

---

## 7. Paywall & Upsell Trigger Logic

- Do **not** trigger upsell prompts on a calendar/time-since-signup basis (e.g., "you've used the app for 14 days"). Trigger on **quota-exhaustion signal**, which is a much stronger purchase-intent indicator.
- At `paywallTriggers.softNudgeAtQuotaPercent` (default **80%** of monthly detailed-feedback quota used): show a soft, dismissible in-app nudge ("You're close to this month's detailed feedback limit").
- At `paywallTriggers.hardUpsellAtQuotaPercent` (default **100%**): present the credit-pack and subscription options when the user attempts a detailed feedback evaluation beyond quota. The worksheet/evaluation should still complete with basic scoring — never block the core practice loop.
- If a user hits full quota for `paywallTriggers.consecutiveMonthsAtFullQuotaToEscalateMessaging` (default **2**) consecutive months, escalate messaging tone/placement (e.g., move from a dismissible banner to a one-time full-screen interstitial on next quota hit) — this threshold should be config-driven so product can tune nudge aggressiveness without a release.

---

## 8. Payment & Credit Pack Mechanics

- Credit pack purchase is a one-time payment, not a subscription — implement via standard one-time payment flow (UPI-first, per India market norms), not the recurring-billing path used for Plus/Family.
- Credit balance and expiry (`creditPack.expiryDays`) must be visible to the user at all times (e.g., "14 credits left, expiring in 32 days") — don't let credits silently expire without warning.
- Subscription (Plus/Family) billing should support standard upgrade/downgrade/cancel flows; defer annual billing implementation until `plus.annualPriceINR` / `familyPro.annualPriceINR` are set (currently null — see Section 3.3).

---

## 9. Ads Policy (Explicit Non-Functional Requirement)

`ads.enabledStudentFacing` and `ads.enabledParentFacing` both default to **false** and are not expected to change. This is documented as a config flag for completeness, not because ads are planned — **do not build ad-network SDK integration into the MVP scope.** Reasons (for context, not for engineering action):

1. Users are minors; India's DPDP Act prohibits behavioral tracking and targeted advertising directed at children, with substantial penalties.
2. "Ad-free and trustworthy" is part of the product's market positioning against the post-Byju's edtech trust deficit.

If this is ever revisited, it would only apply to parent-facing surfaces (e.g., the weekly email), never the student-facing app — but this is out of scope for now.

---

## 10. Compliance Notes (Minor Data Handling)

- All users of the core product are presumed minors for data-handling purposes (`compliance.ageDefinedAsMinorUnder` = 18).
- Registration flow must capture verifiable parental consent (`compliance.parentalConsentRequiredAtRegistration`) — the actual consent-capture UX/mechanism needs separate design and legal review; this spec only requires that the *flag and gate* exist in the registration flow.
- `compliance.behavioralTrackingForAdsDisabled` must remain hard-true regardless of the ads flags above — this is a defense-in-depth flag so that even if ads are ever enabled, behavioral tracking for ad purposes cannot be silently turned on alongside it.
- This section is informational for engineering; final compliance sign-off should come from legal review before launch, not from this document alone.

---

## 11. Metrics & Instrumentation

To make Section 12's tuning process possible, instrument and report on at minimum:

- Guest → Registered conversion rate, and time-to-registration from first guest worksheet.
- % of Registered Free users hitting `monthlyDetailedFeedbackQuota` each month (this is the single most important number for deciding whether the free quota is too generous or too stingy).
- Registered Free → Paid (Plus/Family) conversion rate, segmented by whether the user purchased a credit pack first.
- Credit pack attach rate and pack-to-subscription conversion rate.
- Per-tier AI cost (generation + evaluation spend, split by Haiku/Sonnet) to validate the unit economics assumptions this pricing was built on.
- Model escalation rate (% of calls routed to Sonnet) — if this drifts materially from initial estimates, cost assumptions need revisiting.

---

## 12. Versioning & Change Management

- The config object in Section 4 carries a `configVersion` field — increment on every change and log the diff (old value → new value, timestamp, who changed it).
- Price changes for existing paying subscribers should **not** retroactively apply mid-cycle — implement a "price effective from next billing cycle" rule, or grandfather existing subscribers explicitly, to avoid billing disputes.
- Recommend a staged rollout capability (e.g., apply new quota/price values to a % of new registrations first) if the config system supports it — not a hard requirement for MVP, but worth designing the schema so it doesn't block this later.

---

## 13. Open Questions / Dependencies for Engineering

- Which OTP/identity provider is being used for phone verification? (Determines how `rateLimiting.identityBasis` is actually enforced.)
- Which payment gateway handles both one-time (credit pack) and recurring (subscription) flows? UPI support is a hard requirement.
- Where will the config object (Section 4) actually live — a feature-flag service, a simple admin-panel-backed DB table, or something else? This decision affects how fast Section 12's change process can realistically move.
- Parental consent capture mechanism at registration — needs design + legal review; not specified in this document.
