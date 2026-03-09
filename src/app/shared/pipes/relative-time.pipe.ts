import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'relativeTime', standalone: true, pure: true })
export class RelativeTimePipe implements PipeTransform {
  transform(isoDate: string | null): string {
    if (!isoDate) return '—';
    const diffMs   = Date.now() - new Date(isoDate).getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);

    if (diffDays < 0)    return 'in the future';
    if (diffDays === 0)  return 'today';
    if (diffDays === 1)  return 'yesterday';
    if (diffDays < 7)    return `${diffDays} days ago`;
    if (diffDays < 30)   return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365)  return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }
}