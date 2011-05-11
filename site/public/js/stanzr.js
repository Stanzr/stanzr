

function enterkey(cb) {
  return function(event) {
    if( 13 == event.keyCode ) {
      cb()
    }
  }
}


function debug() {
  if( app && app.debug && 'undefined' != typeof(console) ) {
    console.log.apply(console,arguments)
  }
}


function RE(win) {
  return function(err){
    if( err ) {
      debug('error',err)
    }
    else {
      win && win.apply( this, [].slice.call(arguments,1) )
    }
  }
}


function ct(cb) {
  return function(event){
    debug(event)
    var id = event.target.id
    if( id && app.chartaca ) {
      var ce = 'click:'+id+':'+app.chat.chatid
      debug(ce)
      app.chartaca.fire(ce)
    }
    cb(event)
  }
}
var $fnclick = $.fn.click
$.fn.click = function(a,c){
  if(c) {
    $fnclick.call(this,a,ct(c))
  }
  else {
    $fnclick.call(this,ct(a))
  }
}

var http = {

  success:function(cb){
    return function(res){
      cb && cb(null,res)
    }
  },

  error:function(cb){
    return function(jqXHR, textStatus, errorThrown){
      cb && cb({jqXHR:jqXHR, textStatus:textStatus, errorThrown:errorThrown},null)
    }
  },

  post: function(url,data,cb) {
    $.ajax({
      url:url,
      type:'POST',
      contentType:'application/json',
      data:JSON.stringify(data),
      dataType:'json',
      success:http.success(cb),
      error:http.error(cb)
    })
  },



  get: function(url,cb) {
    $.ajax({
      url:url,
      dataType:'json',
      success:function(res){
        cb && cb(res)
      }
    })
  }
  
}


var app = {
  debug:window.location.hash=='#debug',

  topic: 0,
  active_topic: 0,
  topicheads:[],

  chat: {},
  msgcache: {},
  nickmap: {},
  joinmap: {},
  avimg: {},
  invitesused: 0,


  text: {
    dummy: null
    ,loginfail: 'Your Login details are incorrect. Please try again.'
    ,registerfail: 'That username is taken. Please try again.'

    ,chatopenmsg: 'chat opened'
    ,chatclosedmsg: 'chat closed'
  },


  changetopic: function(topic) {
    if( 'done' == page.chat.state ) {
      return
    }

    app.topic = topic
    app.topichead = app.topicheads[app.topic] && app.topicheads[app.topic].el.box
    app.updatetopics()

    $('ul.topicposts').hide()
    app.topicposts = $('#topic_posts_'+app.topic).show()

    app.resize()

    app.postbottom()
  },


  postbottom: function() {
    var postsarea = $('div.postsarea')
    var h  = postsarea.height()
    if( postsarea[0] ) {
      var sh = postsarea[0].scrollHeight
      postsarea.scrollTop( sh - h  )
    }
  },


  /*
  sendbox: function() {
    if( 'open'==page.chat.state ) {
      // show or hide on topix
      $('#post_text').removeAttr("disabled").removeClass('logged-out').focus();
      $('#post_send').removeAttr("disabled").removeClass('logged-out');
      $('.topicsend .join-in').removeClass('logged-out').hide();
      $('.topicsend .tweetout').removeClass('logged-out').fadeIn();
      app.midbar.box.send.render()
    }
    else {
      $('div.topicsend').hide()
    }
  },
  */

  resize: function( chop ) {
    chop = 'undefined'==typeof(chop)?0:_.isNumber(chop)?chop:0;


    var winh    = $(window).height()
    var headerh = $('div.header').height()
    var colh    = Math.max( 400, winh - headerh - chop)
    $('div.col').height(colh)

    if( app.topichead ) {
      var thh = app.topichead.height() || 50
      var sbh = $('div.topicsend').height() || 100
      $('div.postsarea').height( colh-(sbh+thh+50) - chop )
    }
  },


  gotoactive: function() {
    var topics = app.chat.topics
    for(var i = 0; i < topics.length; i++ ) {
      if( topics[i].active ) {
        app.changetopic(i)
        break
      }
    }
  },


  makeactive: function() {
    var topic = app.topic
    $.ajax({
      url:'/api/chat/'+app.chat.chatid+'/topic/'+topic+'/active',
      type:'POST',
      dataType:'json',
      contentType:'application/json',
      data:'{}',
      success:function(res){
        app.active_topic = res.topic

        var topics = app.chat.topics
        for(var i = 0; i < topics.length; i++ ) {
          topics[i].active = (i==app.active_topic)
        }

        app.changetopic(topic)
      }
    })
  },


  loadmsg: function(msgid,cb) {
    $.ajax({
      url:'/api/chat/'+app.chat.chatid+'/msg/'+msgid,
      dataType:'json',
      success:function(res){
        app.msgcache[msgid] = res
        cb && cb(res)
      }
    })
  },


  agree: function(msgid) {
    $.ajax({
      url:'/api/chat/'+app.chat.chatid+'/msg/'+msgid+'/agree',
      type:'POST',
      contentType:'application/json',
      data:'{}',
      dataType:'json',
      success:function(res){
      }
    })
  },


  dm: function(to,body,cb) {
    $.ajax({
      url:'/api/chat/'+app.chat.chatid+'/user/'+to+'/dm',
      type:'PUT',
      contentType:'application/json',
      data:JSON.stringify({body:body}),
      dataType:'json',
      success:function(res){
        cb && cb(res)
      }
    })
  },


  loaddm: function(dmid,other,cb) {
    $.ajax({
      url:'/api/chat/'+app.chat.chatid+
        (other?'/user/'+other:'')+
        '/dm'+(dmid?'/'+dmid:''),
      dataType:'json',
      success:function(res){
        cb && cb(res)
      }
    })
  },


  history: function(cb) {
    $.ajax({
      url:'/api/user/'+nick+'/history',
      dataType:'json',
      success:function(res){
        cb && cb(res)
      }
    })
  },


  getuser: function(cb) {
    http.get('/api/user/'+page.user.nick,function(res){
      cb && cb(res)
    })
  },


  getavatar: function(avnick,cb) {
    if( app.avimg[avnick] || null === app.avimg[avnick] ) {
      cb && cb(app.avimg[avnick])
    }
    else {
      http.get('/api/user/'+avnick+'/avatar',function(res){
        app.avimg[avnick] = res.avimg || null
        cb && cb(res.avimg)
      })
    }
  },


  hidemsg: function(msgid,hide,cb) {
    http.post( '/api/chat/'+app.chat.chatid+'/msg/'+msgid+'/status',
               {hide:hide}, 
               RE(function(msg){
                 app.msgcache[msgid] && (app.msgcache[msgid].h = hide)
                 cb && cb(msg)
               }))
  },


  updatemsg: function(msgid,state,cb){
    var msg = app.msgcache[msgid]
    if( msg ) {
      var msginst = {
        stanza: $('#msg_'+msgid),
        agree: $('#agree_'+msgid),
        reply: $('#reply_'+msgid),
        cc: $('#cc_'+msgid)
      }
      
      for( var elid in msginst ) {
        var el = msginst[elid]
        if( 'hide' == state ) {
          el.css({display:'none'})
        }
      }

      cb && cb()
    }
  },


  joinchat: function() {
    var msg = JSON.stringify({chat:chatid})
    debug(msg)
    now.joinchat(msg)
  },


  sendinvite: function(tnick,body,cb) {
    if( app.ismod && app.invitesused < 3 ) {
      app.invitesused++
      
      http.post( '/api/chat/'+app.chat.chatid+'/invite',
                 {nick:tnick,body:body}, 
                 RE(function(msg){
                   cb && cb(msg)
                 }))
      
    }
  },


  openchat: function() {
    if( app.ismod && 'open' != app.chat.state ) {
      app.chat.state = 'open'
      http.post( '/api/chat/'+app.chat.chatid+'/state',
                 {state:'open'}, 
                 RE(function(data){
                   app.updatetopics(data)
                 }))
    }
  },


  closechat: function() {
    if( app.ismod && 'open' == app.chat.state ) {
      app.chat.state = 'closed'
      http.post( '/api/chat/'+app.chat.chatid+'/state',
                 {state:'closed'}, 
                 RE(function(data){
                   app.updatetopics(data)
                 }))
    }
  },


  updatetopics: function() {
    debug('updatetopics',app.topicheads)
    for( var i = 0; i < app.topicheads.length; i++ ) {
      app.topicheads[i].render()
    }
  },


  formatmsgtext: function( text ) {
    return linkify( document.createTextNode(text).textContent )
  },


  displaymsg: function(msg) {
    debug(msg)
    if( msg.h ) return;

    app.nickmap[msg.f] = true

    msg.p = 'undefined'==typeof(msg.p) ? app.topic : msg.p

    var post = $('#posts_tm li.message').clone()
    post.attr('id','msg_'+msg.i)
    post.find('h4').text(msg.f)
    post.find('p').html( app.formatmsgtext(msg.t) )

    if( msg.s ) {
      var when = post.find('div.when').attr('title',msg.s).text($.timeago(msg.s))
      app.timeago.push(when)
    }

    if( app.chat.modnicks[msg.f] ) {
      post.find('div.moderator').removeClass('hide')
    }

    app.getavatar(msg.f,function(avimg){
      if( avimg ) {
        debug('avimg',msg.f,avimg)
        post.find('div.post_avatar').html('<img src="'+avimg+'" width="32" height="32"></img>')
      }
    })

    if( !msg.x ) {
      if( 0 < msg.a ) {
        post.find('.agrees').text('x'+msg.a)
      }

      post.find('a.sprite-at-reply').click(function(){
        var txt = $('#post_text').val()
        if( -1 == txt.indexOf( msg.f ) ) {
          $('#post_text').val( '@'+msg.f+' '+txt ) 
        }
        $('#post_text').focus()
      })

      var approve = post.find('a.sprite-approve')
      if( (msg.an && _.include(msg.an,nick)) || nick == msg.f ) {
        approve.css({background:'transparent'})
      }
      else {
        approve.click(function(){
          approve.animate({opacity:0.01},function(){
            approve.css({background:'transparent'})
          })

          msg.an = msg.an || []
          msg.an.push(nick)
          msg.an = _.uniq(msg.an)
          msg.a = msg.an.length

          post.find('.agrees').text('x'+msg.a)

          app.agree(msg.i)
        })
      }
    }

    
    var hidemsg = post.find('a.sprite-hide')

    if( app.ismod || nick == msg.f ) {
      hidemsg.css({display:'inline-block'})
    }

    hidemsg.click(function(){
      app.updatemsg(msg.i,'hide',function(){
        app.hidemsg(msg.i,true,debug)
      })
    })

    post.css({opacity:0})
    
    var topicposts = $('#topic_posts_'+msg.p)
    topicposts.append(post)

    if( app.ismod ) {
      setTimeout(function(){
        app.updatemsg(msg.i,msg.h?'hide':'show')
      },200)
    }


    var opacity = msg.x ? 0.5 : 1.0

    if( msg.p == app.topic && !msg.h ) {
      post.animate({opacity:opacity},500)
      app.postbottom()
    }
    else if( !msg.h) {
      post.css({opacity:opacity})
    }
  },





  popup: {
    box: {}
  },


  rightbar: {
    box: {},

    show: function(others) {
      for( var i = 0; i < others.length; i++ ) {
        var box = app.rightbar.box[others[i]]
        box && box.show()
      }
    },
    
    hide: function(others) {
      for( var i = 0; i < others.length; i++ ) {
        var box = app.rightbar.box[others[i]]
        box && box.hide()
      }
    }
  },

  
  leftbar: {
    box: {}
  },

  midbar: {
    box: {}
  }
  
}


