//  OpenShift sample Node application
var express = require('express'),
    app     = express(),
    morgan  = require('morgan'),
    fs      = require('fs'),
    bodyParser = require('body-parser');
    
Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

app.use(express.static('client/build_webpack'));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

const cors = (req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,PATCH,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    if ('OPTIONS' == req.method) {
      res.send(200);
    } else {
      next();
    }
  }
app.use(cors);

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL || 'mongodb://localhost:27017/vttc',
    mongoURLLabel = "";

if (process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;

  }
}

var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  if (db || mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  console.log('! DATABASE_SERVICE_NAME: ' + process.env.DATABASE_SERVICE_NAME);
  console.log('! mongoURL: ' + mongoURL);

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
        console.log(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

app.use((req, res, next) => {
    initDb();
    next();
});

app.post('/env', function (req, res) {
    res.json(process.env);
});

app.get('/test', function (req, res) {
    res.send('test1');
});

app.post('/book', function(req, res) {
    var col = db.collection('trip_details');
    col.insertOne({name: req.body.name,
        sailingCode: req.body.sailingCode});
    res.send('{ "status": "success" }');
});

function getProducts(Destination, CruiseLine, callback) {
    var col = db.collection('products');
    col.find({Destination: Destination.trim().toLowerCase(), CruiseLine: CruiseLine.trim().toLowerCase()}, function (err, objs) {
        if (err) {
            throw err;
        }
        callback(objs);
    });
}

app.post('/products', function (req, res) {
    if (req.body.Destination && req.body.CruiseLine) {
        getProducts(req.body.Destination, req.body.CruiseLine, function (data) {
            data.forEach(function (element) {
                console.log(element);
                res.send(element);
            });
            //res.send(data);
        });
    } else {
        res.send('{ "status": "error", "message": "missing request params" }');
    }
});

app.post('/initData', function (req, res) {
    db.collection('products').remove({});
    fs.readFile('json/products.json', 'utf8', function (err, data) {
        if (err) throw err;
        console.log(data);
        var json = JSON.parse(data);

        db.collection('products').insert(json, function(err, doc) {
            if (err) throw err;
        })
    });
    fs.readFile('json/products2.json', 'utf8', function (err, data) {
        if (err) throw err;
        console.log(data);
        var json = JSON.parse(data);

        db.collection('products').insert(json, function(err, doc) {
            if (err) throw err;
        })
    });
    fs.readFile('json/products3.json', 'utf8', function (err, data) {
        if (err) throw err;
        console.log(data);
        var json = JSON.parse(data);

        db.collection('products').insert(json, function(err, doc) {
            if (err) throw err;
        })
    });
    res.send('{ "status": "complete" }');
});

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
