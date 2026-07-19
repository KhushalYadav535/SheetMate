// src/app/api/billing/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSystemConfig } from "@/lib/config";

// GET /api/billing?contact=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contactInput = searchParams.get("contact");

    if (!contactInput || !contactInput.trim()) {
      return NextResponse.json({ error: "Missing contact parameter" }, { status: 400 });
    }

    const contact = contactInput.trim();
    const config = await getSystemConfig();

    // 1. Fetch parent subscription
    const subscription = await prisma.parentSubscription.findUnique({
      where: { contact }
    });

    // 2. Fetch credit purchases (unexpired and remaining credits)
    const now = new Date();
    const creditPacks = await prisma.creditPurchase.findMany({
      where: {
        parentContact: contact,
        creditsRemaining: { gt: 0 },
        expiresAt: { gte: now }
      },
      orderBy: { expiresAt: "asc" }
    });

    const totalCredits = creditPacks.reduce((sum, pack) => sum + pack.creditsRemaining, 0);

    return NextResponse.json({
      contact,
      subscription: subscription ? {
        tier: subscription.tier,
        status: subscription.status,
        endsAt: subscription.endsAt,
        autoRenew: subscription.autoRenew,
        billingPriceINR: subscription.billingPriceINR
      } : {
        tier: "FREE",
        status: "ACTIVE",
        endsAt: null,
        autoRenew: false,
        billingPriceINR: 0
      },
      credits: {
        totalRemaining: totalCredits,
        packs: creditPacks.map(pack => {
          const msLeft = new Date(pack.expiresAt).getTime() - Date.now();
          const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
          return {
            id: pack.id,
            creditsRemaining: pack.creditsRemaining,
            expiresAt: pack.expiresAt,
            daysLeft
          };
        })
      },
      pricing: {
        plusPrice: config.tiers.plus.monthlyPriceINR,
        familyProPrice: config.tiers.familyPro.monthlyPriceINR,
        creditPackPrice: config.creditPack.priceINR,
        creditsPerPack: config.creditPack.detailedFeedbackCreditsGranted
      }
    });

  } catch (error) {
    console.error("[Billing GET Error]:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/billing
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, contact: contactInput, tier, autoRenew } = body;

    if (!contactInput || !contactInput.trim()) {
      return NextResponse.json({ error: "Missing contact parameter" }, { status: 400 });
    }

    const contact = contactInput.trim();
    const config = await getSystemConfig();

    if (action === "subscribe") {
      if (!tier || (tier !== "PLUS" && tier !== "FAMILY_PRO")) {
        return NextResponse.json({ error: "Invalid subscription tier" }, { status: 400 });
      }

      // Resolve dynamic price from configuration
      const price = tier === "PLUS" ? config.tiers.plus.monthlyPriceINR : config.tiers.familyPro.monthlyPriceINR;
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + 30); // 30-day billing cycle

      const subscription = await prisma.parentSubscription.upsert({
        where: { contact },
        update: {
          tier,
          status: "ACTIVE",
          billingPriceINR: price,
          endsAt,
          autoRenew: autoRenew !== false,
          updatedAt: new Date()
        },
        create: {
          contact,
          tier,
          status: "ACTIVE",
          billingPriceINR: price,
          endsAt,
          autoRenew: autoRenew !== false
        }
      });

      return NextResponse.json({
        status: "success",
        message: `Successfully subscribed to ${tier} tier.`,
        subscription
      });

    } else if (action === "cancel") {
      const subscription = await prisma.parentSubscription.findUnique({
        where: { contact }
      });

      if (!subscription) {
        return NextResponse.json({ error: "Subscription not found for this contact" }, { status: 404 });
      }

      const updated = await prisma.parentSubscription.update({
        where: { contact },
        data: {
          autoRenew: false,
          updatedAt: new Date()
        }
      });

      return NextResponse.json({
        status: "success",
        message: "Auto-renewal turned off successfully.",
        subscription: updated
      });

    } else if (action === "buy_credits") {
      const quantity = parseInt(body.quantity || "1", 10);
      if (isNaN(quantity) || quantity <= 0) {
        return NextResponse.json({ error: "Invalid quantity parameter" }, { status: 400 });
      }

      const creditsPerPack = config.creditPack.detailedFeedbackCreditsGranted || 20;
      const pricePerPack = config.creditPack.priceINR || 99;
      const expiryDays = config.creditPack.expiryDays || 90;

      const totalCredits = creditsPerPack * quantity;
      const totalPrice = pricePerPack * quantity;
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      const purchase = await prisma.creditPurchase.create({
        data: {
          parentContact: contact,
          creditsGranted: totalCredits,
          creditsRemaining: totalCredits,
          expiresAt
        }
      });

      return NextResponse.json({
        status: "success",
        message: `Successfully purchased ${totalCredits} credits for ₹${totalPrice}.`,
        purchase
      });

    } else if (action === "downgrade_free") {
      // Deletes subscription (falls back to FREE)
      await prisma.parentSubscription.deleteMany({
        where: { contact }
      });

      return NextResponse.json({
        status: "success",
        message: "Successfully downgraded to Free tier."
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("[Billing POST Error]:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}
