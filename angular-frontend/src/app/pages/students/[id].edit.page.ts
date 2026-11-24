import type { RouteMeta } from '@analogjs/router';
import { authGuard, adminGuard } from '../../services/auth';

export const routeMeta: RouteMeta = { canActivate: [authGuard, adminGuard] };
export { StudentFormPage as default } from './student-form/student-form';
