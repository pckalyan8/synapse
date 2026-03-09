import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink }          from '@angular/router';
import { MatButton, MatAnchor } from '@angular/material/button';
import { MatIcon }             from '@angular/material/icon';
import { MatProgressSpinner }  from '@angular/material/progress-spinner';
import { DomainOverviewBase }  from '../_shared/domain-overview.base';
import { FlashcardComponent }  from '../../../shared/components/flashcard/flashcard.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ProgressRingComponent } from '../../../shared/components/progress-ring/progress-ring.component';

@Component({
  selector: 'app-gen-ai-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButton, MatAnchor, MatIcon, MatProgressSpinner,
            FlashcardComponent, ProgressRingComponent],
  templateUrl: '../_shared/domain-overview.template.html',
  styleUrl: '../_shared/domain-overview.template.scss',
})
export class GenAiOverviewComponent extends DomainOverviewBase {
  protected override readonly domainId    = 'generative-ai' as const;
  protected override readonly domainLabel = 'Generative AI';
}