import type { RouteMeta } from '@analogjs/router';
import { authGuard } from '../../services/auth';

export const routeMeta: RouteMeta = { canActivate: [authGuard] };
export { StudentsPage as default } from './students';
