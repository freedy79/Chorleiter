import { Injectable, Inject } from '@angular/core';
import { NativeDateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { Platform } from '@angular/cdk/platform';

@Injectable()
export class CustomDateAdapter extends NativeDateAdapter {
    constructor(@Inject(MAT_DATE_LOCALE) matDateLocale: string, platform: Platform) {
        super(matDateLocale, platform);
        // Setze das Locale explizit auf Deutsch
        this.setLocale('de-DE');
    }

    override getFirstDayOfWeek(): number {
        // Montag als erster Wochentag (0 = Sonntag, 1 = Montag)
        return 1;
    }
}
