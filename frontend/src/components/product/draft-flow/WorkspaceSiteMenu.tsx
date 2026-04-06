"use client";

import { useTranslations } from "next-intl";
import { CustomerSiteMenu } from "../../layout/CustomerSiteMenu";

interface WorkspaceSiteMenuProps {
  isCompactViewport?: boolean | undefined;
}

export function WorkspaceSiteMenu({ isCompactViewport = false }: WorkspaceSiteMenuProps) {
  const t = useTranslations("marketing");
  const tc = useTranslations("common");

  return (
    <CustomerSiteMenu
      title={tc("appName")}
      description={t("nav.writeLetter")}
      isCompactViewport={isCompactViewport}
    />
  );
}
