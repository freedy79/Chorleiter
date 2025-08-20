import { Choir } from './choir';

/**
 * Represents the structure of a User object, typically received after
 * logging in or fetching the current user's profile.
 */
export interface User {
  /**
   * The unique identifier for the user.
   */
  id: number;

  /**
   * The user's full name.
   */
  name: string;

  /**
   * The user's login email address.
   */
  email: string;

  street?: string;
  postalCode?: string;
  city?: string;
  voice?: string;
  shareWithChoir?: boolean;


  roles?: ('director' | 'choir_admin' | 'admin' | 'demo' | 'singer' | 'librarian')[];

  /**
   * The JSON Web Token received upon successful login.
   * This property is only present in the response from the sign-in endpoint.
   * It is optional ('?') because the profile endpoint (/users/me) does not return it.
   */
  accessToken?: string;

  activeChoir?: Choir;
  availableChoirs?: Choir[];
  lastDonation?: string;
  lastLogin?: string;
}

export interface UserInChoir extends User {
    membership?: { // Daten aus der Junction-Tabelle
        rolesInChoir: ('director' | 'choir_admin' | 'organist' | 'singer')[];
        registrationStatus: 'REGISTERED' | 'PENDING';
    }
}
