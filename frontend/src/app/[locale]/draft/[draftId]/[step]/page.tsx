import { notFound } from "next/navigation";
import { DraftWorkspaceClient } from "../../../../../components/product/draft-flow/DraftWorkspaceClient";
import { isDraftWorkspaceStepSlug } from "../../../../../components/product/draft-flow/steps";

export default async function DraftWorkspaceStepPage({
  params,
}: {
  params: Promise<{ draftId: string; step: string }>;
}) {
  const { draftId, step } = await params;

  if (!isDraftWorkspaceStepSlug(step) || step === "intake") {
    notFound();
  }

  return <DraftWorkspaceClient draftId={draftId} stepSlug={step} />;
}
