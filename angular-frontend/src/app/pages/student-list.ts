import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Student } from '../core/models';
import { StudentRow } from './student-row';

@Component({
  selector: 'app-student-list',
  imports: [StudentRow],
  templateUrl: './student-list.html',
  styleUrl: './student-list.css',
})
export class StudentList {
  @Input({ required: true }) items: Student[] = [];
  @Input({ required: true }) total = 0;
  @Input({ required: true }) loading = false;
  @Input({ required: true }) error = '';
  @Input({ required: true }) page = 1;
  @Input({ required: true }) pages = 1;
  @Input({ required: true }) size = 10;
  @Input({ required: true }) deleting: string | null = null;
  @Input({ required: true }) isAdmin = false;
  @Output() retryRequested = new EventEmitter<void>();
  @Output() deleteRequested = new EventEmitter<Student>();
  @Output() pageChanged = new EventEmitter<number>();
  @Output() sizeChanged = new EventEmitter<number>();

  changeSize(event: Event): void {
    this.sizeChanged.emit(Number((event.target as HTMLSelectElement).value));
  }
}
