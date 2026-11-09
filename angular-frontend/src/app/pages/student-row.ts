import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../core/auth';
import { Student } from '../core/models';

@Component({
  selector: 'tr[app-student-row]',
  imports: [RouterLink],
  templateUrl: './student-row.html',
})
export class StudentRow {
  @Input({ required: true }) student!: Student;
  @Input() isDeleting = false;
  @Output() deleteRequested = new EventEmitter<Student>();
  readonly auth = inject(AuthStore);
}
