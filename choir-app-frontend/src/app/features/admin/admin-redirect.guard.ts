import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

/**
 * Erzeugt einen Redirect-Guard, der eine ehemalige Einzelseite auf den
 * passenden Hub-Tab umleitet. So bleiben alte Links/Bookmarks gültig, ohne
 * dass Inhalte doppelt im Menü erscheinen.
 *
 * @param hubPath Hub-Segment unterhalb von /admin (z. B. 'organizations')
 * @param tab     optionaler Tab-Schlüssel, der als ?tab= übergeben wird
 */
export function redirectToHub(hubPath: string, tab?: string): CanActivateFn {
  return (): UrlTree => {
    const router = inject(Router);
    return router.createUrlTree(
      ['/admin', hubPath],
      tab ? { queryParams: { tab } } : {}
    );
  };
}
