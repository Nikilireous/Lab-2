import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Student } from '../../models/student';
import { StudentRow } from '../student-row/student-row';

@Component({
  selector: 'app-student-list',
  imports: [StudentRow],
  templateUrl: './student-list.html',
  styleUrl: './student-list.css',
})
export class StudentList implements OnChanges, OnDestroy {
  readonly chunkHeight = 100 * 96;
  private scrollTimer?: ReturnType<typeof setTimeout>;
  private pendingPage = 1;
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
    if (this.size === 0 && changes['page'] && !changes['page'].firstChange && !changes['resetKey']) {
      const previous = changes['page'].previousValue as number;
      const oldTop = previous > 1 ? this.chunkHeight : 0;
      const newTop = this.page > 1 ? this.chunkHeight : 0;
      const shift = (previous - this.page) * this.chunkHeight + newTop - oldTop;
      queueMicrotask(() => {
        const viewport = this.viewport?.nativeElement;
        if (viewport) viewport.scrollTop += shift;
      });
    }
    if (changes['resetKey'] && !changes['resetKey'].firstChange) {
      clearTimeout(this.scrollTimer);
      this.scrollTimer = undefined;
      this.pendingPage = 1;
      queueMicrotask(() => this.viewport?.nativeElement.scrollTo({ top: 0 }));
    }
    if (changes['loading'] && !this.loading && this.size === 0) {
      queueMicrotask(() => {
        const viewport = this.viewport?.nativeElement;
        if (viewport) this.checkScroll(viewport);
      });
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.scrollTimer);
  }

  onScroll(event: Event): void {
    this.checkScroll(event.target as HTMLElement);
  }

  private checkScroll(viewport: HTMLElement): void {
    if (this.size !== 0) return;
    const topSpace = this.page > 1 ? this.chunkHeight : 0;
    const position = (this.page - 1) * this.chunkHeight + viewport.scrollTop - topSpace;
    const page = Math.max(1, Math.min(this.pages, Math.floor((position + viewport.clientHeight / 2) / this.chunkHeight) + 1));
    this.pendingPage = page;
    if (page === this.page) return;
    if (this.scrollTimer) return;
    this.scrollTimer = setTimeout(() => {
      this.scrollTimer = undefined;
      if (this.pendingPage !== this.page) this.pageChanged.emit(this.pendingPage);
    }, 100);
  }

  changeSize(event: Event): void {
    this.sizeChanged.emit(Number((event.target as HTMLSelectElement).value));
  }
}