function killpopups(next) {
  return function(){$('.modalbox').hide();next()}
}



$(function(){
  app.chartaca = Chartaca.init({key:'2910f2ee-3737-48ec-980f-001574c2d2de',target:'stanzr.com'})
  app.chartaca.fire('view:'+page.chat.chatid)
  //$.cookie('socketio','flashsocket')

  $.reject({  
    reject: {
      msie: true, // Microsoft Internet Explorer  
      opera: true, // Opera  
      konqueror: true, // Konqueror (Linux)  
      unknown: true // Everything else  
    },
    display: ['chrome','safari','firefox'],
    header: 'Your browser is not supported yet', // Header Text  
    paragraph1: 'You are currently using an unsupported browser', // Paragraph 1  
    paragraph2: 'Please install one of the many optional browsers below to proceed', // Paragraph 2  
    closeMessage: '', // Message below close window link  
    imagePath: '/img/'
  });

  //$.timeago.settings.strings.seconds = "just now"
  $.timeago.settings.refreshMillis = 60000
  app.timeago = $('#timeago').timeago()

  app.changetopic(0)
  
  app.resize()
  window.onresize = app.resize


  app.el = {
    dummy: null
    ,head_hostchat: $('#head_hostchat')
    ,head_signup: $('#head_signup')
    ,topic_signup: $('.topic_signup')
    ,head_login: $('#head_login')
    ,head_nick: $('#head_nick')
    ,head_history: $('#head_history')
    ,head_settings: $('#head_settings')
    
    ,leftcol: $('div.leftcol')
    ,midcol: $('div.midcol')
    ,rightcol: $('div.rightcol')
  }





  function inituser(){    
    if( !now.name ) {
      now.name = nick
    }

    now.receiveMessage = function(from, jsonstr){
      debug('msgin',from,jsonstr)
      var msg = JSON.parse(jsonstr)

      if( 'message' == msg.type ) {
        if( !app.msgcache[msg.i] ) {
          app.msgcache[msg.i] = msg
          app.displaymsg(msg)
          app.rightbar.box.reply.set(msg)
        }
      }
      else if( 'join' == msg.type ) {
        if( msg.nick ) {
          if( nick == msg.nick && chatid ) {
            app.midbar.box.send.render()
          }
          else if( !app.joinmap[nick] ) {
            infomsg( msg.nick + ' has joined' )
            app.joinmap[nick]=1
          }

          app.nickmap[nick] = true
          app.rightbar.box.avatar.add(from)
        }
      }
      else if( 'topic' == msg.type ) {
        if( app.active_topic != msg.topic ) {
          app.active_topic = msg.topic
          var topics = app.chat.topics
          for(var i = 0; i < topics.length; i++ ) {
            topics[i].active = (i==app.active_topic)
          }

          app.changetopic(app.topic)
          if( app.chat.modnick != nick ) {
            infomsg( 'discussion has moved to next topic' )
          }
        }
      }
      else if( 'agree' == msg.type ) {
        var msgid = msg.msgid

        function incmsg(msg) {
          msg.an = msg.an || []
          msg.an.push(from)
          msg.an = _.uniq(msg.an)
          msg.a = msg.an.length

          app.rightbar.box.agree.render(msg)
        }

        if( app.msgcache[msgid] ) {
          incmsg(app.msgcache[msgid])
        }
        else {
          app.loadmsg(msgid,function(){
            incmsg(app.msgcache[msgid])
          })
        }
      }
      else if( 'dm' == msg.type ) {
        if( msg.to == nick ) {
          app.loaddm(msg.dm,null,function(msg){
            app.rightbar.box.dm.add(msg)
          })
        }
      }
      else if( 'status' == msg.type ) {
        if( msg.visible ) {
          app.updatemsg(msg.msgid,msg.visible,debug)
        }
        else if( 'chat.state' == msg.sub ) {
          app.chat.state = msg.state
          app.updatetopics()
          app.midbar.box.send.render()
          infomsg( 'open' == msg.state ? app.text.chatopenmsg : app.text.chatclosedmsg )
        }
      }
      else if( 'external' == msg.type ) {
        app.rightbar.box.avatar.external(msg)
      }
    }

    
    setTimeout(app.joinchat,1000)
  }




  function signupbox(next) {
    $('#signup_box').show()
    app.signupbox_next = next
  }
  
  var registrationProcess = function() {
    $.ajax({
      url:'/api/auth/register',
      type:'POST',
      dataType:'json',
      contentType:'application/json',
      data:JSON.stringify({
        nick:$('#register_username').val(),
        password:$('#register_password').val(),
        email:$('#register_email').val()
      }),
      success:function(res){
        if( res.ok ) {
          window.nick = res.nick
          if( app.signupbox_next ) {
            var next = app.signupbox_next
            delete app.signupbox_next
            next()
          }
          else {
            window.location.href = '/api/bounce/'+(chatid||'member')
          }
        }
        else {
          $('#register_msg').text(app.text.registerfail)
        }
      }
    })
  };
  
  var registrationOnEnter = function(e){ 
    if (e.keyCode == 13) 
    registrationProcess() 
  };
  
  
  $('#register_username').live('keydown', registrationOnEnter);
  $('#register_email').live('keydown', registrationOnEnter);
  $('#register_password').live('keydown', registrationOnEnter);
  $('#register_repeat').live('keydown', registrationOnEnter);
  $('#register_registerbtn').click(registrationProcess);
  
  app.signupbox = signupbox


  function loginbox() {
    $('#login_box').show()
  }

  var loginProcess = function(){
    $.ajax({
      url:'/api/auth/login',
      type:'POST',
      dataType:'json',
      contentType:'application/json',
      data:JSON.stringify({nick:$('#login_username').val(),password:$('#login_password').val()}),
      success:function(res){
        if( res.ok ) {
          window.location.href = '/api/bounce/'+(chatid||'member')
        }
        else {
          $('#login_msg').text(app.text.loginfail)
        }
      }
    })
  }
  
  var loginOnEnter = function(e){ 
    if (e.keyCode == 13) 
    loginProcess() 
  };
  
  $('#login_username').live('keydown', loginOnEnter);
  $('#login_password').live('keydown', loginOnEnter);
  $('#login_loginbtn').click(loginProcess)






  $('#head_logout').click(function(){
    $.ajax({
      url:'/api/auth/logout',
      type:'POST',
      contentType:'application/json',
      dataType:'json',
      data:'{}',
      success:function(res){
        window.location.href = '/api/bounce/'+(chatid||'member')
      }
    })
  })


  $('div.modalbox').css({left:($(window).width()-200)/2})


  if( 'done' == page.chat.state ) {
    $('div.topicsend').hide()
  }
  else {
    debug('aaa')
    if( nick ) {
      debug('bbb')
      now.ready(function(){
        debug('ccc')
        inituser()
      })
    }
    else {
      //$('#welcome').show()
    }
  }


  function infomsg(text) {
    var post = $('#posts_tm li.infomsg').clone()
    post.find('p').text(text)
    var topicposts = $('#topic_posts_'+app.topic)
    topicposts.append(post)
    post.animate({opacity:1},500)
    app.postbottom()
  }


  

  app.popup.box.hostchat  = new HostChatBox()
  app.popup.box.profile   = new ProfileBox()
  app.popup.box.settings  = new SettingsBox()
  app.popup.box.history   = new HistoryBox()

  app.leftbar.box.detail  = new ChatDetailsBox()

  app.midbar.box.send  = new SendBox()

  app.rightbar.box.avatar = new AvatarBox()
  app.rightbar.box.agree  = new AgreeBox()
  app.rightbar.box.reply  = new ReplyBox()
  app.rightbar.box.dm     = new DirectMessageBox()

  app.curate = new Curate()

  app.el.head_hostchat.click(killpopups(app.popup.box.hostchat.hostchat))
  app.el.head_signup.click(killpopups(signupbox))
  app.el.topic_signup.click(killpopups(signupbox))
  app.el.head_login.click(killpopups(loginbox))

  app.el.head_nick.click(killpopups(function(){
    app.popup.box.settings.render()
  }))

  app.el.head_settings.click(killpopups(function(){
    app.popup.box.settings.render()
  }))

  app.el.head_history.click(killpopups(function(){
    app.popup.box.history.render()
  }))




  $('h4').live('click',function(event){
    var n = $(event.target).text()
    if( app.nickmap[n] ) {
      app.popup.box.profile.render(n)
    }
  })





  if( chatid ) {
    $.ajax({
      url:'/api/chat/'+chatid,
      type:'GET',
      dataType:'json',
      success:function(res){
        app.chat = res

        if( !app.chat.modnicks ) {
          app.chat.modnicks = {}
          app.chat.modnicks[app.chat.modnick]=1
        }

        app.ismod = app.chat.modnicks && app.chat.modnicks[nick]

        var nicks = res.nicks || []
        for( var i = 0; i < nicks.length; i++ ) {
          var other = nicks[i]
          app.rightbar.box.avatar.add(other)
        }


        var topicheads = $('#topicheads')
        var postsarea = $('div.postsarea')

        var topicposts_tm = $('#topicposts_tm')

        app.topic  = res.topic || 0
        var topics = res.topics || ['General']

        if( 'done'!=page.chat.state ) {

          for( var i = 0; i < topics.length; i++ ) {
            var topic = topics[i]
            topic.index = i
            topic.islast = i == topics.length-1

            if( topic.active ) {
              app.active_topic = i
            }

            var topichead = new TopicHead(topic)
            topichead.build()
            app.topicheads.push(topichead)

            topicheads.append(topichead.el.box)

            var topicposts = topicposts_tm.clone()
            topicposts.attr('id','topic_posts_'+i)

            postsarea.append(topicposts)
            topicposts.css({display:'none'})
          }
          app.changetopic(app.active_topic)            
          app.updatetopics()
          app.postbottom()
          app.leftbar.box.detail.init(res)


          $.ajax({
            url:'/api/chat/'+chatid+'/msgs',
            type:'GET',
            dataType:'json',
            success:function(res){
              debug(res)
              for( var i = 0; i < res.length; i++ ) {
                var msg = res[i]
                app.msgcache[msg.i] = msg
                app.displaymsg(msg)
              }

              app.rightbar.box.agree.load()
              app.rightbar.box.reply.set(res)
              app.rightbar.box.dm.load()
            }
          })
        }

        // chat done
        else {
          app.rightbar.box.agree.load()
          app.rightbar.box.reply.set(res)
        }
      }
    })
  }

  else if( nick ) {
    if( !/stanzr\.(com|test)\/?$/.exec( document.location.href ) ) {
      $('#hostyourown').show()
    }

    $('#rally_members').hide()
  }
  
});



