import { crearApp } from './app.js';
import { cargarEnv } from './config/env.js';

const env = cargarEnv();
const app = crearApp(env);

app.listen(env.PORT, () => {
  console.log(`API escuchando en http://localhost:${String(env.PORT)}`);
});
