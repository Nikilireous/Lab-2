import type { RouteMeta } from '@analogjs/router';
import { authGuard } from '../../core/auth';

export const routeMeta: RouteMeta = { canActivate: [authGuard] };
export { StudentsPage as default } from '../students';
