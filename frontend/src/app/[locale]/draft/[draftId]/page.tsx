import { DraftWorkspaceClient } from "../../../../components/product/draft-flow/DraftWorkspaceClient";

export default async function DraftWorkspacePage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;

  return <DraftWorkspaceClient draftId={draftId} />;
}
