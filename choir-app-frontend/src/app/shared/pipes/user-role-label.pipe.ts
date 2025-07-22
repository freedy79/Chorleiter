import { Pipe, PipeTransform } from '@angular/core';

/**
 * Wandelt Benutzerrollen in ihre deutschen Bezeichnungen um.
 */
@Pipe({
  name: 'userRoleLabel',
  standalone: true
})
export class UserRoleLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    switch (value) {
      case 'director':
        return 'Dirigent';
      case 'choir_admin':
        return 'Chor-Admin';
      case 'admin':
        return 'Administrator';
      case 'demo':
        return 'Demo';
      case 'singer':
        return 'Sänger';
      default:
        return value;
    }
  }
}
