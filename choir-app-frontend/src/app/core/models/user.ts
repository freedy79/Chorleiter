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


  role?: 'director' | 'choir_admin' | 'admin' | 'demo';

  /**
   * The JSON Web Token received upon successful login.
   * This property is only present in the response from the sign-in endpoint.
   * It is optional ('?') because the profile endpoint (/users/me) does not return it.
   */
  accessToken?: string;

  activeChoir?: Choir;
  availableChoirs?: Choir[];
  lastDonation?: string;
}

export interface UserInChoir extends User {
    membership?: { // Daten aus der Junction-Tabelle
        roleInChoir: 'director' | 'choir_admin' | 'organist';
        registrationStatus: 'REGISTERED' | 'PENDING';
        isOrganist: boolean;
    }
}
