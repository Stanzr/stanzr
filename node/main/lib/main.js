
var common = require('./common')

var connect = common.connect
var express = common.express
var mongo   = common.mongo
var now     = common.now
var util    = common.util
var eyes    = common.eyes
var assert  = common.assert
var Seneca  = common.seneca

var log     = common.log


var main = {}



function sendcode(code,res) {
  try {
    res.writeHead(code)
    res.end()
  }
  catch( e ) {
    log('send',code,e)
  }
}
function lost(res) { sendcode(404,res) } 
function bad(res,e) { sendcode(400,res),log(e) } 



var view = {

}


main.api = {
  ping: function(req,res) {
    var kf = {
      node:function(req,res){
        common.sendjson(res,{ok:true,now:new Date()})
      },
      mongo:function(req,res){
        var start = new Date()
        main.seneca.act({on:'stanzr',cmd:'ping-mongo'},function(err,ent){
          var end = new Date()
          if( err ) {
            bad(res,err)
          }
          else {
            common.sendjson(res,{ok:true,end:end,dur:(end.getTime()-start.getTime()),a:ent?ent.a:null})
          }
        })
      }
    }[req.params.kind];

    kf ? kf(req,res) : lost(res)
  },

  user: {
    post: function(req,res) {
      common.readjson(req,res,function(json){
        log('user.post json ',json)
        common.sendjson(res,{ok:true})
      },bad)
    }
  }

}


function initseneca( seneca ) {
  main.seneca = seneca
  main.ent    = seneca.make('stanzr',null,null)
  
  seneca.add({on:'stanzr',cmd:'time'},function(args,seneca,cb){
    cb(null,new Date())
  })

  seneca.add({on:'stanzr',cmd:'ping-mongo'},function(args,seneca,cb){
    var test = main.ent.make$('sys','test')
    test.load$({a:1},cb)
  })
}



var confmap = {
  live: {
    mongo: {
      host:'flame.mongohq.com',
      port:27059,
      name:'stanzr01',
      username:'first',
      password:'S2QP11CC'
    }
  },
  test: {
    mongo: {
      host:'localhost',
      port:27017, 
      name:'stanzr01',
    }
  }
}

var env = process.argv[('/usr/local/bin/expresso'==process.argv[1]?3:2)] || 'test'
log('environment:',env)

var conf = confmap[env]


var mongourl = 
  'mongo://'+
  (conf.mongo.username?conf.mongo.username+':'+conf.mongo.password+'@':'')+
  conf.mongo.host+':'+conf.mongo.port+'/'+conf.mongo.name

log(mongourl)

//mongo.init(
//  conf.mongo,
//  function(db){
//    main.db = db
Seneca.init(
  {logger:log,
   entity:mongourl,
   plugins:['user']
  },
  function(err,seneca){
    if( err ) {
      log(err)
      process.exit(1)
    }

    initseneca(seneca)

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
    log("port", app.address().port)


    app.use( connect.logger() )
    app.use( connect.static( __dirname + '/../../../site/public') )

    app.use( 
      connect.router(function(capp){
        capp.get('/api/ping/:kind',function(req,res){
          main.api.ping(req,res)
        })

        capp.post('/api/user/register',function(req,res){
          main.api.user.post(req,res)
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

module.exports = main

