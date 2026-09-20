import 'dotenv/config';
import { app } from './app.js';

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Sajilo Bazar API listening on port ${port}`);
});
