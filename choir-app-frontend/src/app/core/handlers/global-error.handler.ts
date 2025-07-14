import { ErrorHandler, Injectable } from '@angular/core';
import { ErrorService } from '../services/error.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private errorService: ErrorService) {}

  handleError(error: any): void {
    const message = error?.message || error.toString();
    const stack = error instanceof Error ? error.stack : undefined;
    let file: string | undefined;
    let line: number | undefined;
    if (stack) {
      const first = stack.split('\n')[1];
      const match = first && first.match(/\((.*):(\d+):(\d+)\)/);
      if (match) {
        file = match[1];
        line = parseInt(match[2], 10);
      }
    }
    this.errorService.setError({
      message,
      stack,
      url: window.location.href,
      file,
      line
    });
    console.error(error);
  }
}
