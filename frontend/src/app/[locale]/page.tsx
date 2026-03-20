import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation.js";
import { Header } from "../../components/marketing/Header.js";
import { Footer } from "../../components/marketing/Footer.js";
import {
  PenLine,
  FileSearch,
  Send,
  XCircle,
  Home,
  FileWarning,
  Building2,
  Truck,
  Shield,
  UserCheck,
} from "lucide-react";

export default function HomePage() {
  const t = useTranslations("marketing");

  return (
    <>
      <Header />
      <main id="main-content">
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pb-24 pt-28 md:pb-36 md:pt-44">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(245,158,11,0.12),transparent)]"
          />
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-gray-900 md:text-6xl lg:text-7xl">
              {t("heroTitle")}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-gray-500 md:text-xl">
              {t("heroSubtitle")}
            </p>
            <Link
              href="/draft/new"
              className="mt-10 inline-block rounded-full bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-primary-dark hover:shadow-xl"
            >
              {t("heroCta")}
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-gray-50 px-6 py-20 md:py-28">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-2xl font-bold text-gray-900 md:text-3xl">
              {t("howItWorksTitle")}
            </h2>
            <div className="mt-14 grid gap-12 md:grid-cols-3">
              <Step
                icon={<PenLine className="h-10 w-10 text-primary" />}
                number="1"
                title={t("step1Title")}
                description={t("step1Desc")}
              />
              <Step
                icon={<FileSearch className="h-10 w-10 text-primary" />}
                number="2"
                title={t("step2Title")}
                description={t("step2Desc")}
              />
              <Step
                icon={<Send className="h-10 w-10 text-primary" />}
                number="3"
                title={t("step3Title")}
                description={t("step3Desc")}
              />
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section className="px-6 py-20 md:py-28">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-2xl font-bold text-gray-900 md:text-3xl">
              {t("useCasesTitle")}
            </h2>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <UseCaseCard
                icon={<XCircle className="h-10 w-10 text-gray-400 transition-colors group-hover:text-primary" />}
                label={t("useCaseCancel")}
              />
              <UseCaseCard
                icon={<Home className="h-10 w-10 text-gray-400 transition-colors group-hover:text-primary" />}
                label={t("useCaseLease")}
              />
              <UseCaseCard
                icon={<FileWarning className="h-10 w-10 text-gray-400 transition-colors group-hover:text-primary" />}
                label={t("useCaseComplaint")}
              />
              <UseCaseCard
                icon={<Building2 className="h-10 w-10 text-gray-400 transition-colors group-hover:text-primary" />}
                label={t("useCaseAuthority")}
              />
            </div>
          </div>
        </section>

        {/* Trust signals */}
        <section className="bg-gray-900 px-6 py-20 md:py-28">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-2xl font-bold text-white md:text-3xl">
              {t("trustTitle")}
            </h2>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              <TrustItem
                icon={<Truck className="h-10 w-10 text-primary-light" />}
                label={t("trustSwissPost")}
              />
              <TrustItem
                icon={<Shield className="h-10 w-10 text-primary-light" />}
                label={t("trustSecure")}
              />
              <TrustItem
                icon={<UserCheck className="h-10 w-10 text-primary-light" />}
                label={t("trustNoAccount")}
              />
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="px-6 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
              {t("pricingTitle")}
            </h2>
            <p className="mt-6 text-3xl font-bold text-primary md:text-4xl">
              {t("pricingFrom")}
            </p>
            <p className="mt-3 text-gray-500">{t("pricingNotes")}</p>
            <Link
              href="/pricing"
              className="mt-8 inline-block text-sm font-medium text-gray-600 underline underline-offset-4 transition-colors hover:text-primary"
            >
              {t("nav.pricing")} →
            </Link>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="bg-gray-900 px-6 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              {t("ctaTitle")}
            </h2>
            <Link
              href="/draft/new"
              className="mt-8 inline-block rounded-full bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-primary-dark hover:shadow-xl"
            >
              {t("ctaButton")}
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Step({
  icon,
  number,
  title,
  description,
}: {
  icon: React.ReactNode;
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-gray-100 transition-shadow hover:shadow-lg">
        {icon}
      </div>
      <span className="mt-5 block text-3xl font-extrabold text-primary">
        {number}
      </span>
      <h3 className="mt-2 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">
        {description}
      </p>
    </div>
  );
}

function UseCaseCard({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-5 transition-shadow hover:shadow-md">
      {icon}
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
  );
}

function TrustItem({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      {icon}
      <span className="mt-3 text-sm font-medium text-gray-200">{label}</span>
    </div>
  );
}
