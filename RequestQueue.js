import EventEmitter from 'events';
import onFinished from 'on-finished';

/*
 * RequestQueue to ensure that only a single request is executing at a time.
 *
 * This middleware intercepts requests as they come in by delaying executing of
 * next() until previous requests finish processing. This complements external
 * server configuration via haproxy or similar that restricts concurrent
 * requests. This per-process queue allows an application level guarantee of
 * mutual exclusion of requests.  This allows that behavior to be depended
 * upon, allowing for safe (but careful) use of global state. Additionally,
 * this allows for lifecycle hooks to be added for the periods when no request
 * is currently executing, before or after the request has been run. These are
 * ideal points to install behavior to reset global state or perform actions
 * against the server at a "clean state" point in time.
 */
export default class RequestQueue extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.current = null;

    this.outerMiddleware = this.outerMiddleware.bind(this);
    this.innerMiddleware = this.innerMiddleware.bind(this);
    this.finishCurrent = this.finishCurrent.bind(this);
  }

  process() {
    if (!this.current) {
      this.current = this.queue.shift();
      this.emit('queueLength', this.queue.length);

      if (this.current) {
        this.emit('beforeRequest');
        this.current.start();
      }
    } else {
      this.emit('queueLength', this.queue.length);
    }
  }

  /*
   * Outer middleware must be the very first middleware installed on the app.
   * This intercepts and begins queueing the request.
   */
  outerMiddleware(req, res, next) {
    const job = { req, res, start: next };

    this.push(job);
  }

  /*
   * Inner middleware must be last middleware installed before endpoints.  This
   * is only necessary because on-finished executes its callbacks in the order
   * in which they were installed.  We need this to be innermost so that we
   * advance the queue only after the request and all other on-finished
   * callbacks complete.
   *
   * Not adding this middleware will result in the queue never being drained.
   */
  innerMiddleware(req, res, next) {
    onFinished(res, this.finishCurrent);
    next();
  }


  push(job) {
    this.queue.push(job);
    this.process();
  }

  finishCurrent() {
    this.current = null;
    this.emit('afterRequest');
    this.process();
  }
}
