"use client";

import { safeRedirect } from "@/lib/redirectUtils";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function ParamRedirect({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  useEffect(() => {
    if (redirectTo) {
      safeRedirect(redirectTo);
    }
  }, [redirectTo]);

  return <>{children}</>;
}
