"use client";

import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

import { Link } from "../../i18n/navigation";
import { AppButton, getAppButtonClassName } from "../ui/app-button";

type ActionButtonVariant = "primary" | "secondary";
const DESKTOP_MIN_WIDTH_CLASS_NAME = "lg:w-auto lg:min-w-[10rem]";

interface ActionButtonContentProps {
  children: ReactNode;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  trailingMeta?: ReactNode;
}

interface SharedActionProps {
  variant?: ActionButtonVariant;
  fullWidth?: boolean;
  desktopMinWidth?: boolean;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  trailingMeta?: ReactNode;
  loading?: boolean;
}

export type ActionButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> &
  SharedActionProps;

export type ActionLinkProps = Omit<
  ComponentProps<typeof Link>,
  "children" | "className"
> &
  SharedActionProps;

function ActionButtonContent({
  children,
  leadingIcon,
  trailingIcon,
  trailingMeta,
}: ActionButtonContentProps) {
  return (
    <>
      {leadingIcon}
      <span className="min-w-0 truncate">{children}</span>
      {trailingMeta}
      {trailingIcon}
    </>
  );
}

export function ActionButton({
  variant = "primary",
  fullWidth = false,
  desktopMinWidth = false,
  className = "",
  contentClassName = "",
  children,
  leadingIcon,
  trailingIcon,
  trailingMeta,
  loading = false,
  disabled,
  type = "button",
  ...props
}: ActionButtonProps) {
  return (
    <AppButton
      type={type}
      disabled={disabled}
      loading={loading}
      variant={variant}
      fullWidth={fullWidth}
      className={[
        "min-w-0 flex-nowrap",
        desktopMinWidth ? DESKTOP_MIN_WIDTH_CLASS_NAME : "",
        contentClassName,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      leadingIcon={leadingIcon}
      trailingIcon={trailingIcon}
      trailingMeta={trailingMeta}
      {...props}
    >
      {children}
    </AppButton>
  );
}

export function ActionLink({
  variant = "secondary",
  fullWidth = false,
  desktopMinWidth = false,
  className = "",
  contentClassName = "",
  children,
  leadingIcon,
  trailingIcon,
  trailingMeta,
  loading = false,
  ...props
}: ActionLinkProps) {
  return (
    <Link
      className={getAppButtonClassName({
        variant,
        fullWidth,
        className: [
          "min-w-0 flex-nowrap whitespace-nowrap",
          desktopMinWidth ? DESKTOP_MIN_WIDTH_CLASS_NAME : "",
          className,
        ]
          .filter(Boolean)
          .join(" "),
      })}
      {...props}
    >
      <span
        className={["flex min-w-0 items-center justify-center gap-2", contentClassName]
          .filter(Boolean)
          .join(" ")}
      >
        <ActionButtonContent
          leadingIcon={loading ? null : leadingIcon}
          trailingIcon={loading ? null : trailingIcon}
          trailingMeta={loading ? null : trailingMeta}
        >
          {children}
        </ActionButtonContent>
      </span>
    </Link>
  );
}
