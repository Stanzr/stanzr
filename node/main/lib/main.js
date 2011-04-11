
var common = require('./common')

var connect = common.connect

var mongo = common.mongo


var app = {}

mongo.init(
  {
    host:'flame.mongohq.com',
    port:27059,
    name:'stanzr01',
    username:'first',
    password:'S2QP11CC'
  },
  function(db){
    app.db = db

    connect(
      connect.logger()
      ,connect.router(function(app){
        app.get('/api/ping/node',function(req,res){
          common.sendjson(res,{ok:true,now:new Date()})
        }),

        app.get('/api/ping/mongo',function(req,res){
          var start = new Date()
          mongo.coll('test',function(testcoll){
            testcoll.findOne({a:1},function(doc){
              var end = new Date()
              common.sendjson(res,{ok:true,end:end,dur:(end.getTime()-start.getTime())})
            })
          })
        })
        
      })
    ).listen(8080)

  }
)