import { Component, OnInit, OnDestroy } from '@angular/core';
import { MediaMatcher } from '@angular/cdk/layout';
import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { AdminStatusWidgetComponent } from './admin-status-widget.component';

interface AdminSection {
  id: string;
  label: string;
  icon: string;
  route: string;
  description: string;
  category: 'organization' | 'content' | 'communication' | 'security' | 'system';
  badge?: number;
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatSidenavModule,
    MatTabsModule,
    MatBadgeModule,
    AdminStatusWidgetComponent
  ]
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  mobileQuery: MediaQueryList;
  private mobileQueryListener: () => void;
  private destroy$ = new Subject<void>();

  isSidebarOpen = true;
  selectedSection: AdminSection | null = null;

  adminSections: AdminSection[] = [
    {
      id: 'users',
      label: 'Benutzer',
      icon: 'people',
      route: '/admin/users',
      description: 'Benutzer und Rollen verwalten',
      category: 'organization',
      badge: 0
    },
    {
      id: 'organizations',
      label: 'Organisationen',
      icon: 'account_balance',
      route: '/admin/organizations',
      description: 'Chöre, Gemeinden, Bezirke',
      category: 'organization'
    },
    {
      id: 'mail-management',
      label: 'E-Mail Management',
      icon: 'mail',
      route: '/admin/mail-management',
      description: 'Templates, Logs, Einstellungen',
      category: 'communication'
    },
    {
      id: 'pdf-templates',
      label: 'PDF-Templates',
      icon: 'picture_as_pdf',
      route: '/admin/pdf-templates',
      description: 'Layout & Export-Templates verwalten',
      category: 'communication'
    },
    {
      id: 'metadata',
      label: 'Metadaten',
      icon: 'library_music',
      route: '/admin/metadata',
      description: 'Verlage, Komponisten, Autoren',
      category: 'content'
    },
    {
      id: 'data-enrichment',
      label: 'Datenanreicherung',
      icon: 'auto_awesome',
      route: '/admin/data-enrichment',
      description: 'Metadaten automatisch prüfen & ergänzen',
      category: 'content'
    },
    {
      id: 'security',
      label: 'Sicherheit & Monitoring',
      icon: 'security',
      route: '/admin/security',
      description: 'Login-Versuche, Protokolle, Backup',
      category: 'security'
    },
    {
      id: 'pwa-config',
      label: 'PWA Konfiguration',
      icon: 'install_mobile',
      route: '/admin/pwa-config',
      description: 'VAPID Keys, Service Worker, Cache',
      category: 'system'
    },
    {
      id: 'system',
      label: 'Systemeinstellungen',
      icon: 'settings',
      route: '/admin/system-settings',
      description: 'PayPal, Frontend-URLs, Imprint',
      category: 'system'
    }
  ];

  sectionsByCategory: { [key: string]: AdminSection[] } = {
    organization: [] as AdminSection[],
    content: [] as AdminSection[],
    communication: [] as AdminSection[],
    security: [] as AdminSection[],
    system: [] as AdminSection[]
  };

  constructor(
    changeDetectorRef: ChangeDetectorRef,
    media: MediaMatcher,
    private router: Router
  ) {
    this.mobileQuery = media.matchMedia('(max-width: 600px)');
    this.mobileQueryListener = () => changeDetectorRef.markForCheck();
    this.mobileQuery.addListener(this.mobileQueryListener);
  }

  ngOnInit(): void {
    this.organizeSections();
  }

  ngOnDestroy(): void {
    this.mobileQuery.removeListener(this.mobileQueryListener);
    this.destroy$.next();
    this.destroy$.complete();
  }

  private organizeSections(): void {
    this.adminSections.forEach(section => {
      const category = section.category as keyof typeof this.sectionsByCategory;
      this.sectionsByCategory[category].push(section);
    });
  }

  navigate(section: AdminSection): void {
    this.selectedSection = section;
    this.router.navigate([section.route]);
  }

  getCategoryLabel(category: string): string {
    const labels: { [key: string]: string } = {
      organization: 'Organisation',
      content: 'Inhalte',
      communication: 'Kommunikation',
      security: 'Sicherheit',
      system: 'System'
    };
    return labels[category] || category;
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  get isMobile(): boolean {
    return this.mobileQuery.matches;
  }
}
