"use client";

import { Calendar, FileText, Hash, Lightbulb, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

export function IntakeTips() {
  const t = useTranslations("draft");

  const tips = [
    {
      title: t("tipFullContext"),
      desc: t("tipFullContextDesc"),
      icon: <FileText className="h-4 w-4" />,
    },
    {
      title: t("tipDates"),
      desc: t("tipDatesDesc"),
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      title: t("tipReferences"),
      desc: t("tipReferencesDesc"),
      icon: <Hash className="h-4 w-4" />,
    },
    {
      title: t("tipContact"),
      desc: t("tipContactDesc"),
      icon: <Mail className="h-4 w-4" />,
    },
  ];

  return (
    <section className="px-2">
      <div className="mb-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
        <Lightbulb className="h-3.5 w-3.5 shrink-0" />
        {t("proTips")}
      </div>
      <ul className="space-y-2">
        {tips.map((tip) => (
          <li key={tip.title} className="flex items-baseline gap-2.5 py-0.5">
            <span className="text-zinc-400 dark:text-zinc-500">{tip.icon}</span>
            <p className="text-sm leading-5">
              <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                {tip.title}
              </span>
              <span className="text-zinc-400 dark:text-zinc-500">
                {" — "}
                {tip.desc}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
