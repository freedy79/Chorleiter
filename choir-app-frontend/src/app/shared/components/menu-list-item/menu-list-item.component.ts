import { takeUntil } from 'rxjs/operators';
import {
    Component,
    HostBinding,
    Input,
    OnInit,
    OnDestroy,
    ChangeDetectorRef,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import {
    animate,
    state,
    style,
    transition,
    trigger,
} from '@angular/animations';
import { Subject } from 'rxjs';
import { MaterialModule } from '@modules/material.module';
import { NavItem } from './nav-item';
import { NavService } from './nav-service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-menu-list-item',
    standalone: true,
    templateUrl: './menu-list-item.component.html',
    styleUrls: ['./menu-list-item.component.scss'],
    animations: [
        trigger('indicatorRotate', [
            state('collapsed', style({ transform: 'rotate(-90deg)' })),
            state('expanded', style({ transform: 'rotate(0deg)' })),
            transition(
                'expanded <=> collapsed',
                animate('225ms cubic-bezier(0.4,0.0,0.2,1)')
            ),
        ]),
    ],
    imports: [MaterialModule, CommonModule, RouterModule],
})
export class MenuListItemComponent implements OnInit, OnDestroy {
    expanded: boolean = false;
    @HostBinding('attr.aria-expanded') ariaExpanded = this.expanded;
    @Input() item?: NavItem;
    @Input() depth: number = 0;
    private ngUnsubscribe: Subject<void> = new Subject<void>();

    public isVisible = true;

    constructor(public navService: NavService, public router: Router, private cdRef: ChangeDetectorRef) {}

    ngOnInit() {
        if (this.depth === undefined) {
            this.depth = 0;
        }
        if (this.item?.visibleSubject) {
            this.item.visibleSubject
                .pipe(takeUntil(this.ngUnsubscribe))
                .subscribe((vis: boolean) => {
                    if (this.item?.visible != undefined) {
                        this.isVisible = this.item.visible;
                    } else {
                        this.isVisible = vis;
                    }
                    this.cdRef.detectChanges();
                });
        }

        //console.log(this.item.displayName);
        //console.log(this.item.visible);

        if (this.item?.visible != undefined) {
            this.isVisible = this.item.visible;
            this.cdRef.detectChanges();
            //console.log("changed to ");
            //console.log(this.isVisible);
        }

        this.navService.currentUrl.subscribe((url: string) => {
            if (this.item?.route && url) {
                //console.log(`Checking '${this.item.route}' against '${url}'`);
                this.expanded = url.indexOf(`/${this.item.route}`) === 0;
                this.ariaExpanded = this.expanded;
                //console.log(`${this.item.route} is expanded: ${this.expanded}`);
            }
        });
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    onItemSelected(item: NavItem) {
        if (!item.children || !item.children.length) {
            if (item.route) {
                this.router.navigate([item.route]);
            }
        }
        if (item.children && item.children.length) {
            this.expanded = !this.expanded;
        }
    }
}
