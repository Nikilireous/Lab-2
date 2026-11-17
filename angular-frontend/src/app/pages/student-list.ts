import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Student } from '../core/models';
import { StudentRow } from './student-row';

@Component({
  selector: 'app-student-list',
  imports: [StudentRow],
  templateUrl: './student-list.html',
  styleUrl: './student-list.css',
})
export class StudentList implements OnChanges {
  @ViewChild('viewport') viewport?: ElementRef<HTMLElement>;
  @Input({ required: true }) items: Student[] = [];
  @Input({ required: true }) total = 0;
  @Input({ required: true }) loading = false;
  @Input({ required: true }) error = '';
  @Input({ required: true }) page = 1;
  @Input({ required: true }) pages = 1;
  @Input({ required: true }) size = 10;
  @Input({ required: true }) resetKey = 0;
  @Input({ required: true }) deleting: string | null = null;
  @Input({ required: true }) isAdmin = false;
  @Output() retryRequested = new EventEmitter<void>();
  @Output() deleteRequested = new EventEmitter<Student>();
  @Output() pageChanged = new EventEmitter<number>();
  @Output() sizeChanged = new EventEmitter<number>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resetKey'] && !changes['resetKey'].firstChange) {
      queueMicrotask(() => this.viewport?.nativeElement.scrollTo({ top: 0 }));
    }
  }

  onScroll(event: Event): void {
    if (this.size !== 0 || this.loading) return;
    const viewport = event.target as HTMLElement;
    const page = Math.min(this.pages, Math.floor((viewport.scrollTop + viewport.clientHeight / 2) / (100 * 96)) + 1);
    if (page !== this.page) this.pageChanged.emit(page);
  }

  changeSize(event: Event): void {
    this.sizeChanged.emit(Number((event.target as HTMLSelectElement).value));
  }
}
