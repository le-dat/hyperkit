"use client";

import { PATH, PATH_LOGIN_SUCCESS, REDIRECT_PARAM } from "@/lib/constants";
import { safeRedirect } from "@/lib/redirectUtils";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Loading from "@/app/loading";

export default function ProtectedRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();

  useEffect(() => {
    const redirectPath = pathname === "/" ? PATH_LOGIN_SUCCESS : pathname;
    if (user) {
      safeRedirect(redirectPath);
      return;
    }
    const redirectUrl = `${PATH.auth}?${REDIRECT_PARAM}=${encodeURIComponent(redirectPath)}`;
    router.push(redirectUrl);
  }, [pathname]);

  return <Loading />;
}
