import { Choir } from './choir';

// Dieses Interface beschreibt die Antwort, die wir vom Backend
// beim Wechseln des Chors erwarten.
export interface SwitchChoirResponse {
  message: string;
  accessToken: string;
  activeChoir: Choir;
}
