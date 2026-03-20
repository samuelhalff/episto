"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession, useCreateDraft } from "../../../../hooks/use-api.js";
import { Mail, Loader2 } from "lucide-react";

export default function NewDraftPage() {
  const t = useTranslations("common");
  const router = useRouter();
  const { createSession } = useSession();
  const createDraft = useCreateDraft();

  useEffect(() => {
    async function bootstrap() {
      try {
        await createSession("en-CH");
        const draft = await createDraft.mutateAsync();
        router.replace(`/draft/${draft.id}`);
      } catch {
        try {
          const draft = await createDraft.mutateAsync();
          router.replace(`/draft/${draft.id}`);
        } catch {
          router.replace("/");
        }
      }
    }
    void bootstrap();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
        <Mail className="h-6 w-6 text-primary-foreground" />
      </div>
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      </div>
    </div>
  );
}
