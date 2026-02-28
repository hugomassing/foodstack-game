import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function apiPlugin() {
  return {
    name: 'api-routes',
    configureServer(server) {
      const env = loadEnv('development', process.cwd(), '');
      Object.assign(process.env, env);

      server.middlewares.use('/api/generate-recipe', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        for await (const chunk of req) body += chunk;

        try {
          const { dishName, difficulty } = JSON.parse(body);
          const { generateRecipe } = await server.ssrLoadModule('/api/generate-recipe.js');
          const recipe = await generateRecipe(dishName, difficulty);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(recipe));
        } catch (err) {
          const status = err.status || 500;
          const message = status < 500 ? err.message : 'Failed to generate recipe. Please try again.';
          if (status >= 500) console.error('Recipe generation failed:', err);
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), apiPlugin()],
});
