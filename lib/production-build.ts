/**
 * True in TestFlight / App Store release builds (Metro dev client is excluded).
 * Use to hide demo flows, OAuth, and other review-risk UI.
 */
export function isProductionBuild(): boolean {
  return !__DEV__;
}
