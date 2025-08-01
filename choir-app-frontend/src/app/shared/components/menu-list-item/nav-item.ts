import { BehaviorSubject, Observable, Subject, Subscription } from "rxjs";

export interface NavItem {
    displayName: string;
    visibleSubject?: Observable<boolean>;
    visible?: boolean;
    iconName?: string;
    svgIconName?: string;
    route?: string;
    page?: string;
    children?: NavItem[];
  }