import { ActivatedRoute, Router } from '@angular/router';

/**
 * Liest den aktiven Tab aus dem ?tab=-Query-Parameter und liefert den passenden
 * Tab-Index. Fällt auf 0 zurück, wenn kein/kein gültiger Schlüssel gesetzt ist.
 */
export function readTabIndex(route: ActivatedRoute, tabKeys: string[]): number {
  const tab = route.snapshot.queryParamMap.get('tab');
  if (!tab) {
    return 0;
  }
  const index = tabKeys.indexOf(tab);
  return index >= 0 ? index : 0;
}

/**
 * Spiegelt den aktiven Tab-Index in den ?tab=-Query-Parameter. Ermöglicht
 * teilbare Deeplinks und erhält die Tab-Auswahl beim Neuladen.
 */
export function writeTabIndex(
  router: Router,
  route: ActivatedRoute,
  tabKeys: string[],
  index: number
): void {
  const tab = tabKeys[index];
  if (!tab) {
    return;
  }
  router.navigate([], {
    relativeTo: route,
    queryParams: { tab },
    queryParamsHandling: 'merge',
    replaceUrl: true,
  });
}
