import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/auth';
import { LoginPage } from './pages/login';
import { RegisterPage } from './pages/register';
import { ProfilePage } from './pages/profile';
import { StudentsPage } from './pages/students';
import { StudentPage } from './pages/student';
import { StudentFormPage } from './pages/student-form';

export const routes: Routes = [
  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  { path: 'profile', component: ProfilePage, canActivate: [authGuard] },
  { path: 'students', component: StudentsPage, canActivate: [authGuard] },
  { path: 'students/new', component: StudentFormPage, canActivate: [authGuard, adminGuard] },
  { path: 'students/:id/edit', component: StudentFormPage, canActivate: [authGuard, adminGuard] },
  { path: 'students/:id', component: StudentPage, canActivate: [authGuard] },
  { path: '', redirectTo: 'students', pathMatch: 'full' },
  { path: '**', redirectTo: 'students' },
];
