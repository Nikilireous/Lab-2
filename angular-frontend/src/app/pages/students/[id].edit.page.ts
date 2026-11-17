import type { RouteMeta } from '@analogjs/router';
import { authGuard, adminGuard } from '../../core/auth';

export const routeMeta: RouteMeta = { canActivate: [authGuard, adminGuard] };
export { StudentFormPage as default } from '../student-form';
