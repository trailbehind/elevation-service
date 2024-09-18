/**
 * Node's behavior is a bit weird with ES module imports. If this code is included inline in
 * `server.ts`, it doesn't get run in time; the code in `server.ts` runs first (unclear why) before
 * the environment variables are set up, and crashes. However, if this code is executed as the body
 * of an import, everything is fine. :shrug:
 */

import dotenv from 'dotenv';

switch (process.env.NODE_ENV) {
    case 'development':
        dotenv.config();
        break;
    case 'test':
        dotenv.config({path: '.test.env'});
        break;
}
