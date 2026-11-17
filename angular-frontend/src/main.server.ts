import '@angular/platform-server/init';
import { renderStream } from '@analogjs/router/server';

import { App } from './app/app';
import { config } from './app/app.config.server';

export default renderStream(App, config);
