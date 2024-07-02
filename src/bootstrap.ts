import { bootstrapModule } from '@onecx/angular-webcomponents';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

bootstrapModule(AppModule, 'shell', environment.production);
