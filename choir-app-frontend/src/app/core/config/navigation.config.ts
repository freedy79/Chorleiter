/**
 * Navigation Configuration
 * Zentrale Konfiguration für alle Navigationselemente der App
 */

export interface NavigationBreakpoints {
  handset: number;
  handsetLandscape: number;
  tablet: number;
  desktop: number;
}

export interface NavigationConfig {
  breakpoints: NavigationBreakpoints;
  bottomNav: {
    maxItems: number;
    height: {
      mobile: number;
      mobileSmall: number;
    };
    showLabels: {
      xs: boolean;
      sm: boolean;
    };
  };
  sidenav: {
    width: {
      desktop: number;
      mobile: string;
      mobileMax: number;
    };
    animation: {
      duration: {
        desktop: number;
        mobile: number;
      };
    };
  };
  toolbar: {
    height: {
      mobile: number;
      desktop: number;
    };
  };
  fab: {
    position: {
      bottom: {
        mobile: number;
        desktop: number;
      };
      right: {
        mobile: number;
        desktop: number;
      };
    };
    scrollThreshold: number;
  };
}

export const NAVIGATION_CONFIG: NavigationConfig = {
  breakpoints: {
    handset: 599,
    handsetLandscape: 959,
    tablet: 1024,
    desktop: 1025
  },
  bottomNav: {
    maxItems: 5, // Maximum Items in Bottom Navigation
    height: {
      mobile: 64,
      mobileSmall: 56 // für sehr kleine Screens
    },
    showLabels: {
      xs: false, // < 360px: Nur Icons
      sm: true   // >= 360px: Icons + Labels
    }
  },
  sidenav: {
    width: {
      desktop: 220,
      mobile: '85vw',
      mobileMax: 320
    },
    animation: {
      duration: {
        desktop: 250,
        mobile: 200
      }
    }
  },
  toolbar: {
    height: {
      mobile: 56,
      desktop: 64
    }
  },
  fab: {
    position: {
      bottom: {
        mobile: 80, // Über Bottom Navigation
        desktop: 24
      },
      right: {
        mobile: 16,
        desktop: 24
      }
    },
    scrollThreshold: 50 // px zum Verstecken beim Scrollen
  }
};

/**
 * Touch Target Sizes (nach Material Design & iOS Guidelines)
 */
export const TOUCH_TARGETS = {
  minimum: 44,      // iOS Minimum
  recommended: 48,  // Material Design
  icon: 40         // Icons in Buttons
} as const;

/**
 * Animation Timing Functions
 */
export const ANIMATIONS = {
  timingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)', // Material Standard Easing
  durations: {
    fast: 150,
    normal: 200,
    slow: 300
  }
} as const;

/**
 * Z-Index Hierarchy
 */
export const Z_INDEX = {
  content: 1,
  header: 100,
  sidenav: 1000,
  bottomNav: 1000,
  fab: 999,
  overlay: 1100,
  modal: 1200,
  snackbar: 1300
} as const;
