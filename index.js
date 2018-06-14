const express = require('express');
const process = require('process');
const { poolHall, startPoolHall } = require('pool-hall');

const app = express();

function timeToMs(tuple) {
  return (tuple[0] * 1000) + (tuple[1] / 1000000);
}

function spinWait(ms) {
  const start = process.hrtime();

  while(timeToMs(process.hrtime(start)) < ms) {
  }
}

startPoolHall(
  {
    workerCount: 4,
    // never go unhealthy because of dead processes
    minWorkerCount: 0,
    workerEnv: id => ({ PORT: 9001 + (+id) })
  },
  // supervisor
  () => {
    process.title = 'node example_app supervisor';

    process.on('SIGTERM', () => {
      console.log('Got SIGTERM. Going down.');
      poolHall.stop().then(() => process.exit(0), () => process.exit(1));
    });

    process.on('SIGINT', () => {
      console.log('Got SIGINT. Going down.');
      poolHall.stop().then(() => process.exit(0), () => process.exit(1));
    });

    poolHall.on('workerUp', (id) => {
      console.log(`Worker ${id} is up`);
    });

    poolHall.on('workerDown', (id, info) => {
      console.log(`Worker ${id} is down with code ${info.signalCode || info.exitCode}`);
    });
  },
  // worker
  (ready) => {
    const workerId = poolHall.worker.id;

    process.title = `node example_app worker[${workerId}]`;

    const app = express();

    let healthy = false;
    let booted = false;

    poolHall.worker.on('healthy', () => {
      if (!healthy) {
        console.log(`Worker ${workerId} is healthy`);
      }
      healthy = true;
      booted = true;
    });

    poolHall.worker.on('unhealthy', () => {
      if (healthy && booted) {
        console.log(`Worker ${workerId} is unhealthy`);
      }
      healthy = false;
    });

    app.get('/health', (req, res) => {
      if (healthy) {
        res.type('text').send('OK\n');
      } else {
        res.status(503).send('NOPE\n');
      }
    });

    app.get("/infinite", (req, res) => {
      while(true) {
      }
      res.type('text').send('This is awkward\n');
    });

    app.get('/render', (req, res) => {
      spinWait(200);
      res.type('text').send('DONE\n');
    });

    const server = app.listen(process.env.PORT, "localhost", ready);

    poolHall.worker.onShutdown = () => server.close(() => process.exit(0));
  }
);
