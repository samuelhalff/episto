import { DraftStatus, type DraftLetter } from "@episto/shared";

type SearchParamsLike = {
  get(name: string): string | null;
};

const POST_SUBMISSION_DRAFT_STATUSES = new Set<DraftLetter["status"]>([
  DraftStatus.submitted,
  DraftStatus.dispatched,
  DraftStatus.closed,
]);

function sortDraftsByActivity(drafts: DraftLetter[]): DraftLetter[] {
  return [...drafts].sort((left, right) => {
    const leftDate = new Date(left.updatedAt ?? left.createdAt).getTime();
    const rightDate = new Date(right.updatedAt ?? right.createdAt).getTime();
    return rightDate - leftDate;
  });
}

export function findRecoverableDraft(drafts: DraftLetter[]): DraftLetter | null {
  return (
    sortDraftsByActivity(drafts).find(
      (draft) => !POST_SUBMISSION_DRAFT_STATUSES.has(draft.status),
    ) ?? null
  );
}

export function shouldForceFreshEntry(searchParams: SearchParamsLike): boolean {
  return searchParams.get("fresh") === "1";
}
