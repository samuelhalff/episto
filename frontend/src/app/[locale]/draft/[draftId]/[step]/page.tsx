import { notFound } from "next/navigation";
import { DraftWorkspaceClient } from "@/components/product/draft-flow/DraftWorkspaceClient";
import { isDraftWorkspaceStepSlug } from "@/components/product/draft-flow/steps";
import ReviewPage from "../review/page";
import CheckoutPage from "../checkout/page";

export default async function DraftWorkspaceStepPage({
  params,
}: {
  params: Promise<{ draftId: string; locale: string; step: string }>;
}) {
  const { draftId, locale, step } = await params;

  if (step === "review") {
    return <ReviewPage params={Promise.resolve({ draftId })} />;
  }

  if (step === "checkout") {
    return <CheckoutPage params={Promise.resolve({ draftId, locale })} />;
  }

  if (!isDraftWorkspaceStepSlug(step) || step === "intake") {
    notFound();
  }

  return <DraftWorkspaceClient draftId={draftId} stepSlug={step} />;
}
