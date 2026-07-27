// src/app/api/razorpay/order/route.ts
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amountINR, planType, tier, parentContact } = body;

    if (!amountINR || isNaN(Number(amountINR)) || Number(amountINR) <= 0) {
      return NextResponse.json({ error: "Invalid amount parameter" }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    const amountInPaisa = Math.round(Number(amountINR) * 100);

    // If real Razorpay keys are configured
    if (keyId && keySecret && !keyId.includes("your_key_id") && !keyId.includes("rzp_test_your_key_id") && !keySecret.includes("your_key_secret")) {
      try {
        const instance = new Razorpay({
          key_id: keyId,
          key_secret: keySecret,
        });

        const order = await instance.orders.create({
          amount: amountInPaisa,
          currency: "INR",
          receipt: `rcpt_${Date.now()}`,
          notes: {
            planType: planType || "subscription",
            tier: tier || "PLUS",
            contact: parentContact || ""
          }
        });

        return NextResponse.json({
          status: "success",
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId: keyId
        });
      } catch (rzpErr) {
        console.error("[Razorpay Order API Error] Failed to create Razorpay order:", rzpErr);
        return NextResponse.json({ error: (rzpErr as Error).message || "Razorpay Order Creation Failed" }, { status: 500 });
      }
    }

    // Fallback Simulation Mode (if keys are missing or placeholder in dev)
    console.log("[Razorpay Order API] Running in Simulation Mode (No real Razorpay credentials provided).");
    const simulatedOrderId = `order_simulated_${Date.now()}`;
    return NextResponse.json({
      status: "success",
      orderId: simulatedOrderId,
      amount: amountInPaisa,
      currency: "INR",
      keyId: keyId || "rzp_test_simulated_key",
      isSimulation: true,
      message: "Razorpay Sandbox Order created in simulation mode."
    });

  } catch (error) {
    console.error("[Razorpay Order API Catch Error]:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}
