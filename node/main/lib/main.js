
var common = require('./common')

var connect = common.connect
var express = common.express
var mongo   = common.mongo
var now     = common.now



var main = {}


mongo.init(
/*
  {
    host:'flame.mongohq.com',
    port:27059,
    name:'stanzr01',
    username:'first',
    password:'S2QP11CC'
  },
*/
  {
    host:'localhost',
    name:'stanzr01',
  },
  function(db){
    main.db = db

    var app = main.app = express.createServer();

    app.set('views', __dirname + '/../../../site/views');
    app.set('view engine', 'ejs');

    /*
    app.get('/', function(req, res){
      res.render('index', {locals: {
        title: 'NowJS + Express Example'
      }});
    });
    */

    app.get('/member', function(req, res){
      res.render('member', {locals: {
        title: 'Member'
      }});
    });

    app.listen(8080);
    console.log("Express server listening on port %d", app.address().port);


    app.use( connect.logger() )
    app.use( connect.static( __dirname + '/../../../site/public') )

    app.use( 
      connect.router(function(capp){
        capp.get('/api/ping/node',function(req,res){
          common.sendjson(res,{ok:true,now:new Date()})
        }),
        
        capp.get('/api/ping/mongo',function(req,res){
          var start = new Date()
          mongo.coll('test',function(testcoll){
            testcoll.findOne({a:1},function(doc){
              var end = new Date()
              common.sendjson(res,{ok:true,end:end,dur:(end.getTime()-start.getTime())})
            })
          })
        })
      })
    )


    var everyone = now.initialize(app);

    everyone.connected(function(){
      console.log("Joined: " + this.now.name);
    });

    everyone.disconnected(function(){
      console.log("Left: " + this.now.name);
    });

    everyone.now.distributeMessage = function(message){
      everyone.now.receiveMessage(this.now.name, message);
    };
  }
)



