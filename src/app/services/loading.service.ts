import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private _loading = new BehaviorSubject<boolean>(false);
  public readonly loading$ = this._loading.asObservable();

  private activeRequests = 0;

  setLoading(isLoading: boolean) {
    if (isLoading) {
      this.activeRequests++;
    } else {
      this.activeRequests--;
    }

    if (this.activeRequests <= 0) {
      this.activeRequests = 0;
      this._loading.next(false);
    } else {
      this._loading.next(true);
    }
  }
}
