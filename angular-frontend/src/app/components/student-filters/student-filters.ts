import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-student-filters',
  imports: [ReactiveFormsModule],
  templateUrl: './student-filters.html',
  styleUrl: './student-filters.css',
})
export class StudentFilters {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) sort = '';
  @Input({ required: true }) order = '';
  @Output() resetRequested = new EventEmitter<void>();
  @Output() sortChanged = new EventEmitter<string>();
  @Output() orderToggled = new EventEmitter<void>();

  changeSort(event: Event): void {
    this.sortChanged.emit((event.target as HTMLSelectElement).value);
  }
}
