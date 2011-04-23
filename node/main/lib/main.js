
var common = require('./common')
var social = require('./social')

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
var uuid    = common.uuid
var conf    = common.conf

var log     = common.log


var main = {}

var MAX_INFO_LIST = 30


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
function found(res,obj,cb) { if(obj){cb(obj)} else {lost(res)} }

function onwin(res,win){
  return function(err){
    util.debug('onwin:'+err)
    if( err ) {
      log('error',err)
      bad(res,err)
    }
    else {
      try {
        win && win.apply( this, [].slice.call(arguments,1) )
      }
      catch( ex ) {
        failed(res,ex)
      }
    }
  }
}


function Cache(){
  var self = this;

  var map = {}

  self.get = function(key,cb){
    cb(null,map[key])
  }

  self.set = function(key,val,cb){
    map[key] = val
    cb(null,key,val)
  }
}


main.cache = new Cache()


main.util = {
  authuser: function(req,res,cb) {
    console.log(req.headers)
    cookies = new Cookies( req, res )  
    var token = cookies.get('stanzr')
    console.log(token)

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
  },
  
  mustbemod: function(req,nick,cb) {
    if( req.user$.nick == nick ) {
      cb()
    }
    else {
      denied(req)
    }
  }
}


main.chat = {
  getreq: function(req,res,cb) {
    main.chat.get( req.params.chatid, onwin(res,function(chat){
      found( res, chat, cb )
    }))
  },

  get: function(chatid,cb) {
    var chatent = main.seneca.make('stanzr','app','chat')
    chatent.load$({chatid:chatid},function(err,chat){
      if( err ) {
        cb(err)
      }
      else {
        cb(null,chat)
      }
    })
  },

  addnick: function(chatid,nick,cb) {
    util.debug('addnick '+chatid+' '+nick)
    main.chat.get(chatid,function(err,chat){
      if( err ) {
        cb(err)
      }
      else if( chat ) {
        var nicks = chat.nicks || []
        nicks.push(nick)
        chat.nicks = _.uniq(nicks)
        console.log(chat.nicks)
        chat.save$(cb)
      }
      else {
        cb()
      }
    })
  },

  topagrees:function(chatid,cb){
    var msgent = main.seneca.make$('stanzr','app','msg')
    var db = msgent.$.store$()._db()

    db.collection('app_msg',function(err,app_msg){
      if( err ) return cb(err)

      app_msg.find(
        {c:chatid},
        {sort:[['a',-1]],limit:MAX_INFO_LIST},

        function(res,cur){
          if( err ) return cb(err)

          cur.toArray(function(err,msgs){
            if( err ) return cb(err)

            cb(null,msgs)
          })
        })
    })
  }

}

