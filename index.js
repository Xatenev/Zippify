var router = require('router')();
var http = require('http');

router.get('/', function (req, res) {
	res.setHeader('Content-Type', 'text/plain; charset=utf-8');
	res.end('Hello World!');
});


http.createServer(function (req, res) {
	router(req, res, function() {

	});
}).listen(process.env.PORT || 8888);