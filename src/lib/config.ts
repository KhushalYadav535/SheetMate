// src/lib/config.ts
import prisma from "./db";

export interface SystemConfigData {
  configVersion: string;
  tiers: {
    guest: {
      dailyGenerationLimit: number;
      detailedFeedbackEnabled: boolean;
      basicScoringEnabled: boolean;
      historySaved: boolean;
    };
    registeredFree: {
      dailyGenerationLimit: number;
      monthlyGenerationLimit: number;
      monthlyDetailedFeedbackQuota: number;
      detailedFeedbackFallbackBehavior: string;
      historySaved: boolean;
      streaksEnabled: boolean;
    };
    plus: {
      monthlyPriceINR: number;
      annualPriceINR: number | null;
      generationLimit: string;
      detailedFeedbackLimit: string;
      weeklyParentSummaryEmail: boolean;
      maxChildProfiles: number;
    };
    familyPro: {
      monthlyPriceINR: number;
      annualPriceINR: number | null;
      generationLimit: string;
      detailedFeedbackLimit: string;
      maxChildProfiles: number;
      weakTopicAnalyticsDashboard: boolean;
      prioritySpeedEnabled: boolean;
      includesPlusFeatures: boolean;
    };
  };
  creditPack: {
    priceINR: number;
    detailedFeedbackCreditsGranted: number;
    expiryDays: number;
    stackable: boolean;
  };
  modelRouting: {
    generation: {
      defaultModel: string;
      escalateToSonnetOnLowOcrConfidence: boolean;
      ocrConfidenceEscalationThreshold: number;
    };
    evaluation: {
      defaultModel: string;
      escalateToSonnetOnLowOcrConfidence: boolean;
      ocrConfidenceEscalationThreshold: number;
      escalateOnMultiStepProblem: boolean;
    };
  };
  rateLimiting: {
    identityBasis: string;
    maxAccountsPerPhoneNumber: number;
    maxGuestAccountsPerDeviceFingerprintPerDay: number;
  };
  paywallTriggers: {
    softNudgeAtQuotaPercent: number;
    hardUpsellAtQuotaPercent: number;
    consecutiveMonthsAtFullQuotaToEscalateMessaging: number;
  };
  ads: {
    enabledStudentFacing: boolean;
    enabledParentFacing: boolean;
  };
  compliance: {
    minorDataHandlingEnabled: boolean;
    parentalConsentRequiredAtRegistration: boolean;
    behavioralTrackingForAdsDisabled: boolean;
    ageDefinedAsMinorUnder: number;
  };
}

export const DEFAULT_CONFIG: SystemConfigData = {
  configVersion: "1.0.0",
  tiers: {
    guest: {
      dailyGenerationLimit: 1,
      detailedFeedbackEnabled: false,
      basicScoringEnabled: true,
      historySaved: false
    },
    registeredFree: {
      dailyGenerationLimit: 5,
      monthlyGenerationLimit: 150,
      monthlyDetailedFeedbackQuota: 18,
      detailedFeedbackFallbackBehavior: "basicScoreOnly",
      historySaved: true,
      streaksEnabled: true
    },
    plus: {
      monthlyPriceINR: 199,
      annualPriceINR: null,
      generationLimit: "unlimited",
      detailedFeedbackLimit: "unlimited",
      weeklyParentSummaryEmail: true,
      maxChildProfiles: 1
    },
    familyPro: {
      monthlyPriceINR: 349,
      annualPriceINR: null,
      generationLimit: "unlimited",
      detailedFeedbackLimit: "unlimited",
      maxChildProfiles: 5,
      weakTopicAnalyticsDashboard: true,
      prioritySpeedEnabled: true,
      includesPlusFeatures: true
    }
  },
  creditPack: {
    priceINR: 99,
    detailedFeedbackCreditsGranted: 20,
    expiryDays: 90,
    stackable: true
  },
  modelRouting: {
    generation: {
      defaultModel: "haiku",
      escalateToSonnetOnLowOcrConfidence: true,
      ocrConfidenceEscalationThreshold: 0.70
    },
    evaluation: {
      defaultModel: "haiku",
      escalateToSonnetOnLowOcrConfidence: true,
      ocrConfidenceEscalationThreshold: 0.65,
      escalateOnMultiStepProblem: true
    }
  },
  rateLimiting: {
    identityBasis: "phoneNumber",
    maxAccountsPerPhoneNumber: 1,
    maxGuestAccountsPerDeviceFingerprintPerDay: 1
  },
  paywallTriggers: {
    softNudgeAtQuotaPercent: 80,
    hardUpsellAtQuotaPercent: 100,
    consecutiveMonthsAtFullQuotaToEscalateMessaging: 2
  },
  ads: {
    enabledStudentFacing: false,
    enabledParentFacing: false
  },
  compliance: {
    minorDataHandlingEnabled: true,
    parentalConsentRequiredAtRegistration: true,
    behavioralTrackingForAdsDisabled: true,
    ageDefinedAsMinorUnder: 18
  }
};

let cachedConfig: SystemConfigData | null = null;
let cacheExpiry: number = 0;
const CACHE_TTL = 60 * 1000; // 1 minute cache TTL

export async function getSystemConfig(): Promise<SystemConfigData> {
  const now = Date.now();
  if (cachedConfig && now < cacheExpiry) {
    return cachedConfig;
  }

  try {
    let configRecord = await prisma.systemConfig.findUnique({
      where: { id: "active_config" }
    });

    if (!configRecord) {
      configRecord = await prisma.systemConfig.create({
        data: {
          id: "active_config",
          version: "1.0.0",
          configJson: JSON.stringify(DEFAULT_CONFIG)
        }
      });
    }

    cachedConfig = JSON.parse(configRecord.configJson);
    cacheExpiry = now + CACHE_TTL;
    return cachedConfig!;
  } catch (error) {
    console.error("Failed to query DB for system config, returning hardcoded defaults:", error);
    return DEFAULT_CONFIG;
  }
}

export function clearConfigCache() {
  cachedConfig = null;
  cacheExpiry = 0;
}