function showif(obj,spec) {
  if( spec ) { 
    obj.__showif = spec
  }
  else if( obj.__showif ) {
    for( var en in obj.__showif ) {
      var elem = obj.el[en]
      if( elem ) {
        var show = (obj.__showif[en])()
        debug('showif',obj.el.box&&obj.el.box.attr('id'), en,show,elem)
        if( show ) {
          elem.show()
        }
        else {
          elem.hide()
        }
      }
    }
  }
}


function TopicHead(topic) {
  var self = this
  self.topic = topic

  debug('TopicHead',topic)

  self.el = {
    dummy: null

    ,topichead_tm: $('#topichead_tm')
  }

  



  self.build = function() {
    var topichead = self.el.topichead_tm.clone()
    topichead.attr('id','topic_head_'+self.topic.index)

    debug(topichead)

    self.el.box = topichead

    self.el.backward_fill = topichead.find('div a.sprite-page-backward-fill')
    self.el.backward      = topichead.find('div a.sprite-page-backward')
    self.el.forward       = topichead.find('div a.sprite-page-forward')

    self.el.gotoactive = topichead.find('div.rally_gotoactive')
    self.el.makeactive = topichead.find('div.rally_makeactive')
    self.el.open = topichead.find('div.rally_open')
    self.el.close = topichead.find('div.rally_close')

    self.el.title = topichead.find('h4')
    self.el.desc  = topichead.find('p.rally_topicdesc')

    self.el.title.text(topic.title)
    self.el.desc.text(topic.desc)


    function movetopic(dir){
      return function() {
        app.changetopic(app.topic + dir)            
      }
    }    
    self.el.backward.click(movetopic(-1))
    self.el.forward.click(movetopic(1))

    self.el.gotoactive.click( app.gotoactive )
    self.el.makeactive.click( app.makeactive )
    self.el.open.click( app.openchat )
    self.el.close.click( app.closechat )


    showif(self,{
      box: function() {
        return app.topic == self.topic.index
      },
      backward: function() {
        return 0 < topic.index
      },
      backward_fill: function() {
        return 0 == topic.index
      },
      forward: function() {
        return !topic.islast
      },
      gotoactive: function() {
        return app.active_topic != topic && topic.index < app.active_topic
      },
      makeactive: function() {
        return app.ismod && 'open' == app.chat.state && app.active_topic + 1 == topic.index
      },
      open: function() {
        return app.ismod && 'open' != app.chat.state
      },
      close: function() {
        return app.ismod && 'open' == app.chat.state && topic.islast && app.active_topic == topic.index
      }
    })

  }
  

  self.render = function() {
    debug('render', self.topic)
    showif(self)
  }


}


