import { PATH } from "./constants";

export function validateRedirectUrl(redirectTo: string): string {
  if (!redirectTo) {
    return PATH.dashboard;
  }

  try {
    if (redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
      return redirectTo;
    }

    const url = new URL(redirectTo);
    return url.pathname || PATH.dashboard;
  } catch {
    return PATH.dashboard;
  }
}

export function safeRedirect(redirectTo: string): void {
  const safeUrl = validateRedirectUrl(redirectTo);
  window.location.href = safeUrl;
}

export function getSafeRedirectFromParams(
  searchParams: URLSearchParams,
  paramName: string = "redirectTo",
): string {
  const redirectTo = searchParams.get(paramName);
  return validateRedirectUrl(redirectTo || "");
}
