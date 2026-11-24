import { bootstrapApplication } from '@angular/platform-browser';
import './styles.css';
import { appConfig } from './app/app.config';
import { App } from './app/app';

localStorage.removeItem('lab3-auth');
localStorage.removeItem('lab4-auth');

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