function SendBox() {
  var self = this

  self.el = {
    dummy: null

    ,box: $('#send_box')

    ,sendbtn: $("#post_send")
    ,text: $("#post_text")
    ,tweet: $('#send_tweet')

    ,tweetout: $('div.tweetout')
    
  }


  
  showif(self,{
    tweetout: function(){
      return page && page.user && 'twitter' == page.user.service
    },
    box: function() {
      return !!nick && (app.ismod || 'open' == app.chat.state )
    }
  })


  self.render = function() {
    showif(self)
  }

  self.post = function() {
    var tweet = self.el.tweet.attr('checked')
    var text  = self.el.text.val()
    
    // Make sure we have text before sending, minimum text length
    // should be set here, and include logic for commands with no text,
    // such as '@someone' and '#hashtag' with nothing after
    if (!text) return false;
    
    var msg = {c:chatid,t:text,type:'message',p:app.topic,w:tweet,g:app.chat.hashtag}
    debug(msg)
    
    self.el.text.val("");
    self.el.text.focus();
    
    now.distributeMessage(JSON.stringify(msg),function(msg){
      app.msgcache[msg.i] = msg
      app.displaymsg(msg)
      app.msgcache[msg.i] = msg
    })
    
    app.chartaca.fire('msg:'+page.chat.chatid)
  }
    
  self.el.sendbtn.click(self.post)
  self.el.text.keypress(enterkey(self.post))
}




function ChatDetailsBox() {
  var self = this

  self.el = {
    dummy: null
    ,img: $('#chat_logo img')  

    ,modmsgbtn: $('#rally_modmsgbtn')
  }


  self.init = function(chat) {

    $('#rally_title').text(chat.title)
    $('#rally_modname').text(chat.modname)
    $('#rally_whenstr').text(chat.whenstr)
    
    $('#rally_desc').html( markdown.toHTML(chat.desc) )
    
    if( app.ismod ) {
      $('#rally_editbtn').show().click(killpopups(app.popup.box.hostchat.editchat))
      $('#rally_curatebtn').show().click(killpopups(app.curate.render))
    }


    if( chat.logo ) {
      var imgurl = 'http://c1.stanzr.com/img/logo/'+chat.logo
      var imgobj = new Image()
      imgobj.src = imgurl
      imgobj.onload = function() {
        var width = 200 < imgobj.width ? 200 : imgobj.width
        self.el.img.css({width:width}).attr('src',imgurl).show()
      }
    }

    self.el.modmsgbtn.click(function(){
      for( var modnick in app.chat.modnicks ) break;
      app.rightbar.box.dm.other = modnick
      app.rightbar.box.dm.drilldown()
    })
  }
}



