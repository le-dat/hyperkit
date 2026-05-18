"use client";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { PATH, PATH_LOGIN_SUCCESS, REDIRECT_PARAM } from "@/lib/constants";

export default function Page() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get(REDIRECT_PARAM) || PATH_LOGIN_SUCCESS;

  return <AuthenticateWithRedirectCallback redirectUrl={redirectTo} />;
}
