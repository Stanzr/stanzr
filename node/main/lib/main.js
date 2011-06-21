
var common = require('./common')

var util    = common.util
var fs      = common.fs


var connect = common.connect
var express = common.express
var mongo   = common.mongo
var now     = common.now
var eyes    = common.eyes
var assert  = common.assert
var Seneca  = common.seneca
var Cookies = common.cookies
var _       = common._
var uuid    = common.uuid
var conf    = common.conf
var twitter = common.twitter
var oauth   = common.oauth
var form    = common.form

var office  = common.office
var log     = common.log

var winston     = common.winston

var TweetSearch = require('./tweetsearch')
var imageupload = require('./imageupload')

var main = {}

var MAX_INFO_LIST = 30



process.on('uncaughtException', function (err) {
  log('error','uncaught',err)
});


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
function bad(res,err) { sendcode(400,res); log('bad',err) } 
function denied(res) { sendcode(401,res) } 
function failed(res,err) { sendcode(500,res); log('error','failed',err) } 
function found(res,obj,cb) { if(obj){cb(obj)} else {lost(res)} }

function bad_unless(res,cond,cb){
  if( cond ) {
    cb && cb()
  }
  else {
    bad(res)
  }
}


function RE(res,win){
  return function(err){
    if( err ) {
      failed(res,err)
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


function LE(win){
  return function(err){
    if( err ) {
      log('error',err)
    }
    else {
      try {
        win && win.apply( this, [].slice.call(arguments,1) )
      }
      catch( ex ) {
        log('error','ex',ex)
      }
    }
  }
}


function sendjson(res) {
  return RE(res,function(data) {
    data = data || {}
    common.sendjson(res,data)
  })
}


function sendok(res) {
  return RE(res,function(){
    common.sendjson(res,{ok:true})
  })
}


function Cache(){
  var self = this;

  var map = {}

  self.get = function(key,cb){
    cb(null,map[key])
  }

  self.set = function(key,val,cb){
    map[key] = val
    cb && cb(null,key,val)
  }
}


main.cache = new Cache()



function waitfor( obj, prop, info, cb ) {
  function exists(i) {
    if( obj && obj[prop] ) {
      log('waitfor',{info:info,found:true,prop:prop,cb:!!cb,i:i})
      cb && cb()
    }
    else if( i < 22 ) {
      log('waitfor',{info:info,found:false,prop:prop,cb:!!cb,i:i})
      setTimeout(function(){exists(i+1)},300)
    }
    else {
      log('waitfor',{info:info,found:false,abort:true,prop:prop,cb:!!cb,i:i})
    }
  }
  exists(0)
}


main.util = {
  twitter: new TweetSearch(),

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
      RE(res,function(out){
        if( out.auth ) {
          cb(null,out.user,out.login)
        }
        else {
          cb(null,null,null)
        }
      })
    )
  },
  
  mustbemod: function(req,res,modnicks,cb) {
    if( modnicks[req.user$.nick] ) {
      cb()
    }
    else {
      denied(res)
    }
  },

  tweetsearch: function(chatid,hashtag) {
    if( 2 <= hashtag.length && conf.tweetsearch ) {
      hashtag = '#'==hashtag[0] ? hashtag : '#'+hashtag

      var tsm = (main.util.tsm = main.util.tsm || {})
      var ts = tsm[chatid]

      var newhashtag = true
      if( ts ) {
        newhashtag = (ts.term != hashtag)
      }
      
      if( !ts ) {
        ts = tsm[chatid] = new TweetSearch(hashtag)
      }

      if( ts.running && newhashtag ) {
        ts.stop()
        ts = tsm[chatid] = new TweetSearch(hashtag)
      }

      if( !ts.running ) {
        ts.start(60*60*1000,function(tweet){
          var nick = tweet.user.screen_name

          ts.showUser(nick,function(err,data){
            log('error','showUser',err)

            var group = now.getGroup(chatid)        

            waitfor(group.now,'receiveMessage','tweetsearch:'+nick,function() {
              if( err ) {
                data = {profile_image_url:''}
              }

              var msg = {
                type:'external', 
                c:chatid,
                f:nick,
                av:data.profile_image_url
              }

              group.now.receiveMessage(
                nick, 
                JSON.stringify(msg)
              )
            })

          })
        })
      }
    }
  },

  parsereply: function(text) {
    var r = []
    var m = text.match(/@\S+/g)
    if( m ) {
      for (i=0; i<m.length; i++) {
        var rnick = m[i].substring(1)
        r.push(rnick)
      }
    }
    return r
  },

  tweet: function(msg,hashtag) {
    var sendtweet = msg.w && hashtag && 2 < hashtag.length
    log('tweet',{hashtag:hashtag,msg:msg,sendtweet:sendtweet})
    if( sendtweet ) {
      var user = main.ent.make$('sys','user')
      user.load$({nick:msg.f},LE(function(user){
        if( user.social && 'twitter' == user.social.service ) {
          
          var twit = new twitter({
            consumer_key: conf.keys.twitter.key,
            consumer_secret: conf.keys.twitter.secret,
            access_token_key: user.social.key,
            access_token_secret: user.social.secret
          });
          

          var tweet = msg.t 
          if( -1 == tweet.indexOf('#'+hashtag) ) {
            tweet += ' #'+hashtag
          }

          twit.updateStatus(
            tweet,
            function (data) {
            }
          )
          
        }
      }))
    }
  },

  sendtogroup: function(group,type,msg) {
    waitfor( group.now, 'receiveMessage', JSON.stringify([group.groupName,type,msg]), function() {
      group.now.receiveMessage(
        msg.f, 
        JSON.stringify(
          {
            type:type, 
            c:msg.c,
            t:msg.t, 
            p:msg.p,
            r:msg.r,
            f:msg.f,
            i:msg.i,
            v:msg.v,
            w:msg.w,
            s:msg.s,
            a:0,
            an:[]
          }
        )
      )
    })
  },

  dmnotify: function(chatid,from,to,dmid) {
    var group = now.getGroup(chatid)
    waitfor( group.now, 'receiveMessage', JSON.stringify([chatid,from,to,dmid]), function() {
      group.now.receiveMessage(
        from, 
        JSON.stringify(
          {
            type:'dm', 
            to:to,
            dm:dmid
          }
        )
      )
    })
  },


  statusnotify: function(chatid,from,data) {
    var group = now.getGroup(chatid)
    waitfor( group.now, 'receiveMessage', JSON.stringify([chatid,from,data]), function() {
      group.now.receiveMessage( from, JSON.stringify( _.extend({type:'status'},data) ) )
    })
  },


  timeorder: function(msg) {
    var time = new Date()
    var order = (time.getTime() % 10000000000) * 100

    msg.s = time
    msg.v = order

    return msg;
  },

  
  findalias: function(name,cb){
    var alias = main.ent.make$('app','alias')
    alias.load$({a:name},cb)
  },


  fire: function(event,chatid) {
    common.request.get(
      {'url':'http://count.chartaca.com/2910f2ee-3737-48ec-980f-001574c2d2de/stanzr.com/'+event+(chatid?':'+chatid:'')+'/s.gif'},
      function(error,response,body){}
    )
  }
}


main.chat = {
  getreq: function(req,res,cb) {
    main.chat.get( req.params.chatid, RE(res,function(chat){
      found( res, chat, cb )
    }))
  },

  get: function(chatid,cb) {
    var chatent = main.ent.make$('app','chat')
    chatent.load$({chatid:chatid},function(err,chat){
      cb(err,chat)
    })
  },

  save: function(chat,cb) {
    chat.save$(function(err,chat){
      if( err ) return cb(err,chat);
      main.cache.set('chat.'+chat.chatid,chat,function(err,key,chat){
        cb(err,chat)
      })
    })
  },

  addnick: function(chatid,nick,cb) {
    main.chat.get(chatid,function(err,chat){
      if( err ) return cb(err);

      if( chat ) {
        var nicks = chat.nicks || []
        var numbefore = nicks.length

        nicks.push(nick)
        nicks = _.select(nicks,function(nick){
          return null != nick
        })


        chat.nicks = _.uniq(nicks)
        var numafter = chat.nicks.length

        if( numbefore < numafter ) {
          main.util.fire('join',chatid)
        }

        if( !chat.bans || _.isArray(chat.bans) ) {
          chat.bans = {}
        }

        main.chat.save(chat,function(err,chat){
          if( err ) return cb(err);
          var hist = main.ent.make$('app','hist')
          hist.load$({c:chatid,n:nick},function(err,existing){
            if( err ) return cb(err);
            if( !existing ) {
              hist.data$({n:nick,c:chatid,w:new Date(),t:chat.title,k:'join',h:chat.hashtag})
              hist.save$(cb)
            }
            else {
              existing.wl = new Date()
              existing.save$(cb)
            }
          })
        })
      }
      else {
        cb && cb()
      }
    })
  },

  topagrees:function(chatid,cb){
    var msgent = main.ent.make$('app','msg')
    var db = msgent.$.store$()._db()

    db.collection('app_msg',function(err,app_msg){
      if( err ) return cb(err);

      app_msg.find(
        {c:chatid},
        {sort:[['a',-1]],limit:MAX_INFO_LIST},

        function(res,cur){
          if( err ) return cb(err);

          cur.toArray(cb)
        })
    })
  },


  getmsg: function(req,res,cb){
    var chatid = req.params.chatid
    var msgid  = req.params.msgid

    var msg = main.ent.make$('app','msg')
    msg.load$({c:chatid,i:msgid},RE(res,function(msg){
      if( !msg ) {
        return lost(res)
      }
      cb(msg)
    }))
  },


  getpublished: function(chatid,cb) {
    var pub = main.ent.make$('app','pub')
    pub.list$({c:chatid,sort$:{o:1}},cb)
  }

}

main.msg = {
  map: {},
  save: function(msg,cb) {
    var msgent = main.ent.make$('app','msg')

    msgent.i = msg.i
    msgent.f = msg.f
    msgent.c = msg.c
    msgent.t = msg.t
    msgent.p = msg.p
    msgent.r = msg.r
    msgent.w = msg.w
    msgent.h = msg.h

    main.util.timeorder(msgent)

    msgent.save$(cb)
    return msgent
  },

  list: function(chatid,cb) {
    var msgent = main.ent.make$('app','msg')
    msgent.list$({c:chatid,sort$:{s:1}},function(err,list){
      cb(err,list)
    })
  },

  load: function(chatid,msgid,cb) {
    var msgent = main.ent.make$('app','msg')
    msgent.load$({c:chatid,i:msgid},cb)
  }
}


main.msg.post = function(msg,cb) {
  // required
  var hashtag = msg.g
  var chatid  = msg.c
  var nick    = msg.f
  var topic   = msg.p
  var text    = msg.t
  var tweet   = msg.w


  if( !nick ) {
    log('error',{nowjs:'no-name',on:'distmsg',msg:msgjson})
    return cb('no-nick',null)
  }

  main.cache.get('chat.'+chatid,LE(function(chat){
    if( chat ) {

      var group = now.getGroup(chatid)

      msg.r = main.util.parsereply(msg.t)
      
      msg.i = uuid().toLowerCase()
      var msgdata = {i:msg.i,f:nick,c:chatid,p:msg.p,t:msg.t,r:msg.r,w:msg.w}

      var sendmsg = chat.modnicks[nick] ||
        ('open' == chat.state && !(chat.bans && chat.bans[nick])) 

      if( sendmsg ) {
        var unsavedmsgent = main.msg.save(msgdata)
        var msgdata = unsavedmsgent.data$()
        delete msgdata.$
        cb && cb(msgdata)

        log('message',msgdata)
        main.util.tweet(msgdata,hashtag)
        main.util.sendtogroup(group,'message',msgdata)
      }
      else {
        cb && cb(null,msgdata)
      }
    }
  }))


}



main.view = {

  chat: {
    hash: function(req, res, next ){
      if( /\/api\//.exec(req.url) ) {
        next()
      }
      else if( /\/favicon.ico/.exec(req.url) ) {
        next()
      }
      else if( /\/.*\.html/.exec(req.url) ) {
        next()
      }
      else {
        main.util.authuser(req,res,RE(res,function(user,login){
          var userdesc = {}
          var chatdesc = {
            chatid  :'',
            hashtag :'',
            state   :'',
            title   :'',
            modname :'',
            modtitle :'',
            modorg   :'',
            whenstr :'',
            desc    :''
          }

          if( user ) {
            var nick = user.nick
            userdesc.nick = user.nick
            userdesc.service = user.social?user.social.service:'system'
            userdesc.admin = user.admin
            userdesc.toc = user.toc
            userdesc.email = user.email
            userdesc.name = user.name
          }

          if( req.params.chatid ) {
            var chatent = main.ent.make$('app','chat')
            chatent.load$({chatid:req.params.chatid},RE(res,function(chat){
              if( chat ) {
                chatdesc.chatid   = chat.chatid || ''
                chatdesc.hashtag  = chat.hashtag || ''
                chatdesc.state    = chat.state || ''
                chatdesc.title    = chat.title || ''
                chatdesc.modname  = chat.modname || ''
                chatdesc.modtitle = chat.modtitle || ''
                chatdesc.modorg   = chat.modorg || ''
                chatdesc.whenstr  = chat.whenstr || ''
                chatdesc.desc     = chat.desc || ''

                var locals = {
                  txt: {
                    title: chat.title
                  },
                  val: {
                    chatid: chat.chatid,
                    alias: req.params.alias || chat.chatid,
                    hashtag: chat.hashtag || '',
                    nick: nick,
                    hostyours: !!(/QJAAMZDU$/.exec(req.url)),
                    user:userdesc,
                    chat:chatdesc
                  }
                }

                if( 'done' == chat.state ) {
                  var pub = main.ent.make$('app','pub')
                  main.chat.getpublished(chat.chatid,RE(res,function(entries){
                    locals.val.entries = entries
                    var user = main.ent.make$('sys','user')
                    user.list$({},RE(res,function(users){
                      
                      var usermap = {}
                      for( var i = 0; i < users.length; i++ ) {
                        var user = users[i]
                        usermap[user.nick] = user
                      }
                      locals.val.usermap = usermap

                      res.render('member', {locals:locals})
                    }))
                  }))
                }
                else {
                  res.render('member', {locals:locals})
                }
              }
              else if( 'member' == req.params.chatid ) {
                res.render(
                  'member', 
                  { locals: {
                    txt: {
                      title:'Stanzr' 
                    },
                    val: {
                      nick: nick,
                      chatid: 'member',
                      hostyours: !!(/QJAAMZDU$/.exec(req.url)),
                      user:userdesc,
                      chat:chatdesc
                    }
                  }})
              }
             else if( 'upload' == req.params.chatid ) {
                res.render(
                  'upload', 
                  { locals: {txt:{},val:{user:{},chat:{}}} } )
             }
              else {
                res.writeHead(302,{'Location':'/'})
                res.end()
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
    },

    moderator: function(req, res, next ) {
      if( req.params.chatid ) {
        var chatent = main.ent.make$('app','chat')
        chatent.load$({chatid:req.params.chatid},RE(res,function(chat){
          res.render(
            'moderator', 
            { locals: {
              txt: {
                title:'Stanzr' 
              },
              val: {
                chat:chat,
                user:{}
              }
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
    res.writeHead(301,{'Location':'/'+chatid})
    res.end()
  },

  auth: {
    post: 
    function(req,res) {
      var json = req.json$

      function setlogincookie(token) {
        cookies = new Cookies( req, res )
        cookies.set('stanzr',token,{expires:new Date( new Date().getTime()+(30*24*3600*1000) )})
      }


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
            RE(res,function(out){
              console.dir(out)

              if( !out.ok ) {
                common.sendjson(res,{ok:false})
              }
              else {
                var user = out.user
                user.avimg = json.avimg

                user.save$(RE(res,function(){
                  main.seneca.act(
                    {
                      tenant:'stanzr',
                      on:'user',
                      cmd:'login',
                      nick:json.nick,
                      auto:true
                    }, 
                    RE(res,function(out){
                      console.dir(out)

                      if( out.pass ) {
                        setlogincookie(out.login.token)
                        common.sendjson(res,{ok:out.pass,nick:out.user.nick,email:out.user.email})
                      }
                    })
                  )
                }))
              }
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
            RE(res,function(out){
              if( out.pass ) {
                setlogincookie(out.login.token)
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
            RE(res,function(out){
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
      user.load$({nick:nick},RE(res,function(user){
        if( user ) {
          common.sendjson(res,{nick:user.nick,email:user.email,avimg:user.avimg,name:user.name})
        }
        else {
          lost(res)
        }
      }))
    },

    get_avatar: function(req,res) {
      var nick = req.params.nick
      var user = main.ent.make$('sys','user')
      user.load$({nick:nick},RE(res,function(user){
        if( user ) {
          common.sendjson(res,{nick:user.nick,avimg:user.avimg})
        }
        else {
          lost(res)
        }
      }))
    },

    get_details: function(req,res) {
      var nick = req.params.nick
      var user = main.ent.make$('sys','user')
      user.load$({nick:nick},RE(res,function(user){
        if( user ) {
          common.sendjson(res,{
            nick:user.nick,
            avimg:user.avimg,
            name:user.name,
            social:{service:(user.social?user.social.service:null)}
          })
        }
        else {
          lost(res)
        }
      }))
    },

    get_history: function(req,res) {
      var nick = req.params.nick
      if( nick == req.user$.nick ) {
        var hist = main.ent.make$('app','hist')
        hist.list$({n:nick,sort$:{w:-1}},RE(res,function(list){
          common.sendjson(res,list)
        }))
      }
      else {
        denied(res)
      }
    }    
  },

  chat: {
    get: function(req,res) {
      var chatid = req.params.chatid

      if( 'favicon.ico' == chatid ) {
        lost(res)
        return
      }

      if( /msgs(\?.+)?$/.exec(req.url) ) {
        main.msg.list(chatid,sendjson(res))
      }
      else {
        log('get-chat',{chat:req.chat$,user:req.user$,headers:req.headers})
        common.sendjson(res,req.chat$.data$())
      }
    },

    save: function(req,res) {
      var json = req.json$
      var chat = main.ent.make$('app','chat')

      chat.load$({chatid:req.params.chatid},RE(res,function(chat){

        function fixval() {
          val = ''
          for( var i = 0; i < arguments.length; i++ ) {
            val = arguments[i]
            if( undefined != typeof(val) && null != val ) {
              return val
            }
          }
          return val
        }

        function savechat(chat) {
          main.util.mustbemod( req, res, chat.modnicks, function() {
            chat.title    = fixval( json.title    , chat.title , 'Chat session' )
            chat.modname  = fixval( json.modname  , chat.modname , '' )
            chat.modtitle = fixval( json.modtitle , chat.modtitle , '' )
            chat.modorg   = fixval( json.modorg   , chat.modorg , '' )
            chat.whenstr  = fixval( json.whenstr  , chat.whenstr , '' )
            chat.hashtag  = fixval( json.hashtag  , chat.hashtag , '' )
            chat.desc     = fixval( json.desc     , chat.desc , '' )
            chat.logo     = fixval( json.logo     , chat.logo , '' )
        
            main.chat.save(chat,RE(res,function(chat){
              main.util.tweetsearch(chat.chatid,chat.hashtag)
              common.sendjson(res,chat.data$())
            }))
          })
        }

        if( chat && chat.chatid ) {
          chat.topics = json.topics
          savechat(chat)
        }
        else {
          chat = main.ent.make$('app','chat')

          var topicdef = [{title:'General',desc:'Open discussion'}]

          if( !json.topics ) {
            json.topics = topicdef
          }

          if( !_.isArray(json.topics) ) {
            json.topics = topicdef
          }
          else if( 0 == json.topics.length ) {
            json.topics = topicdef
          } 

          chat.topics  = json.topics

          chat.topics[0].active = true
          chat.topic = 0
          
          chat.bans = {}
          chat.nicks = []
          chat.modnicks = {}
          chat.modnicks[json.moderator]=1

          chat.state = 'closed'

          main.seneca.act({on:'util',cmd:'quickcode',len:conf.quickcodelen},RE(res,function(quickcode){
            chat.chatid = quickcode
            savechat(chat)
          }))
        }

      })) // load
    },


    state: function(req,res) {
      var state = req.json$.state

      bad_unless( res, {open:1,closed:1}[state], function(){
        req.chat$.state = state
        main.chat.save(req.chat$,sendjson(res))
        main.util.statusnotify(req.chat$.chatid,req.user$.nick,{sub:'chat.state',state:state})
      })
    },


    invite: function(req,res) {
      if( !req.chat$.invites || req.chat$.invites < 3 ) {
        main.util.twitter.updateStatus(req.json$.body)
        req.chat$.invites++
        main.chat.save(req.chat$,sendjson(res))
      }
    },


    topic: {
      get: function(req,res) {
        main.chat.get( req.params.chatid, RE(res,function(chat){
          if( !chat ) {
            return lost(res); 
          }
          var tI = parseInt(req.params.topic,10)
          var topic = tI < chat.topics.length ? chat.topics[tI] : null
          common.sendjson(res,topic)
        }))
      },

      post: function(req,res) {
        main.chat.get( req.params.chatid, RE(res,function(chat){
          if( !chat ) {
            return lost(res); 
          }

          main.util.mustbemod( req, res, chat.modnicks, function() {
            var tI = parseInt(req.params.topic,10)
            var topic = tI < chat.topics.length ? chat.topics[tI] : null

            found( res, topic, function(topic) {
              topic = _.extend(topic,req.json$)
              chat.topics[tI] = topic

              main.chat.save(chat,RE(res,function(chat){
                common.sendjson(res,{ok:true,topic:topic})
              }))
            })
          })
        }))
      },

      post_active: function(req,res) {
        main.chat.getreq(req,res,function(chat){
          main.util.mustbemod( req, res, chat.modnicks, function() {
            var at = parseInt(req.params.topic,10)

            for(var tI = 0; tI < chat.topics.length; tI++ ) {
              chat.topics[tI].active = (tI == at)
            }

            main.chat.save(chat,RE(res,function(chat){
              common.sendjson(res,{ok:true,topic:at})                
              
              var group = now.getGroup(chat.chatid)
              waitfor( group.now, 'receiveMessage', 'topic:'+at, function() {
                group.now.receiveMessage(chat.modnicks, JSON.stringify({type:'topic', topic:at}))
              })
            }))
          })
        })
      }
    },

    publish: function(req,res) {
      var chatid = req.chat$.chatid
      var pub = main.ent.make$('app','pub')
      var entries = req.json$.entries
      var vanity = null
      var newchat = null
      var pubalias = null

      
      function removeoldentries(cb) {
        pub.list$({c:chatid},RE(res,function(oldentries){
          function removeoldentry(i) {
            if( i < oldentries.length ) {
              var entry = oldentries[i]
              pub.remove$({id:entry.id},RE(res,function(){
                removeoldentry(i+1)
              }))
            }
            else {
              cb()
            }
          }
          removeoldentry(0)
        }))
      }


      function insertnewentries(cb) {
        for(var i = 0; i < entries.length; i++ ){
          var entry = entries[i]
          var p = pub.make$({t:entry.t,o:entry.o,b:entry.b,c:chatid,a:entry.a})
          p.save$()
        }
        cb()
      }


      function getvanityalias(cb) {
        var alias = main.ent.make$('app','alias')

        alias.list$({c:chatid},RE(res,function(list){
          for( var i = 0; i < list.length; i++ ) {
            if( -1 == list[i].a.indexOf('-') ) {
              vanity = list[i].a
                break
            }
          }
          cb()
        }))
      }
        

      function makenewchat(cb) {
        newchat = req.chat$.make$(req.chat$.data$())
        delete newchat.id 
        
        main.seneca.act({on:'util',cmd:'quickcode',len:conf.quickcodelen},RE(res,function(quickcode){
          newchat.chatid = quickcode
          newchat.topic = 0
          newchat.nicks = []
          newchat.topics = [{title:'General',desc:'Discussion'}]
          newchat.whenstr = 'Next week'
          newchat.parent = req.chat$.parent || req.chat$.chatid
          newchat.vanity = vanity

          newchat.save$(RE(res,function(){
            cb()
          }))
        }))
      }

        

      function publisholdchat(cb) {
        req.chat$.state = 'done'
        req.chat$.followon = newchat.chatid
        req.chat$.followvanity = vanity
        
        main.chat.save(req.chat$,RE(res,function(out){
          pubalias = office.chat.makepublishalias(req.chat$.hashtag,req.chat$.whenstr,req.chat$.topics[0].title)
          var alias = main.ent.make$('app','alias')
          
          alias.load$({c:chatid,a:pubalias},RE(res,function(foundalias){
            if( !foundalias ) {
              alias.c = chatid
              alias.a = pubalias

              alias.save$(RE(res,function(){
                cb()
              }))
            }
            else {
              cb()
            }
          }))
        }))
      }


      function sendpublishresult() {
        common.sendjson(res,{ok:true,pubalias:pubalias,newchatid:newchat.chatid,vanity:vanity})
      }


      (
        function(){ removeoldentries(
          function(){ insertnewentries(
            function(){ getvanityalias(
              function(){ makenewchat(
                function(){ publisholdchat(
                  function(){ sendpublishresult(
                  )})})})})}) } )()

    },


    movevanity: function(req,res) {
      var vanity = req.chat$.vanity
      if( vanity ) {
        var alias = main.ent.make$('app','alias')
        alias.load$({a:vanity},RE(res,function(vanityalias){
          if( !vanityalias ) {
            common.sendjson(res,{chatname:req.chat$.chatid})
            return
          }

          vanityalias.c = req.chat$.chatid
          vanityalias.save$(RE(res,function(){
            common.sendjson(res,{chatname:vanity})
          }))
        }))
      }
      else {
        common.sendjson(res,{chatname:req.chat$.chatid})
      }
    },


    // api.chat
    msg: {
      get: 
      function(req,res){
        var msgent = main.ent.make$('app','msg')
        msgent.load$({c:req.params.chatid,i:req.params.msgid},RE(res,function(msg){
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
        var msgids = main.cache.get('topagrees-'+req.params.chatid,RE(res,function(msgids){
          if( msgids ) {
            common.sendjson(res,msgids)
          }
          else {
            main.chat.topagrees(req.params.chatid,RE(res,function(msgs){
              var msgids = []
              for(var i = 0; i < msgs.length; i++) {
                msgids.push(msgs[i].i)
              }
              main.cache.set('topagrees-'+req.params.chatid,msgids,RE(res,function(key,msgids){
                common.sendjson(res,msgids)
              }))
            }))
          }
        }))
      },

      post_agree: 
        function(req,res){
        main.chat.getmsg(req,res,function(msg){
          msg.an = msg.an || []
          msg.an.push(req.user$.nick)
          msg.an = _.uniq(msg.an)
          msg.a = msg.an.length
          msg.save$(RE(res,function(msg){
            main.cache.set('topagrees-'+req.params.chatid,null,RE(res,function(){

              // do this here to prevent a cold cache stampede in get_agrees
              main.api.chat.msg.get_agrees(req,res)

              var group = now.getGroup(req.params.chatid)
              waitfor( group.now, 'receiveMessage', 'agree:'+msg.i, function(){
                group.now.receiveMessage(req.user$.nick, JSON.stringify({type:'agree',msgid:msg.i}))
              })
            }))
          }))
        })
      },


      post_status:
      function(req,res){
        main.chat.getmsg(req,res,function(msg){

          var ismod = req.chat$.modnicks[req.user$.nick]

          if( ismod || req.user$.nick == msg.f ) {
            var hide = req.json$.hide
            if( 'undefined' != typeof(hide) ) {
              msg.h = hide
              main.util.statusnotify(req.chat$.chatid,req.user$.nick,{msgid:msg.i,visible:msg.h?'hide':'show'})
            }

            msg.save$(sendjson(res))
          }
          else {
            denied(res)
          }
        })
      }
    }, // msg






    user: {
      post_status:
      function(req,res){
        var nick = req.params.nick
        if( nick ) {
          req.chat$.bans[nick] = req.json$.ban

          main.cache.set(req.chat$.chatid+'.bans',req.chat$.bans,RE(res,function(){
            main.chat.save(req.chat$, RE(res, function(){
              common.sendjson(res,{nick:nick,ban:req.chat$.bans[nick]})
            }))
          }))
        }
        else {
          bad(res)
        }
      }
    }, // user


    dm: {
      put:
      function(req,res){
        var chatid = req.chat$.chatid
        var from   = req.user$.nick
        var to     = req.params.nick
        var mark   = [from,to].sort().join('~')
        var body   = req.json$.body
        var dmid   = uuid()

        var dm = main.ent.make$('app','dm',{i:dmid,c:chatid,f:from,t:to,m:mark,b:body,w:new Date()})
        dm.save$(LE(function(dm){
        }))

        main.util.dmnotify(chatid,from,to,dmid)

        common.sendjson(res,dm.data$())
      },

      get:
      function(req,res){
        var dmid   = req.params.dmid
        var chatid = req.chat$.chatid
        var to     = req.user$.nick

        var dm = main.ent.make$('app','dm')
        
        if( dmid ) {
          dm.load$({i:dmid,c:chatid,t:to},RE(res,function(dm){
            if( dm ) {
              common.sendjson(res,dm.data$())
            }
            else {
              lost(res)
            }
          }))
        }
        else {
          dm.list$({c:chatid,t:to,sort$:{w:-1}},RE(res,function(out){
            common.sendjson(res,out)
          }))
        }
      },

      get_conv:
      function(req,res){
        var chatid = req.chat$.chatid
        var me     = req.user$.nick
        var other  = req.params.nick
        var mark   = [me,other].sort().join('~')

        var dm = main.ent.make$('app','dm')

        dm.list$({c:chatid,m:mark,sort$:{w:1}},RE(res,function(out){
          common.sendjson(res,out)
        }))
      }
    }
  }
}


main.api.user.post_terms = function( req, res ) {
  var nick = req.params.nick
  if( nick == req.user$.nick ) {
    req.user$.email = req.json$.email
    req.user$.name = req.json$.name
    req.user$.toc = 1
    req.user$.save$(sendok(res))
  }
  else {
    denied(res)
  }
}


main.api.chat.msg.share = function(req,res) {
  var msg = main.ent.make$('app','msg')
  main.msg.load(req.params.chatid,req.params.msgid,RE(res,function(msg){
    if( !msg ) return lost(res);

    var text = req.json$.text
    var tweet = req.json$.tweet
    if( text.length <= 140 && tweet ) {
      var tweetmsg = {w:1,f:req.user$.nick,t:text}
      main.util.tweet(tweetmsg,req.chat$.hashtag)
    }

    msg.rt = msg.rg ? 1+msg.rt : 1;
    msg.save$()

    var rtmsg = {
      g: msg.g,
      c: msg.c,
      f: req.user$.nick,
      p: msg.p,
      t: text,
      w: false,
      rt: msg.rt
    }

    // FIX: main.msg.post does not follow err,data cb pattern properly
    main.msg.post(rtmsg,function(msg){
      console.dir(msg)
      if( msg ) {
        common.sendjson(res,msg)
      }
    })
  }))
}



main.api.user.post = function(req,res) {
  var nick = req.params.nick

  if( nick == req.user$.nick || 
      req.chat$.modnicks[req.user$.nick] || 
      req.user$.admin ) 
  {
    var pwd   = req.json$.pwd || ''
    var pwd2  = req.json$.pwd2 || ''
    
    if( pwd ) {
      if( pwd === pwd2 && 1 < pwd.length) {
        main.userpin.cmd('change_password',{password:pwd},RE(res,function(out){
          updateuser(out.user)
        }))
      }
      else {
        bad(res)
      }
    }
    else {
      updateuser()
    }
  
    function updateuser(pwdupdate) {
      var user = main.ent.make$('sys','user')
      user.load$({nick:nick},RE(res,function(user){
        if( !user ) return lost(res);

        user.name  = req.json$.name || user.name || ''
        user.email = req.json$.email || user.email || ''
        user.avimg = req.json$.avimg || user.avimg || ''

        if( pwdupdate ) {
          user.salt = pwdupdate.salt
          user.pass = pwdupdate.pass
        }

        user.save$(RE(res,function(){
          common.sendjson(res,{ok:true})
        }))
      }))
    }
  }
  else {
    denied(res)
  }
}


main.api.chat.admin = {}

main.api.chat.admin.moderator = {}

main.api.chat.admin.moderator.get = function(req,res) {
  var items = []
  for( var modnick in req.chat$.modnicks ) {
    items.push({text:modnick})
  }
  common.sendjson(res,items)
}

main.api.chat.admin.moderator.put = function(req,res) {
  var modnick = req.json$.text
  req.chat$.modnicks[modnick]=1
  req.chat$.save$(RE(res,function(){
    common.sendjson(res,{text:modnick})
  }))
}

main.api.chat.admin.moderator.post = function(req,res) {
  var oldmodnick = req.params.name
  var newmodnick = req.json$.text

  delete req.chat$.modnicks[oldmodnick]
  req.chat$.modnicks[newmodnick]=1

  req.chat$.save$(RE(res,function(){
    common.sendjson(res,{text:newmodnick})
  }))
}

main.api.chat.admin.moderator.del = function(req,res) {
  var oldmodnick = req.params.name

  delete req.chat$.modnicks[oldmodnick]
  req.chat$.save$(RE(res,function(){
    common.sendjson(res,{text:oldmodnick})
  }))
}


main.api.chat.admin.alias = {}

main.api.chat.admin.alias.get = function(req,res) {
  var alias = main.ent.make$('app','alias')
  alias.list$({c:req.params.chatid},RE(res,function(list){
    var items = []
    for( var i = 0; i < list.length; i++ ) {
      items.push({text:list[i].a})
    }
    common.sendjson(res,items)
  }))
}

main.api.chat.admin.alias.put = function(req,res) {
  var name = req.json$.text
  main.util.findalias(name,RE(res,function(alias){
    if( alias ) return bad(res);

    alias = main.ent.make$('app','alias',{
      c:req.params.chatid,
      a:name
    })

    alias.save$(RE(res,function(){
      common.sendjson(res,{text:name})
    }))
  }))
}

main.api.chat.admin.alias.post = function(req,res) {
  var oldname = req.params.name
  var newname = req.json$.text

  main.util.findalias(oldname,RE(res,function(oldalias){
    if( !oldalias ) return bad(res);

    main.util.findalias(newname,RE(res,function(newalias){
      if( newalias ) return bad(res);

      oldalias.a = newname
      oldalias.save$(RE(res,function(){
        common.sendjson(res,{text:newname})
      }))
    }))
  }))
}

main.api.chat.admin.alias.del = function(req,res) {
  var oldname = req.params.name
  main.util.findalias(oldname,RE(res,function(oldalias){
    if( !oldalias ) return bad(res);
    
    oldalias.remove$(null,RE(res,function(){
    common.sendjson(res,{text:oldname})
    }))
  }))
}


main.api.chat.msg.post = function(req,res) {
  var msg = req.json$
  msg.f = req.user$.nick
  main.msg.post(msg,sendjson(res))
}





function initseneca( seneca ) {
  main.seneca = seneca
  main.ent    = seneca.make('stanzr',null,null)
  main.userpin = seneca.pin({tenant:'stanzr',on:'user'})


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



function chatmustbeopen(req,res,next) {
  if( req.chat$ ) {
    if( 'open' == req.chat$.state || req.chat$.modnicks[req.user$.nick] || req.user$.admin ) {
      next()
    }
    else {
      denied(res)
    }
  }
  else {
    bad(res)
  }
}


function mustbemod(req,res,next) {
  if( req.chat$ ) {
    if( req.chat$.modnicks[req.user$.nick] || req.user$.admin ) {
      next()
    }
    else {
      denied(res)
    }
  }
  else {
    bad(res)
  }
}


function mustbeadmin(req,res,next) {
  if( req.user$.admin ) {
    next()
  }
  else {
    console.log('NOT ADMIN: '+req.user$)
    denied(res)
  }
}


function loadchat(req,res,next) {
  var m = /^\/api\/chat\/([^\/\?]+)/.exec(req.url)
  if( m ) {
    var chatid = m[1]
    main.cache.get('chat.'+chatid,RE(res,function(chat){
      if( chat ) {
        req.chat$ = chat
        next()
      }
      else {
        chat = main.ent.make$('app','chat')
        chat.load$({chatid:chatid},RE(res,function(chat){
          if( chat ) {
            req.chat$ = chat

            if( !req.chat$.modnicks ) {
              req.chat$.modnicks = {}
              req.chat$.modnicks[req.chat$.modnick]=1
              req.chat$.save$()
            }

            next()
            main.util.tweetsearch(chat.chatid,chat.hashtag)
            main.cache.set('chat.'+chatid,chat)
          }
          else {
            lost(res)
          }
        }))
      }
    }))
  }
  else {
    next()
  }
}


function auth(req,res,next) {
  main.util.authuser(req,res,RE(res,function(user,login){
    if( user ) {
      req.user$ = user
      req.login$ = login

      if( req.chat$ ) {
        if( !req.chat$.bans[user.nick] ) {
          next()
        }
        else {
          denied(res)
        }
      }
      else {
        next()
      }
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
      req.json$ = json
      next()
    },bad)
  }
  else {
    next()
  }
}



function initsocial(){
  return main.seneca.service('user',{
    hosturl:conf.hosturl,
    prefix:'/api/user',
    tenant:'stanzr',
    oauth: {
      services: {
        twitter: {
          keys:conf.keys.twitter
        },
        facebook: {
          version:2,
          keys:conf.keys.facebook
        },
        linkedin: {
          keys:conf.keys.linkedin
        }
      }
    },

  },function(err,ctxt){
    if( err ) {
      log('error',err)
      failed(ctxt.res,{err:err,ctxt:ctxt})
    }
    else {
      var user = ctxt.user

      if( user.social ) {

        function saveuser(user,username,avimg,service){
          user.avimg = avimg
          user.nick = username
          user.save$(function(err,user){
            log('saveuser',{error:err,social:service,kind:'avatar',user:user})
          })
        }

        if( 'twitter' == user.social.service ) {

          var twit = new twitter({
            consumer_key: conf.keys.twitter.key,
            consumer_secret: conf.keys.twitter.secret,
            access_token_key: user.social.key,
            access_token_secret: user.social.secret
          });

          twit.showUser(ctxt.username,function(data){

            if( 'Error' != data.name ) {
              saveuser(user,ctxt.username,data.profile_image_url,'twitter')
            }
            else {
              if( err ) {
                log('error','avimg',{error:data,social:'twitter',kind:'showUser',user:user})
              }
            }
          })

        }
        else if( 'facebook' == user.social.service ) {
          try {
            var facebook = new oauth.OAuth2(
              conf.keys.facebook.key,
              conf.keys.facebook.secret,
              'https://graph.facebook.com'
            )
            
            var geturl = 'https://graph.facebook.com/me/picture'
            facebook.getProtectedResource( geturl, user.social.key, function (error, data, response) {
              log('error','facebook-avimg',{service:'facebook',error:error,data:data,headers:response&&response.headers})

              if( error ) {
	        if( 302 != error.statusCode ) {
                  log('error','avimg',{error:error,social:'facebook',kind:'showUser',user:user})
                }
                else {
                  saveuser(user,ctxt.username,error.headers['location'],'facebook')
                }
              }
            })
          }
          catch( ex ) {
            log('error',ex)
          }
        }
        else if( 'linkedin' == user.social.service ) {
          var client = new oauth.OAuth(
            '--',
            '--',
            conf.keys.linkedin.key,
            conf.keys.linkedin.secret,
            '1.0',
            '--',
            'HMAC-SHA1',
            null,
            {'Accept': '*/*', 'Connection': 'close', 'User-Agent': 'seneca'}
          )

          var geturl = 'http://api.linkedin.com/v1/people/~:(picture-url)'

          client.get(
            geturl, user.social.key, user.social.secret, function(error,data,response){
              ctxt.responsedata = data

              console.dir(data)
              if( error ) {
                saveuser(user,ctxt.username,'linkedin',error)
              }
              else {
                var oneline = data.replace(/\n/g,'')
                var m = /<picture-url>([^<]+)<\/picture-url>/.exec(oneline)
                saveuser(user,ctxt.username,m?m[1]:'','linkedin')
              }
            })
        }
      }

      var res = ctxt.res
      res.writeHead( 301, {
        'Location':"/"+(ctxt.tag?ctxt.tag:'')
      })
      res.end()
    }
  })
}


function senecalogger() {
  var args = Array.prototype.slice.call(arguments)
  if( 'user' == args[2] ) {
    var sb = ['======================USER:']
    for( var i = 0; i < args.length; i++ ) {
      sb.push( JSON.stringify(args[i]) )
    }
    console.log( sb.join(' ') )
  }
}


Seneca.init(
  {logger:senecalogger,
   entity:mongourl,
   plugins:['util','user','echo']
  },
  function(err,seneca){
    if( err ) {
      log(err)
      process.exit(1)
    }

    initseneca(seneca)

    var app = main.app = express.createServer()


    app.use( function(req,res,next){
      if( '/api/log/error?desc=' == req.url.substring(0,20) ) {
        res.writeHead(200)
        res.end()

        var desc = {}

        var report = JSON.parse(unescape(req.url.substring(20)))
        console.dir(report)

        desc.args = report.args
        desc.app = {nick:report.app.nick,chatid:report.app.chat.chatid}
        desc.headers = req.headers
        desc.when = new Date()

        console.dir(desc)

        try {
          console.log('winston')
          winston.log('error','client',desc)
        }
        catch( e ) {
          console.dir(e)
        }
      }
      else {
        next()
      }
    })


    app.use( connect.logger( {stream:fs.createWriteStream(conf.accesslog)} ) )

    app.use(form({ keepExtensions: true }))

    app.use( imageupload.service({
      callback: 'parent.app.uploadimage',
      uploadpath: '/api/upload/image',
      s3folder: '/img/avatar',
      s3bucket: 'c1.stanzr.com',
      error: 'parent.app.uploadimage'
    }))



    app.use(function(req,res,next){
      var host = req.headers.host
      if( conf.hosturl == 'http://'+host ||
	  'localhost' == host ||
          'localhost:8080' == host ||
          'stanzr.com' == host ||
          'stanzr.test' == host ||
          0 == host.indexOf('192.168.') ) 
      {
        next()
      }
      else {
        res.writeHead(301,{'Location':conf.hosturl+req.url})
        res.end()
      }
    })

    app.set('views', __dirname + '/../../../site/views');
    app.set('view engine', 'ejs');

    app.use(function(req,res,next){
      var url = req.url.substring(1)
      
      var ignore = 
        0==url.indexOf('js') ||
        0==url.indexOf('img') ||
        0==url.indexOf('css') ||
        0==url.indexOf('api') ||
        0==url.indexOf('favicon.ico') ||
        false

      if( ignore ) {
        next()
      }
      else {
        var alias = main.ent.make$('app','alias')

        alias.load$({a:url},RE(res,function(alias){
          if( alias ) {
            req.params = req.params || {}
            req.params.chatid = alias.c
            req.params.alias = alias.a
            main.view.chat.hash(req,res,next)
          }
          else {
            next()
          }
        }))
      }
    })

    app.get('/', main.view.chat.hash)

    app.get('/:chatid', main.view.chat.hash)
    app.get('/:chatid/moderator', main.view.chat.moderator)

    // http://localhost:8080/member/QJAAMZDU
    app.get('/:chatid/QJAAMZDU', main.view.chat.hash)

    app.listen(conf.web.port);
    log("port", app.address().port)


    


    app.use( connect.static( __dirname + '/../../../site/public') )

    app.use( initsocial() )    
    
    app.use( json )
    app.use( loadchat )

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
        capp.get('/api/user/:nick/avatar', main.api.user.get_avatar)

        capp.get('/api/user/:nick/details', main.api.user.get_details)
      })
    )


    app.use( auth )
        
    app.use( 
      connect.router(function(capp){
        capp.post('/api/auth/:action', main.api.auth.post)

        capp.put('/api/chat', main.api.chat.save)

        capp.get('/api/user/:nick', main.api.user.get)
        capp.post('/api/user/:nick', main.api.user.post)


        capp.post('/api/user/:nick/terms', main.api.user.post_terms)
        capp.get('/api/user/:nick/history', main.api.user.get_history)

        capp.get('/api/chat/:chatid/user/:nick/dm', main.api.chat.dm.get_conv)
        capp.get('/api/chat/:chatid/dm/:dmid?', main.api.chat.dm.get)
        capp.get('/api/chat/:chatid/dm', main.api.chat.dm.get)

        capp.post('/api/chat/:chatid/msg/:msgid/share', main.api.chat.msg.share)
      })
    )



    app.use( chatmustbeopen )
        
    app.use( 
      connect.router(function(capp){
        capp.post('/api/chat/:chatid/msg/:msgid/agree', main.api.chat.msg.post_agree)
        capp.post('/api/chat/:chatid/msg', main.api.chat.msg.post)

        capp.put('/api/chat/:chatid/user/:nick/dm', main.api.chat.dm.put)

        capp.post('/api/chat/:chatid/msg/:msgid/status', main.api.chat.msg.post_status)
      })
    )


    app.use( mustbemod )

    app.use( 
      connect.router(function(capp){
        capp.post('/api/chat/:chatid', main.api.chat.save)

        capp.post('/api/chat/:chatid/topic/:topic', main.api.chat.topic.post)
        capp.post('/api/chat/:chatid/topic/:topic/active', main.api.chat.topic.post_active)

        capp.post('/api/chat/:chatid/user/:nick/status', main.api.chat.user.post_status)
        capp.post('/api/chat/:chatid/invite', main.api.chat.invite)

        capp.post('/api/chat/:chatid/state', main.api.chat.state)
        capp.post('/api/chat/:chatid/publish', main.api.chat.publish)

        capp.post('/api/chat/:chatid/movevanity', main.api.chat.movevanity)
      })
    )


    app.use( mustbeadmin )

    app.use( 
      connect.router(function(capp){
        capp.get('/api/chat/:chatid/admin/moderator', main.api.chat.admin.moderator.get)
        capp.put('/api/chat/:chatid/admin/moderator', main.api.chat.admin.moderator.put)
        capp.post('/api/chat/:chatid/admin/moderator/:name', main.api.chat.admin.moderator.post)
        capp.del('/api/chat/:chatid/admin/moderator/:name', main.api.chat.admin.moderator.del)

        capp.get('/api/chat/:chatid/admin/alias', main.api.chat.admin.alias.get)
        capp.put('/api/chat/:chatid/admin/alias', main.api.chat.admin.alias.put)
        capp.post('/api/chat/:chatid/admin/alias/:name', main.api.chat.admin.alias.post)
        capp.del('/api/chat/:chatid/admin/alias/:name', main.api.chat.admin.alias.del)
      })
    )



    //console.__debug__ = true

    main.everyone = now.initialize(
      app, 
      {
        socketio: {
          transports: ['flashsocket', 'websocket', 'htmlfile', 'xhr-multipart', 'xhr-polling', 'jsonp-polling'],
          xtransports: ['xhr-'],
          rememberTransport:false,
          connectTimeout:300,
          tryTransportsOnConnectTimeout:true,
          reconnect:true,
          reconnectionDelay:300,
          maxReconnectionAttempts:21
        }
      }
    )

    main.everyone.now.joinchat = function(msgjson){
      var msg = JSON.parse(msgjson)
      var nick = this.now.name

      log('joinchat',nick,msg.chat)

      if( !nick ) {
        log('error',{nowjs:'no-name',on:'joinchat', msg:msgjson})
        return
      }


      var group = now.getGroup(msg.chat)
      group.addUser(this.user.clientId);

      waitfor( group.now, 'receiveMessage', 'joinchat:'+nick+':'+msg.chat, function() {
        group.now.receiveMessage(nick, JSON.stringify({type:'join', nick:nick}))
      })

      main.chat.addnick(msg.chat,nick)
    }


    main.everyone.now.distributeMessage = function(msgjson,cb){
      log('msg',msgjson)

      var msg = JSON.parse(msgjson)
      msg.f = this.now.name

      main.msg.post(msg,cb)
    }
  }
)

module.exports = main