function RightbarBox() {
  this.drill = 'up'

  this.hide = function() {
    this.el.box.slideUp();
  }

  this.show = function() {
    this.el.box.slideDown();
  }

  this.all = ['avatar','agree','reply','dm']


  function drillup(self,others){
    return function() {
      self.el.box.animate({height:140})
      setTimeout(function(){
        app.rightbar.show(others)
        self.drill = 'up'
        self.render()
      },200)
      self.el.drilldown.show()
      self.el.drillup.hide()
      return self
    }
  }

  function drilldown(self,others){
    return function() {
      self.drill = 'down'
      self.render()
      app.rightbar.hide(others)
      setTimeout(function(){
        self.el.box.animate({height:$('div.rightcol').height()-21})
      },200)
      self.el.drilldown.hide()
      self.el.drillup.css({display:'inline-block'})
      return self
    }
  }
  

  this.init = function(me) {
    var self = this
    var others = []
    for(var i = 0; i < this.all.length; i++) {
      if( me != this.all[i] ) {
        others.push(this.all[i])
      }
    }

    self.drillup = drillup(self,others)
    self.drilldown = drilldown(self,others)

    self.el.drillup.click(self.drillup)
    self.el.drilldown.click(self.drilldown)
  }
}



function DirectMessageBox() {
  var self = this

  self.el = {
    dummy: null
    ,drilldown: $('#dm_drilldown')
    ,drillup: $('#dm_drillup')
    ,box: $('#dm_box')

    ,list: $('#dm_list')
    ,msg_tm: $('#dm_msg_tm')

    ,text: $('#dm_text')
    ,send: $('#dm_send')
    ,sendbtn: $('#dm_sendbtn')
    ,allbtn: $('#dm_allbtn')
  }

  self.init('dm')

  self.other = null
  self.todm = []
  self.conv = {}


  self.el.allbtn.click(function(){
    self.other = null
    self.render()
  })


  self.el.sendbtn.click(function(){
    var body = self.el.text.val()
    self.el.text.val('')
    app.dm(self.other,body,function(msg){
      self.add(msg)
      self.render()
    })
  })
  self.el.text.keypress(enterkey(function(){self.el.sendbtn.click()}))


  showif(self,{
    send: function(){
      return !!self.other && 'down' == self.drill
    },
    allbtn: function(){
      return !!self.other
    }
  })



  self.render = function(other) {
    self.el.list.empty()

    other = other || self.other

    var dmlist = self.todm
    if( other ) {
      self.other = other

      if( !self.conv[other] ) {
        app.loaddm(null,other,function(dmlist){
          self.conv[other] = dmlist
          buildlist(dmlist)
        })
      }
      else {
        buildlist(self.conv[other])
      }
    }
    else {
      buildlist(dmlist)
    }

    function buildlist(dmlist) {
      for( var i = 0; i < dmlist.length; i++ ) {
        var msg = dmlist[i]
        var msgdiv = self.el.msg_tm.clone().attr('id','').css({display:'block'})
        msgdiv.find('h4').text(msg.f)
        msgdiv.find('.post').text(msg.b)
        self.el.list.append(msgdiv.fadeIn())

        if( !other ) {
          msgdiv.click(
            (function(from){
              return function(){
                self.render(from)
              }
            })(msg.f)
          )
        }

        if( 'up' == self.drill && 100 < self.el.list.height() ) {
          i = dmlist.length
        }
      }

      showif(self)

      if( 'down' == self.drill ) {
        if( self.other ) {
          self.el.box.css({'overflow-y':'auto'})

          self.el.box.scrollTop(
            self.el.send.offset().top - self.el.box.offset().top
          )
        }
        else {
          self.el.box.css({'overflow-y':'hidden'})
        }
      }
    }
  }


  self.load = function() {
    app.loaddm(null,null,function(dmlist){
      self.todm = dmlist
      self.render()
    })
  }

  
  self.add = function(dm) {
    self.todm.unshift(dm)
    var other = dm.f
    if( nick == other ) {
      other = dm.t
    }
    self.conv[other] = self.conv[other] || []
    self.conv[other].push(dm)
    self.render()
  }

}
DirectMessageBox.prototype = new RightbarBox()



function AgreeBox() {
  var self = this

  self.el = {
    dummy: null
    ,drilldown: $('#agree_drilldown')
    ,drillup: $('#agree_drillup')
    ,box: $('#agree_box')

    ,msgs: $('#rally_agree')
    ,msg_tm: $('#agree_msg_tm')

  }

  self.init('agree')

  var agrees = []


  self.render = function(msg) {
    if( msg ) {
      agrees.push(msg.i)
      agrees = _.uniq(agrees)
    }

    debug('pre-sort',agrees)
    agrees.sort(function(a,b){
      var ma = app.msgcache[a]
      var mb = app.msgcache[b]
      return ma && mb ? mb.a - ma.a : 0;
    })
    debug('post-sort',agrees)

    self.el.msgs.empty()

    for( var i = 0; i < agrees.length; i++ ) {
      function displaymostagreed(msg){
        if( 1 <= msg.a ) {
          var msgdiv = self.el.msg_tm.clone().attr('id','agree_'+msg.i)
          msgdiv.find('h4').text(msg.f)
          msgdiv.find('.count').text('x'+msg.a)
          msgdiv.find('.post').text(msg.t)

          if( !msg.h ) {
            self.el.msgs.append(msgdiv)
            msgdiv.fadeIn()
          }

          if( 'up' == self.drill && 100 < self.el.msgs.height() ) {
            i = agrees.length
          }
        }
      }

      var msgid = agrees[i]
      if( msgid ) {
        var msg = app.msgcache[msgid]
        if( !msg ) {
          app.loadmsg(msgid,function(msg){
            displaymostagreed(msg)
          })
        }
        else {
          displaymostagreed(msg)
        }
      }
    }
  }


  self.load = function() {
    $.ajax({
      url:'/api/chat/'+chatid+'/msgs/agrees',
      type:'GET',
      dataType:'json',
      success:function(res){
        agrees = res
        self.render()
      }
    })
  }

}
AgreeBox.prototype = new RightbarBox()



