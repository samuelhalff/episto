"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession, useCreateDraft } from "../../../../hooks/use-api.js";

/**
 * /draft/new — entry point that creates a session + draft, then redirects
 * to the draft workspace. This is the primary CTA destination.
 */
export default function NewDraftPage() {
  const t = useTranslations("common");
  const router = useRouter();
  const { createSession } = useSession();
  const createDraft = useCreateDraft();

  useEffect(() => {
    async function bootstrap() {
      try {
        // Create a guest session (cookie set automatically)
        await createSession("en-CH");

        // Create the first draft
        const draft = await createDraft.mutateAsync();

        // Redirect to workspace
        router.replace(`/draft/${draft.id}`);
      } catch {
        // Session may already exist — try creating draft directly
        try {
          const draft = await createDraft.mutateAsync();
          router.replace(`/draft/${draft.id}`);
        } catch {
          // If everything fails, redirect home
          router.replace("/");
        }
      }
    }

    void bootstrap();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent" />
        <p className="mt-4 text-sm text-gray-500">{t("loading")}</p>
      </div>
    </div>
  );
}
