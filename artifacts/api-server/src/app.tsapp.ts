import path from 'path';
import { fileURLToPath } from 'url';
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Servir les fichiers statiques du frontend (React build)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendPublic = path.resolve(__dirname, '../../africa-beauty/dist/public');
app.use(express.static(frontendPublic));

// Pour les routes non-API, renvoyer index.html (Single Page Application)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/ab-api')) return next();
  res.sendFile(path.join(frontendPublic, 'index.html'));
});

export default app;
