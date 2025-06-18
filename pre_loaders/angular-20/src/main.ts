console.log('main.ts')
import('./bootstrap').then(() => console.log('bootstrap.ts loaded')).catch((err) => console.error(err))
