/** Hand-off for the "/" shortcut: when pressed on another page we navigate to /search and focus its input on mount. */
let pending = false;
export const SEARCH_INPUT_ID = "site-search";
export function requestSearchFocus() {
  pending = true;
}
export function consumeSearchFocus(): boolean {
  const p = pending;
  pending = false;
  return p;
}
