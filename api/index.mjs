// Vercel Serverless Function: all /api/* requests are rewritten here (see vercel.json).
// The Express app is pre-bundled by `pnpm --filter @workspace/api-server run build`.
import app from "../artifacts/api-server/dist/vercel.mjs";

export default app;
