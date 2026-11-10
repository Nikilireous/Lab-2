import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Student } from '../core/models';

@Component({
  selector: 'tr[app-student-row]',
  imports: [RouterLink],
  templateUrl: './student-row.html',
  styleUrl: './student-row.css',
})
export class StudentRow {
  @Input({ required: true }) student!: Student;
  @Input() isDeleting = false;
  @Input() isAdmin = false;
  @Output() deleteRequested = new EventEmitter<Student>();
}
