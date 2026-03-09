import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink }       from '@angular/router';
import { MatButton }        from '@angular/material/button';
import { MatIcon }          from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

import { DomainOverviewBase }   from '../_shared/domain-overview.base';
import { FlashcardComponent }   from '../../../shared/components/flashcard/flashcard.component';
import { ProgressRingComponent } from '../../../shared/components/progress-ring/progress-ring.component';
import { ConfidenceRating }      from '../../../core/models/flashcard.model';

@Component({
  selector: 'app-java-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, MatButton, MatIcon, MatProgressSpinner,
    FlashcardComponent, ProgressRingComponent,
  ],
  templateUrl: '../_shared/domain-overview.template.html',
})
export class JavaOverviewComponent extends DomainOverviewBase {
  protected override readonly domainId    = 'java' as const;
  protected override readonly domainLabel = 'Java';
}