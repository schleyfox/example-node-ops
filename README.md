# Example nginx, haproxy, pool-hall, node application

## Running

This is designed to work on linux systems where you have node, npm, haproxy,
and nginx installed, ideally from your distro's package manager of choice.

Make sure you have ports 9000-9005 open

### nginx

```
nginx -c nginx.conf -p ./
```

### haproxy

```
haproxy -f haproxy_example.cfg
```

### node example_app

```
npm install
npm start
```

With this you should be able to make requests on http://localhost:9000/health
and see 'OK'
