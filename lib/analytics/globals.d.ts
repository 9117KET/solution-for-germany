export {};

declare global {
  interface Window {
    /**
     * The partner slug of this page visit, from `?via=`. Set by the early
     * script in `app/layout.tsx`, read by `currentPartner()` in
     * `lib/analytics`. Memory only, never storage.
     */
    __anspruchPartner?: string;
  }
}
