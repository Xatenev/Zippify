var express = require('express');
var app = express();

var http = require('http');
var path = require('path');
var fs = require('fs');
var zip = require('node-zip')();
var multer = require('multer');
var crypto = require('crypto');
var upload = multer({dest: 'tmp/'});
var Datastore = require('nedb');


global.appRoot = path.resolve(__dirname);
app.use(express.static('public'));
var db = {};
db.files = new Datastore(
	{
		filename: global.appRoot + '/src/database/files.db',
		autoload: true
	});


/* ******** Define basic routes ************ */
app.get('/', function (req, res) {
	res.sendFile(global.appRoot + '/public/html/index.html');
});
app.get('/doc', function (req, res) {
	res.sendFile(global.appRoot + '/public/html/doc.html');
});
app.get('/license', function (req, res) {
	res.sendFile(global.appRoot + '/public/html/license.html');
});

/* ********** Define API routes ************ */
app.get('/api', function (req, res) {
	res.setHeader('Content-Type', 'application/json; charset=utf-8');
	res.end(JSON.stringify(
		{
			routes: {
				'find': {
					'url': '/api/find/:id/:name'
				},
				'create': {
					'url': '/api/create/:name'
				}
			}
		}
	));
});

app.get('/api/find/:id/:type', function (req, res) {

	db.files.findOne({
		id: req.params.id
	}, function (err, document) {
		if (req.params.type == 2) { // Download directly
			res.download(document.path);
		} else { // Output JSON
			res.setHeader('Content-Type', 'application/json; charset=utf-8');
			var output = {
				status: 500,
				message: 'Archive could not be found.'
			};
			if(document !== null && document.deleted == 0) {
				output = {
					status: 200,
					id: document.id,
					inserted_at: document.inserted_at,
					url: document.url
				}
			}
			res.end(JSON.stringify(output));
		}
	});

});

app.post('/api/create/:name', upload.array('files'), function (req, res) {
	res.setHeader('Content-Type', 'application/json; charset=utf-8');
	var filesProcessed = 0;
	(req.files).forEach(function (file) {
		fs.readFile(global.appRoot + '/' + file.path, '', function (err, data) {
			zip.file(req.params.name + '/' + file.originalname, data);
			fs.unlink(global.appRoot + '/' + file.path);
			filesProcessed++;

			if (filesProcessed == req.files.length) {
				crypto.randomBytes(12, function (err, buffer) {
					var zipFile = zip.generate({base64: false, compression: 'DEFLATE'});
					var token = buffer.toString('hex');
					var filePath = global.appRoot + '/files/' + token + '/' + req.params.name + '.zip';
					var fileUrl = req.protocol + '://' + req.get('host') + '/api/find/' + token + '/2';
					var inserted_at = new Date().toISOString().slice(0,19);
					fs.mkdirSync(global.appRoot + '/files/' + token);
					fs.writeFileSync(filePath, zipFile, 'binary');

					var databaseEntry = {
						id: token,
						inserted_at: inserted_at,
						url: fileUrl,
						path: filePath,
						deleted: 0
					};
					var jsonOutput = {
						id: token,
						inserted_at: inserted_at,
						url: fileUrl
					};

					db.files.insert(databaseEntry);
					res.end(JSON.stringify(jsonOutput));
				});
			}
		});


	});


});


app.listen(process.env.PORT || 8888);