function ReplyBox() {
  var self = this

  self.el = {
    dummy: null
    ,drilldown: $('#reply_drilldown')
    ,drillup: $('#reply_drillup')
    ,box: $('#reply_box')

    ,msgs: $('#rally_reply')
    ,msg_tm: $('#reply_msg_tm')
  }

  self.init('reply')


  var replies = []

  self.set = function(msgs) {
    if( !_.isArray(msgs) ) {
      msgs = [msgs]
    }

    var found = false

    for( var i = 0; i < msgs.length; i++ ) {
      var msg = msgs[i]
      if( _.include(msg.r,nick) ) {
        replies.unshift(msg.i)
        found = true
      }
    }

    if( found ) {
      self.render()
    }
  }


  self.render = function(msg) {
    if( msg ) {
      replies.unshift(msg.i)
      replies = _.uniq(replies)
    }

    self.el.msgs.empty()

    for( var i = 0; i < replies.length; i++ ) {
      function displayreply(msg){
        var msgdiv = self.el.msg_tm.clone().attr('id','reply_'+msg.i)
        msgdiv.find('h4').text(msg.f)

        if( msg.a ) {
          msgdiv.find('.count').text('x'+msg.a)
        }

        msgdiv.find('.post').text(msg.t)
        self.el.msgs.append(msgdiv)

        if( !msg.h ) {
          msgdiv.fadeIn()
        }

        if( 'up' == self.drill && 100 < self.el.msgs.height() ) {
          i = replies.length
        }
      }

      var msgid = replies[i]
      if( msgid ) {
        var msg = app.msgcache[msgid]
        if( !msg ) {
          app.loadmsg(msgid,function(msg){
            displayreply(msg)
          })
        }
        else {
          displayreply(msg)
        }
      }
    }
  }
  
}
ReplyBox.prototype = new RightbarBox()



function AvatarBox() {
  var self = this
  
  self.el = {
    dummy: null
    ,drilldown: $('#avatar_drilldown')
    ,drillup: $('#avatar_drillup')
    ,box: $('#avatar_box')
  }

  self.init('avatar')

  var avatars = {}

  self.add = function(avnick) {
    if( avnick ) {
      if( !avatars[avnick] ) {

        var avatar = $('#miniavatar_tm').clone()
        avatar.attr('id','miniavatar_'+avnick)
        
        app.popup.box.profile.render(avnick);
        
        avatar
          .attr('title', $('#profile_box').html())
          .qtip({
            hide: {
              target: false,
              event: 'mouseleave',
              effect: true,
              delay: 250,
              fixed: true,
              inactive: false,
              leave: 'window',
              distance: false
            }
          });
        
        
        $('#rally_miniavatars').append(avatar)
        avatar.show()
        avatars[avnick] = avatar

        /*
        $.ajax({
          url:'/api/user/'+avnick,
          type:'GET',
          dataType:'json',
          success:function(res){
            if( res.avimg ) {
              app.avimg[avnick] = res.avimg
              avatar.html('<img src="'+res.avimg+'" width="32" height="32"></img>')
            }
          }
        })
        */

        app.getavatar(avnick,function(avimg){
          if( avimg ) {
            avatar.html('<img src="'+avimg+'" width="32" height="32"></img>')
          }
        })

        var pcount = $('#rally_pcount').text()
        pcount = '' == pcount ? 0 : parseInt(pcount,10)
        pcount++
        $('#rally_pcount').text(''+pcount)

        if( app.ismod && app.chat.bans[avnick] ) {
          self.ban(true,avnick)
        }
      }
    }
  }


  var externals = {}

  self.external = function(msg) {
    if( externals[msg.f] ){
      return
    }

    if( avatars[msg.f] ) {
      return
    }

    externals[msg.f] = msg

    var avatar = $('#miniavatar_tm').clone()
    avatar.attr('id','miniavatar_'+msg.f)
    avatar.addClass('external')
    if( msg.av ) {
      avatar.append('<img class="external" src="'+msg.av+'" width="32" height="32"></img>')
    }

    avatar.find('div.external').removeClass('hide')

    avatar.click(function(){
      app.popup.box.profile.render(msg.f,msg.av,true)
    })
    $('#rally_miniavatars').append(avatar)
    avatar.show()
  }
  

  self.ban = function(ban,bnick) {
    if( avatars[bnick] ) {
      avatars[bnick].css({opacity:ban?0.5:1.0})
    }
  }
  

  self.render = function() {}
}
AvatarBox.prototype = new RightbarBox()


