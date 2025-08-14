import { BehaviorSubject, Observable, Subject, Subscription } from "rxjs";

export interface NavItem {
    /**
     * Unique key to identify the item in configuration settings.
     */
    key?: string;
    displayName: string;
    visibleSubject?: Observable<boolean>;
    visible?: boolean;
    iconName?: string;
    svgIconName?: string;
    route?: string;
    page?: string;
    children?: NavItem[];
  }