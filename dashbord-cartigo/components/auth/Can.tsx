"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/hooks/useAuth";

type CanProps = {
  permission: string;
  children: ReactNode;
};

export function Can({ permission, children }: CanProps) {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return null;
  }

  return <>{children}</>;
}