function HostChatBox() {
  var self = this

  self.el = {
    dummy: null

    ,createbtn: $('#hostchat_createbtn')
    ,donebtn: $('#hostchat_donebtn')
    ,morebtn: $('#hostchat_morebtn')
    ,lessbtn:$('#hostchat_lessbtn')
    ,backbtn:$('#hostchat_backbtn')

    ,box: $('#hostchat_box')

    ,title:   $('#hostchat_title')
    ,modname: $('#hostchat_modname')
    ,whenstr: $('#hostchat_whenstr')
    ,hashtag: $('#hostchat_hashtag')
    ,desc:    $('#hostchat_desc')

    ,details:    $('#hostchat_details')
    ,topics:     $('#hostchat_topics')

    ,topiclist:    $('#hostchat_topiclist')
    ,topicitem_tm: $('#hostchat_topicitem_tm')
  }


  function newchat() {
    self.el.details.show()
    self.el.topics.hide()

    self.el.title.val()
    self.el.modname.val()
    self.el.whenstr.val()
    self.el.hashtag.val()
    self.el.desc.val()

    self.el.topiclist.empty()
    moretopic()
    moretopic()
    moretopic()

    self.isnew = true
  }


  function viewchat(chat) {
    self.isnew = false
    
    self.el.details.show()
    self.el.topics.hide()

    self.el.title.val( chat.title );
    self.el.modname.val( chat.modname );
    self.el.whenstr.val( chat.whenstr );
    self.el.hashtag.val( chat.hashtag );
    self.el.desc.val( chat.desc );

    self.el.topiclist.empty()
    for( var tI = 0; tI < chat.topics.length; tI++) {
      moretopic(chat.topics[tI])
    }
  }


  function moretopic(topicdata) {
    var topic = self.el.topicitem_tm.clone()
    var tI = self.el.topiclist.find('li').length
    topic.attr('id','hostchat_topic_'+tI)

    if( topicdata ) {
      topic.find('input').val(topicdata.title)
      topic.find('textarea').val(topicdata.desc)
    }

    self.el.topiclist.append(topic)
    topic.show()

    if( 1 < self.el.topiclist.find('li').length ) {
      self.el.lessbtn.show()
    }
  }

  
  function lesstopic() {
    var last = self.el.topiclist.find('li').length - 1
    if( 0 < last ) {
      $(self.el.topiclist.find('li')[last]).remove()
    }
    if( self.el.topiclist.find('li').length <= 1 ) {
      self.el.lessbtn.hide()
    }
  }




  function savechat() {
    var chatid = self.isnew ? null : app.chat.chatid
    var topics = []
    var topicentry
    var tI = 0
    while( 0 < (topicentry = $('#hostchat_topic_'+tI)).length ) {
      var topicstr  = topicentry.find('input').val()
      var topicdesc = topicentry.find('textarea').val()
      if( 0 < topicstr.length ) {
        topics.push({title:topicstr,desc:topicdesc})
      }
      tI++
    }

    var hashtag = self.el.hashtag.val()
    hashtag = hashtag.replace(/#/g,'')

    var title = self.el.title.val()
    var valid = title
    
    if( valid ) {
      $.ajax({
        url:'/api/chat'+(chatid?'/'+chatid:''),
        type: (chatid?'POST':'PUT'),
        dataType:'json',
        contentType:'application/json',
        data:JSON.stringify({

          chatid:     app.chat.chatid,
          moderator:  nick,

          title:      title,
          modname:    self.el.modname.val(),
          whenstr:    self.el.whenstr.val(),
          hashtag:    hashtag,
          desc:       self.el.desc.val(),
          topics:     topics

        }),
        success:function(res){
          if( res.chatid ) {
            window.location.href = '/api/bounce/'+res.chatid
          }
          else {
            $('#hostchat_msg').text('Unable to create chat session')
          }
        }
      })
    }
  }



  self.hostchat = function() {
    if( nick ) {
      newchat()
      self.el.box.show()
    }
    else {
      app.signupbox(killpopups(newchat))
    }
  }

  self.editchat = function() {
    killpopups(function(){ 
      viewchat(app.chat)
      self.el.box.show() 
    })()
  }

  self.el.createbtn.click(function(){
    self.el.details.hide()
    self.el.topics.show()
  })

  self.el.backbtn.click(function(){
    self.el.details.show()
    self.el.topics.hide()
  })


  /*
  $('.hostchat_topic input').live('keydown', function(e){ if (e.keyCode == 13) savechat() });
  
  var nextOnEnter = function(e) {
    if (e.keyCode == 13) {
      self.el.details.hide(); 
      self.el.topics.show(); 
      $('.hostchat_topic:first-child input').focus();
    }
  };
  
  self.el.title.keydown(nextOnEnter);
  self.el.modname.keydown(nextOnEnter);
  self.el.whenstr.keydown(nextOnEnter);
  self.el.hashtag.keydown(nextOnEnter);
  self.el.desc.keydown(nextOnEnter);
  */


  self.el.donebtn.click(function(){
    savechat()
  })

  self.el.morebtn.click(function(){
    moretopic()
  })

  self.el.lessbtn.click(function(){
    lesstopic()
  })
}




function ProfileBox() {
  var self = this

  self.el = {
    dummy: null

    ,box: $('#profile_box')

    ,messagebtn: $('#profile_messagebtn')
    ,banbtn: $('#profile_banbtn')
    ,unbanbtn: $('#profile_unbanbtn')

    ,you: $('#profile_you')

    ,avimg: $('#profile_avimg')
    ,invitebtn: $('#profile_invitebtn')
    ,sendbtn: $('#profile_sendbtn')
    ,body: $('#profile_body')

  }
  self.el.nick = self.el.box.find('h2')

  var cnick
  var avimg
  var external

  showif(self,{
    messagebtn: function() {
      return nick != cnick && !external
    },
    banbtn: function() {
      return app.ismod && nick != cnick && !app.chat.bans[cnick] && !external
    },
    unbanbtn: function() {
      return app.ismod && nick != cnick && app.chat.bans[cnick] && !external
    },
    you: function() {
      return nick == cnick
    },
    invitebtn: function() {
      return external && app.ismod && app.invitesused < 3
    },
    sendbtn: function() {
      return false
    },
    body: function() {
      return false
    }
  })


  self.render = function(pnick,pavimg,pext) {
    cnick = pnick
    avimg = pavimg || app.avimg[cnick]
    external = pext

    //self.el.box.show()
    self.el.nick.text(cnick)

    if( avimg ) {
      self.el.avimg.html('<img src="'+avimg+'" width="32" height="32"></img>')
    }

    showif(self)
  }


  function sendban(ban,cb) {
    $.ajax({
      url:'/api/chat/'+app.chat.chatid+'/user/'+cnick+'/status',
      type:'POST',
      contentType:'application/json',
      dataType:'json',
      data:JSON.stringify({ban:ban}),
      success:function(res){
        cb(res)
      }
    })
  }


  self.el.messagebtn.live('click', function(){
    //self.el.box.hide()
    $('body .qtip').hide();
    app.rightbar.box.dm.other = cnick
    app.rightbar.box.dm.drilldown()
  })

  self.el.banbtn.click(function(){
    app.chat.bans[cnick]=1
    showif(self)
    app.rightbar.box.avatar.ban(true,cnick)
    sendban(true,function(){
    })
  })

  self.el.unbanbtn.click(function(){
    delete app.chat.bans[cnick]
    showif(self)
    app.rightbar.box.avatar.ban(false,cnick)
    sendban(false,function(){
    })    
  })

  self.el.invitebtn.click(function(){
    self.el.box.css({height:300})
    self.el.body.val('@'+cnick+' Come join the chat at: http://www.stanzr.com/'+app.chat.chatid).show()
    self.el.sendbtn.show().click(function(){
      var body = self.el.body.val()
      app.sendinvite(cnick,body)
      self.el.box.hide()
    })
  })

}


function HistoryBox() {
  var self = this

  self.el = {
    dummy: null

    ,box: $('#history_box')

    ,history: $('#history_history')
    ,history_item_tm: $('#history_history_item_tm')

  }


  showif(self,{
  })


  self.render = function() {
    self.el.box.show()

    app.history(function(list){
      self.el.history.empty()

      for(var i = 0; i < list.length; i++ ) {
        var chatitem = list[i]
        var histitem = self.el.history_item_tm.clone().attr('id','').css({display:'block'})
        histitem.find('.history_chat_title').text(chatitem.t)
        histitem.find('.history_chat_modname').text(chatitem.m)
        histitem.click((function(chatid){
          return function(){
            window.location.href = '/api/bounce/'+chatid
          }
        })(chatitem.c))
        self.el.history.append(histitem)
      }
    })

    showif(self)
  }
}

/**
    Icon selector reference

    #avatar_drilldown
    #agree_drilldown
    #reply_drilldown
    #dm_drilldown
    
    .sprite-approve
    .agrees.count
    .sprite-at-reply
    .replies.count
**/

$('.imgbtn[title]:visible, .agrees.count, .replies.count').livequery(function() {
  $(this)
    .qtip({
        hide: {
          target: false,
          event: 'mouseleave',
          effect: true,
          delay: 100,
          fixed: true,
          inactive: false,
          leave: 'window',
          distance: false
        }
      });
});

var ui = {
  text: function(el,map) {
    el = $(el)
    for( var sel in map ) {
      el.find(sel).text(map[sel])
    }
  },
  val: function(el,map) {
    el = $(el)
    for( var sel in map ) {
      el.find(sel).val(map[sel])
    }
  }

}

function SettingsBox() {
  var self = this

  self.el = {
    dummy: null

    ,box: $('#settings_box')

    ,savebtn: $('#curate_savebtn')
  }

  
  showif(self,{
  })


  self.render = function() {
    self.el.box.show()

    app.getuser(function(user){
      ui.text(self.el.box,{
        '#settings_username':user.nick,
      })
      ui.val(self.el.box,{
        '#settings_email':user.email
      })
    })

    showif(self)

    self.el.savebtn.click(function(){
      debug('save')
    })
  }
}



function Curate() {
  var self = this

  var TOPIC_START = 1000000000000


  self.el = {
    dummy: null

    ,topbar: $('#curate')
    ,result: $('#curate_result')

    ,list: $('#curate_list')

    ,topic_tm: $('#curate_topic_tm')
    ,anno_tm: $('#curate_anno_tm')
    ,msg_tm: $('#curate_msg_tm')
    ,suggest: $('#curate_suggest')

    ,cancelbtn: $('#curate_cancelbtn')
    ,publishbtn: $('#curate_publishbtn')

    
  }


  self.render = function() {
    app.resize(40)
    self.el.topbar.animate({height:40})
    app.el.leftcol.animate({width:1},function(){
      app.el.leftcol.hide()
    })
    app.el.rightcol.animate({width:0})

    app.el.midcol.css({'overflow-y':'scroll'}).animate({width:490},function(){
      self.el.result.fadeIn()
    })

    $('div.topicsend').fadeOut()

    var items = self.el.list.find('li')
    if( 0 == items.length ) {
      self.addtopics()
    }

    $('a.topic_copyall').removeClass('hide')

    $('li.message').bind('click.curate',function(event){
      var msgitem = self.makeitem( $(event.target).parents('li') )
      self.insert(msgitem)
    })

    $('a.topic_copyall').bind('click.curate',function(){
      var topic = $(event.target).parents('div.topichead').attr('id').substring(11)
      debug('topic',topic)

      var posts = $('#topic_posts_'+topic).find('li.message')
      for( var i = 0; i < posts.length; i++) {
        var item = self.makeitem(posts[i])
        self.insert(item)
      }
    })


    function createanno(){
      var anno = self.el.anno_tm.clone()
      var order = parseInt(self.el.suggest.attr('data-order'),10)
      self.el.suggest.attr('data-order','0')

      anno.attr('data-order',order)

      anno.find('a').click(function(){
        self.remove(order)
        self.el.suggest.unbind('click',createanno)
        self.el.suggest.bind('click',createanno)
      })
      self.el.suggest.after(anno)

      self.el.suggest.hide()
    }


    self.el.suggest.click(createanno)

    self.el.suggest.mouseleave(function(){
      self.el.suggest.hide()
    })
  }


  self.unrender = function() {
    
    self.el.topbar.animate({height:0})

    app.el.midcol.css({'overflow-y':'hidden'}).animate({width:450},function(){
      self.el.result.fadeOut()
    })
    
    app.el.leftcol.show().animate({width:265})
    app.el.rightcol.animate({width:265})
    
    $('a.topic_copyall').addClass('hide')

    $('div.topicsend').fadeIn()

    $('li.message').unbind('click.curate').css({'background-color':'white'})

    app.resize()
  }
  

  self.addtopics = function() {
    var topics = app.chat.topics
    for( var tI = 0; tI < topics.length; tI++ ) {
      var topic = topics[tI]
      var topicitem = self.el.topic_tm.clone()
      topicitem.find('h3').text( topic.title )
      topicitem.find('p').text( topic.desc )
      topicitem.attr( 'data-order', (1+tI)*TOPIC_START )
      self.insert(topicitem)
    }
  }


  self.makeitem = function(msgelem){
    msgelem = $(msgelem)
    msgelem.css({'background-color':'#ccc'})

    var msgid = msgelem.attr('id').substring(4)
    var msg = app.msgcache[msgid]
    
    var msgitem = self.el.msg_tm.clone()
    var order = ((1+parseInt(msg.p,10))*TOPIC_START)+parseInt(msg.v,10)
    msgitem.find('h4').text( msg.f )
    msgitem.find('p').text( msg.t )
    msgitem.attr( 'data-order', order )
    msgitem.attr( 'data-original', msgid )
    msgitem.click(function(){self.remove(order)})

    return msgitem
  }

  

  self.insert = function(item) {
    var item_order = parseInt(item.attr('data-order'),10)
    var items = self.el.list.find('li')

    if( 0 == items.length ) {
      self.el.list.append(item)
    }
    else {
      var inserted = false
      for( var i = 0; i < items.length; i++ ) {
        var listitem = $(items[i])
        var order = parseInt(listitem.attr('data-order'),10)
      
        if( item_order == order ) {
          inserted = true
          break
        }
        else if( item_order < order) {
          listitem.before(item)
          inserted = true
          break
        }
      }

      if( !inserted ) {
        listitem.after(item)
      }
    }

    if( !item.hasClass('curate_suggest') ) {
      item.mouseenter(function(event){
        var nextitem = item.next()
        if( !nextitem.hasClass('curate_anno') ) {
          self.el.suggest.show()
          item.after(self.el.suggest)
          var order = item.attr('data-order')
          self.el.suggest.attr('data-order',parseInt(order,10)+1)
        }
      })
    }
  }


  self.remove = function(order) {
    var items = self.el.list.find('li')
    for( var i = 0; i < items.length; i++ ) {
      var item = $(items[i])
      var item_order = parseInt(item.attr('data-order'),10)

      if( order == item_order ) {
        var msgid = item.attr('data-original')
        $('#msg_'+msgid).css({'background-color':'white'})
        item.remove()
      }
    }
  }



  self.el.cancelbtn.click(function(){
    self.unrender()
  })


  self.el.publishbtn.click(function(){
    var entries = []

    var items = self.el.list.find('li')
    for( var i = 0; i < items.length; i++ ) {
      var item = $(items[i])

      if( 'curate_suggest' == item.attr('id') ) continue 

      var item_order = parseInt(item.attr('data-order'),10)
      var isTopic = item.hasClass('curate_topic')
      var isMsg   = item.hasClass('curate_msg')
      var isAnno  = item.hasClass('curate_anno')

      var type = isTopic ? 't' : isMsg ? 'm' : isAnno ? 'a' : null

      var msgid = item.attr('data-original')

      var body = isTopic ? {h:item.find('h3').text(),d:item.find('p').text()} :
                 isMsg ? {
                   f:item.find('h4').text(),
                   t:item.find('p.post').text(),
                   i:item.attr('data-original'),
                   a:(app.msgcache[msgid].a||0)
                 } :
                 isAnno ? {b:item.find('textarea').val()} : null

      if( isMsg ) {
        body.a = app.msgcache[body.i].a
      }

      if( type ) {
        var entry = {
          t:type,
          o:item_order,
          b:body
        }

        entries.push(entry)
      }
    }
    
    if( 0 < entries.length ) {
      http.post('/api/chat/'+app.chat.chatid+'/publish',{entries:entries},function(){
        window.location.href = '/api/bounce/'+app.chat.chatid   
      })
    }
  })
}

window.restartchat = function() {
  now.name = nick
  setTimeout(app.joinchat,1000)
}
