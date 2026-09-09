import { createApp } from "./app";
import { env } from "./env";

const app = createApp();
app.listen(env.port, () => {
  console.log(`ANUBANDH PEP listening on :${env.port}`);
});
