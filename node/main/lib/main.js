
var common = require('./common')

var connect = common.connect
var express = common.express
var mongo   = common.mongo
var now     = common.now
var util    = common.util
var eyes    = common.eyes
var assert  = common.assert
var Seneca  = common.seneca
var Cookies = common.cookies
var _       = common._

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
function bad(res,err) { sendcode(400,res); log(err) } 
function denied(res) { sendcode(401,res) } 
function failed(res,err) { sendcode(500,res); log(err) } 


function onwin(res,win){
  return function(err){
    util.debug('onwin:'+err)
    if( err ) {
      log('error',err)
      bad(res,err)
    }
    else {
      win && win.apply( this, [].slice.call(arguments,1) )
    }
  }
}




main.util = {
  authuser: function(req,res,cb) {
    cookies = new Cookies( req, res )  
    var token = cookies.get('stanzr')

    main.seneca.act(
      {
        tenant:'stanzr',
        on:'user',
        cmd:'auth',
        token:token,
      }, 
      function(err,out){
        if( err ) {
          failed(res,err)
        }
        else {
          if( out.auth ) {
            cb(null,out.user,out.login)
          }
          else {
            cb(null,null,null)
          }
        }
      }
    )
  }
}


main.chat = {
  get: function(chathash,cb) {
    var chatent = main.seneca.make('stanzr','app','chat')
    chatent.load$({chathash:chathash},function(err,chat){
      if( err ) {
        cb(err)
      }
      else if( chat ) {
        cb(null,chat)
      }
      else {
        chatent.chathash = chathash
        chatent.nicks = []
        chatent.save$(cb)
      }
    })
  },

  addnick: function(chathash,nick,cb) {
    util.debug('addnick '+chathash+' '+nick)
    main.chat.get(chathash,function(err,chat){
      if( err ) {
        cb(err)
      }
      else {
        var nicks = chat.nicks
        nicks.push(nick)
        chat.nicks = _.uniq(nicks)
        console.log(chat.nicks)
        chat.save$(cb)
      }
    })
  }
}

main.msg = {
  map: {},
  save: function(msg,cb) {
    var msgent = main.seneca.make('stanzr','app','msg')
    msgent.w = new Date()
    msgent.f = msg.nick
    msgent.c = msg.chathash
    msgent.t = msg.text
    msgent.save$(cb)
  },

  list: function(chathash,cb) {
    var msgent = main.seneca.make('stanzr','app','msg')
    msgent.list$({c:chathash},cb)
  }
}



main.view = {

  chat: {
    hash: function(req, res, next ){
      if( /\/api\//.exec(req.uri) ) {
        next()
      }
      else {
        main.util.authuser(req,res,onwin(res,function(user,login){
          if( user ) {
            var nick = user.nick
          }
          res.render('member', {locals: {
            title: req.params.chathash,
            chathash: req.params.chathash,
            nick: nick
          }})
        }))
      }
    }
  }
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

  bounce:
  function(req,res){
    res.writeHead(301,{'Location':'/'+req.params.chat})
    res.end()
  },

  auth: {
    post: function(req,res) {
      common.readjson(req,res,function(json){
        log('user.post action:'+req.params.action,json)

        if( 'register' == req.params.action ) {
          // {nick:,email:,password:}
          main.seneca.act(
            {
              tenant:'stanzr',
              on:'user',
              cmd:'register',
              nick:json.nick,
              email:json.email,
              password:json.password,
              active:true
            }, 
            onwin(res,function(out){
              common.sendjson(res,{ok:true,nick:out.user.nick,email:out.user.email})
            })
          )
        }

        else if( 'login' == req.params.action ) {
          // {nick:|email:,password:}
          main.seneca.act(
            {
              tenant:'stanzr',
              on:'user',
              cmd:'login',
              nick:json.nick,
              email:json.email,
              password:json.password
            }, 
            onwin(res,function(out){
              if( out.pass ) {
                cookies = new Cookies( req, res )
                cookies.set('stanzr',out.login.token,{expires:new Date( new Date().getTime()+(30*24*3600*1000) )})
              }
              common.sendjson(res,{ok:out.pass})
            })
          )
        }

        else if( 'logout' == req.params.action ) {
          cookies = new Cookies( req, res )
          var token = cookies.get('stanzr')

          main.seneca.act(
            {
              tenant:'stanzr',
              on:'user',
              cmd:'logout',
              token:token
            }, 
            onwin(res,function(out){
              if( out.logout ) {
                cookies.set('stanzr',null)
              }
              common.sendjson(res,{ok:out.logout})
            })
          )
        }
        else {
          lost(res)
        }

      },bad)
    }
  },

  user: {
    get: function(req,res) {
      var nick = req.params.nick
      var user = main.ent.make$('sys','user')
      user.load$({nick:nick},onwin(res,function(user){
        if( user ) {
          common.sendjson(res,{nick:user.nick,email:user.email})
        }
        else {
          lost(res)
        }
      }))
    }
  },

  chat: {
    get: function(req,res) {
      var chathash = req.params.chathash
      if( /msgs$/.exec(req.url) ) {
        main.msg.list(chathash,function(err,chat){
          if( err ) {
            failed(res,err)
          }
          else {
            common.sendjson(res,chat)
          }
        })
      }
      else {
        main.chat.get(chathash,function(err,chat){
          if( err ) {
            failed(res,err)
          }
          else {
            common.sendjson(res,chat)
          }
        })
      }
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




function auth(req,res,next) {
  main.util.authuser(req,res,function(user,login){
    req.user$ = user
    req.login$ = login
    next()
  })
}




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


    app.get('/:chathash', main.view.chat.hash)

    app.listen(8080);
    log("port", app.address().port)


    app.use( connect.logger() )
    app.use( connect.static( __dirname + '/../../../site/public') )

    app.use( 
      connect.router(function(capp){
        capp.get('/api/ping/:kind',main.api.ping )
        capp.get('/api/bounce/:chat', main.api.bounce )
        capp.post('/api/auth/:action', main.api.auth.post)

        capp.get('/api/chat/:chathash', main.api.chat.get)
        capp.get('/api/chat/:chathash/msgs', main.api.chat.get)
      })
    )


    app.use( auth )
        
    app.use( 
      connect.router(function(capp){
        capp.post('/api/auth/:action', main.api.auth.post)

        capp.get('/api/user/:nick', main.api.user.get)
      })
    )



    main.everyone = now.initialize(app)

    main.everyone.now.joinchat = function(msgjson){
      var msg = JSON.parse(msgjson)
      util.debug('joinchat:'+msgjson)
      var nick = this.now.name
      var group = now.getGroup(msg.chat)
      group.addUser(this.user.clientId);
      group.now.receiveMessage(nick, JSON.stringify({type:'join', nick:nick}))

      main.chat.addnick(msg.chat,nick)
    }

    main.everyone.now.distributeMessage = function(msgjson){
      var msg = JSON.parse(msgjson)
      util.debug('distmsg:'+msgjson)
      var nick = this.now.name
      var group = now.getGroup(msg.chat)

      main.msg.save({nick:nick,chathash:msg.chat,text:msg.text})

      group.now.receiveMessage(nick, JSON.stringify({type:'message', text:msg.text}))
    }
  }
)

module.exports = main