main.msg = {
  map: {},
  save: function(msg,cb) {
    var msgent = main.seneca.make('stanzr','app','msg')
    msgent.i = msg.i
    msgent.w = new Date()
    msgent.f = msg.f
    msgent.c = msg.c
    msgent.t = msg.t
    msgent.p = msg.p
    msgent.save$(cb)
    return msgent
  },

  list: function(chatid,cb) {
    var msgent = main.seneca.make('stanzr','app','msg')
    msgent.list$({c:chatid},cb)
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

          if( req.params.chatid ) {
            var chatent = main.seneca.make('stanzr','app','chat')
            chatent.load$({chatid:req.params.chatid},onwin(res,function(chat){
              if( chat ) {
                res.render(
                  'member', 
                  {locals: {
                    txt: {
                      title: chat.chatid
                    },
                    val: {
                      chatid: chat.chatid,
                      hashtag: chat.hashtag,
                      nick: nick
                    }
                  }})
              }
              else {
                res.render(
                  'member', 
                  { locals: {
                    txt: {
                      title:'Stanzr' 
                    },
                    val: {
                      nick: nick
                    }
                  }})
              }
            }))
          }
          else {
            res.render(
              'home', 
              { locals: {
                txt: {
                  title:'Stanzr' 
                },
                val: {
                  nick: nick
                }
              }})
          }
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
      },
      diag:function(req,res){
        common.sendjson(res,{params:req.params,json:req.json$,user:req.user$})
      }
    }[req.params.kind];

    kf ? kf(req,res) : lost(res)
  },

  bounce:
  function(req,res){
    var chatid = req.params.chatid || ''
    util.debug('BOUNCE:'+chatid)
    res.writeHead(301,{'Location':'/'+chatid})
    res.end()
  },

  auth: {
    post: 
    function(req,res) {
      //common.readjson(req,res,function(json){
      //  log('user.post action:'+req.params.action,json)

      var json = req.json$
      console.log(json)

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
      var chatid = req.params.chatid

      if( 'favicon.ico' == chatid ) {
        lost(res)
        return
      }

      if( /msgs$/.exec(req.url) ) {
        main.msg.list(chatid,function(err,chat){
          if( err ) {
            failed(res,err)
          }
          else {
            common.sendjson(res,chat)
          }
        })
      }
      else {
        main.chat.get(chatid,function(err,chat){
          if( err ) {
            failed(res,err)
          }
          else if( chat ) {
            common.sendjson(res,chat)
          }
          else {
            lost(res)
          }
        })
      }
    },

    put: function(req,res) {
      var json = req.json$
      var chatent = main.seneca.make('stanzr','app','chat')

      chatent.title = json.title
      
      chatent.modnick = json.moderator

      main.util.mustbemod( req, chatent.modnick, function() {
        chatent.modname = json.modname || ''
        chatent.whenstr = json.whenstr || ''
        chatent.hashtag = json.hashtag || ''
        chatent.desc    = json.desc || ''
        
        chatent.topics  = json.topics || [{title:'General',desc:'Open discussion'}]
        chatent.topics[0].active = true
        chatent.topic = 0

        chatent.nicks = []
        
        main.seneca.act({on:'util',cmd:'quickcode',len:6},onwin(res,function(quickcode){
          chatent.chatid = quickcode
          
          chatent.save$(onwin(res,function(chatent){
            common.sendjson(res,chatent.data$())
          }))
        }))
      })
    },

    topic: {
      get: function(req,res) {
        main.chat.get( req.params.chatid, onwin(res,function(chat){
          if( !chat ) {
            return lost(res); 
          }
          var tI = parseInt(req.params.topic,10)
          var topic = tI < chat.topics.length ? chat.topics[tI] : null
          common.sendjson(res,topic)
        }))
      },

      post: function(req,res) {
        main.chat.get( req.params.chatid, onwin(res,function(chat){
          if( !chat ) {
            return lost(res); 
          }

          main.util.mustbemod( req, chat.modnick, function() {
            var tI = parseInt(req.params.topic,10)
            var topic = tI < chat.topics.length ? chat.topics[tI] : null

            found( res, topic, function(topic) {
              topic = _.extend(topic,req.json$)
              chat.topics[tI] = topic

              chat.save$(onwin(res,function(chat){
                common.sendjson(res,{ok:true,topic:topic})
              }))
            })
          })
        }))
      },

      post_active: function(req,res) {
        main.chat.getreq(req,res,function(chat){
          main.util.mustbemod( req, chat.modnick, function() {
            var at = parseInt(req.params.topic,10)

            for(var tI = 0; tI < chat.topics.length; tI++ ) {
              chat.topics[tI].active = (tI == at)
            }

            chat.save$(onwin(res,function(chat){
              common.sendjson(res,{ok:true,topic:at})                
              
              var group = now.getGroup(chat.chatid)
              if( group.now.receiveMessage ) {
                group.now.receiveMessage(chat.modnick, JSON.stringify({type:'topic', topic:at}))
              }
            }))
          })
        })
      }
    },

    // api.chat
    msg: {
      get: 
      function(req,res){
        var msgent = main.seneca.make$('stanzr','app','msg')
        msgent.load$({c:req.params.chatid,i:req.params.msgid},onwin(res,function(msg){
          if(!msg){
            lost(res)
          }
          else {
            common.sendjson(res,msg)
          }
        }))
      },

      get_agrees: 
      function(req,res){
        var msgids = main.cache.get('topagrees-'+req.params.chatid,onwin(res,function(msgids){
          if( msgids ) {
            common.sendjson(res,msgids)
          }
          else {
            main.chat.topagrees(req.params.chatid,onwin(res,function(msgs){
              var msgids = []
              for(var i = 0; i < msgs.length; i++) {
                msgids.push(msgs[i].i)
              }
              main.cache.set('topagrees-'+req.params.chatid,msgids,onwin(res,function(key,msgids){
                console.log(key,msgids)
                common.sendjson(res,msgids)
              }))
            }))
          }
        }))
      },

      post_agree: 
        function(req,res){
        var msgent = main.seneca.make$('stanzr','app','msg')
        msgent.load$({c:req.params.chatid,i:req.params.msgid},onwin(res,function(msg){
          if( !msg ) {
            return lost(msg)
          }
          msg.an = msg.an || []
          msg.an.push(req.user$.nick)
          msg.an = _.uniq(msg.an)
          msg.a = msg.an.length
          msg.save$(onwin(res,function(msg){
            main.cache.set('topagrees-'+req.params.chatid,null,onwin(res,function(){
              main.api.chat.msg.get_agrees(req,res)

              var group = now.getGroup(req.params.chatid)
              if( group.now.receiveMessage ) {
                group.now.receiveMessage(req.user$.nick, JSON.stringify({type:'agree',msgid:msg.i}))
              }

            }))
          }))
        }))
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




var mm = conf.mongo.main
var mongourl = 
  'mongo://'+
  (mm.username?mm.username+':'+mm.password+'@':'')+
  mm.server+':'+mm.port+'/'+mm.name

util.debug(mongourl)


function auth(req,res,next) {
  main.util.authuser(req,res,onwin(res,function(user,login){
    util.debug('AUTH:'+JSON.stringify(user))
    if( user ) {
      req.user$ = user
      req.login$ = login
      next()
    }
    else {
      denied(res)
    }
  }))
}


function json(req,res,next) {
  var ct = req.headers['content-type'] || ''
  if( -1 != ct.toLowerCase().indexOf('json') ) {
    common.readjson(req,res,function(json){
      util.debug(json)
      req.json$ = json
      next()
    },bad)
  }
  else {
    next()
  }
}




Seneca.init(
  {logger:log,
   entity:mongourl,
   plugins:['util','user']
  },
  function(err,seneca){
    if( err ) {
      log(err)
      process.exit(1)
    }

    initseneca(seneca)

    var app = main.app = express.createServer()

    app.set('views', __dirname + '/../../../site/views');
    app.set('view engine', 'ejs');


    app.get('/', main.view.chat.hash)
    app.get('/:chatid', main.view.chat.hash)

    app.listen(conf.web.port);
    log("port", app.address().port)


    app.use( connect.logger() )
    app.use( connect.static( __dirname + '/../../../site/public') )
    

    social.init(app,main.seneca)
    
    app.use( json )

    app.use( 
      connect.router(function(capp){
        capp.get('/api/ping/:kind',main.api.ping )
        capp.post('/api/ping/diag',main.api.ping )

        capp.get('/api/bounce/', main.api.bounce )
        capp.get('/api/bounce/:chatid', main.api.bounce )
        capp.post('/api/auth/:action', main.api.auth.post)

        capp.get('/api/chat/:chatid', main.api.chat.get)

        capp.get('/api/chat/:chatid/msgs', main.api.chat.get)
        capp.get('/api/chat/:chatid/msgs/agrees', main.api.chat.msg.get_agrees)
        capp.get('/api/chat/:chatid/msg/:msgid', main.api.chat.msg.get)

        capp.get('/api/chat/:chatid/topic/:topic', main.api.chat.topic.get)
      })
    )


    app.use( auth )
        
    app.use( 
      connect.router(function(capp){
        capp.post('/api/auth/:action', main.api.auth.post)

        capp.get('/api/user/:nick', main.api.user.get)

        capp.put('/api/chat', main.api.chat.put)

        capp.post('/api/chat/:chatid/topic/:topic', main.api.chat.topic.post)
        capp.post('/api/chat/:chatid/topic/:topic/active', main.api.chat.topic.post_active)

        capp.post('/api/chat/:chatid/msg/:msgid/agree', main.api.chat.msg.post_agree)
      })
    )



    main.everyone = now.initialize(app)

    main.everyone.now.joinchat = function(msgjson){
      var msg = JSON.parse(msgjson)
      var nick = this.now.name
      var group = now.getGroup(msg.chat)
      group.addUser(this.user.clientId);
      group.now.receiveMessage(nick, JSON.stringify({type:'join', nick:nick}))

      main.chat.addnick(msg.chat,nick)
    }


    main.everyone.now.distributeMessage = function(msgjson,cb){
      var msg = JSON.parse(msgjson)
      util.debug('MSG:'+msgjson)

      var chatid = msg.c
      var nick = this.now.name
      var group = now.getGroup(chatid)


      var msgid = uuid().toLowerCase()
      console.log(msgid)
      var unsavedmsgent = main.msg.save({i:msgid,f:nick,c:chatid,p:msg.p,t:msg.t})

      group.now.receiveMessage(
        nick, 
        JSON.stringify(
          {
            type:'message', 
            c:chatid,
            t:msg.t, 
            p:msg.p,
            i:msgid,
            f:nick,
            a:0,
            an:[]
          }
        )
      )

      cb(unsavedmsgent.data$())
    }
  }
)

module.exports = main

