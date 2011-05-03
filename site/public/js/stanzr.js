

function enterkey(cb) {
  return function(event) {
    if( 13 == event.keyCode ) {
      cb()
    }
  }
}


function print() {
  if( 'undefined' != typeof(console) ) {
    console.log.apply(console,arguments)
  }
}


function RE(win) {
  return function(err){
    if( err ) {
      print('error',err)
    }
    else {
      win && win.apply( this, [].slice.call(arguments,1) )
    }
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
  }
  
}


var app = {
  topic: 0,
  active_topic: 0,
  chat: {},
  msgcache: {},
  nickmap: {},


  text: {
    dummy: null
    ,loginfail: 'Your Login details are incorrect. Please try again.'
    ,registerfail: 'That username is taken. Please try again.'
  },


  changetopic: function(topic) {
    app.topic = topic

    $('div.topichead').hide()
    app.topichead = $('#topic_head_'+app.topic).show()

    if( app.active_topic != topic && topic < app.active_topic ) {
      app.topichead.find('div.rally_gotoactive').show().click(app.gotoactive)
    }
    else {
      app.topichead.find('div.rally_gotoactive').hide()
    }

    if( nick == app.chat.modnick ) {
      if( app.active_topic + 1 == topic ) {
        app.topichead.find('div.rally_makeactive').show().click(app.makeactive)
      }
      else {
        app.topichead.find('div.rally_makeactive').hide()
      }
    }


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


  sendbox: function() {
    // show or hide on topix
    $('#post_text').removeAttr("disabled").removeClass('logged-out').focus();
    $('#post_send').removeAttr("disabled").removeClass('logged-out');
    $('.topicsend .join-in').removeClass('logged-out').hide();
    $('.topicsend .tweetout').removeClass('logged-out').fadeIn();
  },


  resize: function() {
    var winh    = $(window).height()
    var headerh = $('div.header').height()
    var colh    = Math.max( 400, winh - headerh );
    $('div.col').height(colh)
    var thh = app.topichead.height() || 50
    var sbh = $('div.topicsend').height() || 100
    $('div.postsarea').height( colh-(sbh+thh+50) )
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
          if( app.ismod ) {
            el.css({'background-color':'#f88','opacity':0.5})
          }
          else {
            el.hide()
          }
        }
        else if( 'show' == state ) {
          if( app.ismod ) {
            el.css({'background-color':'white','opacity':1})
          }
          else {
            el.show()
          }
        }
      }

      cb && cb()
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
  }
  
}


function killpopups(next) {
  return function(){$('.modalbox').hide();next()}
}



$(function(){
  $.cookie('socketio',null)

  app.changetopic(0)
  
  app.resize()
  window.onresize = app.resize


  app.el = {
    dummy: null
    ,head_hostchat: $('#head_hostchat')
    ,head_signup: $('#head_signup')
    ,topic_signup: $('#topic_signup')
    ,head_login: $('#head_login')
    ,head_nick: $('#head_nick')
  }


  app.popup.box.hostchat  = new HostChatBox()
  app.popup.box.profile   = new ProfileBox()
  app.popup.box.settings  = new SettingsBox()

  app.leftbar.box.detail  = new ChatDetailsBox()

  app.rightbar.box.avatar = new AvatarBox()
  app.rightbar.box.agree  = new AgreeBox()
  app.rightbar.box.reply  = new ReplyBox()
  app.rightbar.box.dm     = new DirectMessageBox()

  app.el.head_hostchat.click(killpopups(app.popup.box.hostchat.hostchat))
  app.el.head_signup.click(killpopups(signupbox))
  app.el.topic_signup.click(killpopups(signupbox))
  app.el.head_login.click(killpopups(loginbox))

  app.el.head_nick.click(killpopups(function(){
    app.popup.box.settings.render()
  }))




  $('h4').live('click',function(event){
    var n = $(event.target).text()
    if( app.nickmap[n] ) {
      app.popup.box.profile.render(n)
    }
  })




  function inituser(){    
    now.name = nick
    
    now.receiveMessage = function(from, jsonstr){
      print('msgin',from,jsonstr)
      var msg = JSON.parse(jsonstr)

      if( 'message' == msg.type ) {
        if( !app.msgcache[msg.i] ) {
          app.msgcache[msg.i] = msg
          displaymsg(msg)
          app.rightbar.box.reply.set(msg)
        }
      }
      else if( 'join' == msg.type ) {
        if( msg.nick ) {
          if( nick == msg.nick && chatid ) {
            app.sendbox()
          }
          else if( !app.nickmap[nick] ) {
            infomsg( msg.nick + ' has joined' )
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
          app.updatemsg(msg.msgid,msg.visible,print)
        }
      }
    }

    
    function post(){
      var tweet = $('#send_tweet').attr('checked')
      var text = $("#post_text").val();
      
      // Make sure we have text before sending, minimum text length
      // should be set here, and include logic for commands with no text,
      // such as '@someone' and '#hashtag' with nothing after
      if (!text) return false;
      
      var msg = {c:chatid,t:text,type:'message',p:app.topic,w:tweet,h:app.chat.hashtag}
      $("#post_text").val("");
      $("#post_text").focus();

      now.distributeMessage(JSON.stringify(msg),function(msg){
        app.msgcache[msg.i] = msg
        displaymsg(msg)
        //app.msgcache[msg.i] = msg
      })
    }
    
    $("#post_send").click(post)
    $("#post_text").keypress(enterkey(post))

    function joinchat() {
      if( now.joinchat ) {
        var msg = JSON.stringify({chat:chatid})
        now.joinchat(msg)
      }
      else {
        setTimeout(joinchat,200)
      }
    }
    joinchat()

  }




  function signupbox(next) {
    $('#signup_box').show()
    app.signupbox_next = next
  }
  $('#register_registerbtn').click(function(){
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
  })
  app.signupbox = signupbox


  function loginbox() {
    $('#login_box').show()
  }
  $('#login_loginbtn').click(function(){
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
  })







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


  if( nick ) {
    inituser()
  }
  else {
    //$('#welcome').show()
  }


  function infomsg(text) {
    var post = $('#posts_tm li.infomsg').clone()
    post.find('p').text(text)
    var topicposts = $('#topic_posts_'+app.topic)
    topicposts.append(post)
    post.animate({opacity:1},500)
    app.postbottom()
  }

  function displaymsg(msg) {
    print(msg)

    app.nickmap[msg.f] = true

    msg.p = 'undefined'==typeof(msg.p) ? app.topic : msg.p

    var post = $('#posts_tm li.message').clone()
    //post.attr('id','topic_'+msg.p+'_post_'+msg.i)
    post.attr('id','msg_'+msg.i)
    post.find('h4').text(msg.f)
    post.find('p').text(msg.t)


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

    
    if( app.ismod ) {
      var hidemsg = post.find('a.sprite-hide')
      var showmsg = post.find('a.sprite-show')

      hidemsg.hide$ = showmsg.hide$ = function(){ this.css('display','none') }
      hidemsg.show$ = showmsg.show$ = function(){ this.css('display','inline-block') }

      if(msg.h) {
        hidemsg.hide$()
        showmsg.show$()
      }
      else {
        hidemsg.show$()
        showmsg.hide$()
      }

      hidemsg.click(function(){
        app.updatemsg(msg.i,'hide',function(){
          hidemsg.hide$()
          showmsg.show$()
          app.hidemsg(msg.i,true,print)
        })
      })

      showmsg.click(function(){
        app.updatemsg(msg.i,'show',function(){
          hidemsg.show$()
          showmsg.hide$()
          app.hidemsg(msg.i,false,print)
        })
      })
    }
    
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
  }

  



  if( chatid ) {
    $.ajax({
      url:'/api/chat/'+chatid,
      type:'GET',
      dataType:'json',
      success:function(res){
        app.chat = res
        app.ismod = app.chat.modnicks && app.chat.modnicks[nick]

        var nicks = res.nicks || []
        for( var i = 0; i < nicks.length; i++ ) {
          var other = nicks[i]
          app.rightbar.box.avatar.add(other)
        }


        var topicheads = $('#topicheads')
        var postsarea = $('div.postsarea')

        var topichead_tm = $('#topichead_tm')
        var topicposts_tm = $('#topicposts_tm')

        app.topic  = res.topic || 0
        var topics = res.topics || ['General']

        for( var i = 0; i < topics.length; i++ ) {
          var topic = topics[i]

          if( topic.active ) {
            app.active_topic = i
          }

          var topichead = topichead_tm.clone()
          topichead.attr('id','topic_head_'+i)
          topichead.find('h4').text(topic.title)
          topichead.find('p.rally_topicdesc').text(topic.desc)

          var backward_fill = topichead.find('div a.sprite-page-backward-fill')
          var backward      = topichead.find('div a.sprite-page-backward')
          var forward       = topichead.find('div a.sprite-page-forward')

          if( 0 == i ) {
            backward.hide()
            backward_fill.show()
          }
          else {
            backward_fill.hide()
          }

          if( topics.length-1 == i ) {
            forward.hide()
          }

          function movetopic(dir){
            return function() {
              app.changetopic(app.topic + dir)            
            }
          }


          backward.click(movetopic(-1))
          forward.click(movetopic(1))

          topicheads.append(topichead)
          topichead.css({display:'none'})


          var topicposts = topicposts_tm.clone()
          topicposts.attr('id','topic_posts_'+i)

          postsarea.append(topicposts)
          topicposts.css({display:'none'})
        }
        app.changetopic(app.active_topic)            



        app.leftbar.box.detail.init(res)
        

        $.ajax({
          url:'/api/chat/'+chatid+'/msgs',
          type:'GET',
          dataType:'json',
          success:function(res){
            for( var i = 0; i < res.length; i++ ) {
              var msg = res[i]
              app.msgcache[msg.i] = msg
              displaymsg(msg)
            }

            app.rightbar.box.agree.load()
            app.rightbar.box.reply.set(res)
            app.rightbar.box.dm.load()
          }
        })
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
      var show = (obj.__showif[en])()
      if( show ) {
        elem.show()
      }
      else {
        elem.hide()
      }
    }
  }
}


function ChatDetailsBox() {
  var self = this

  self.el = {
    dummy: null
    ,img: $('#chat_logo img')  
  }

  self.init = function(chat) {

    $('#rally_title').text(chat.title)
    $('#rally_modname').text(chat.modname)
    $('#rally_whenstr').text(chat.whenstr)
    
    $('#rally_desc').html( markdown.toHTML(chat.desc) )
    
    if( app.chat.modnicks && app.chat.modnicks[nick] ) {
      $('#rally_editbtn').show().click(app.popup.box.hostchat.editchat)
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

    agrees.sort(function(a,b){
      var ma = app.msgcache[a]
      var mb = app.msgcache[b]
      return ma && mb ? mb.a - ma.a : 0;
    })

    self.el.msgs.empty()

    for( var i = 0; i < agrees.length; i++ ) {
      function displaymostagreed(msg){
        if( 1 <= msg.a ) {
          var msgdiv = self.el.msg_tm.clone().attr('id','agree_'+msg.i)
          msgdiv.find('h4').text(msg.f)
          msgdiv.find('.count').text('x'+msg.a)
          msgdiv.find('.post').text(msg.t)

          self.el.msgs.append(msgdiv)
          if( !msg.h ) {
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

  self.add = function(avnick,banned) {
    if( avnick ) {
      if( !avatars[avnick] ) {

        var avatar = $('#miniavatar_tm').clone()
        avatar.attr('id','miniavatar_'+avnick)
        
        app.popup.box.profile.render(avnick);
        
        avatar
          .attr('title', $('#profile_box').html())
          .hover(function(){
            // This is slightly cheating... 
            app.popup.box.profile.render(avnick);
            avatar.attr('title', $('#profile_box').html());
          })
          .qtip({
            hide: {
              target: false,
              event: 'mouseleave',
              effect: true,
              delay: 500,
              fixed: true,
              inactive: false,
              leave: 'window',
              distance: false
            }
          });
        
        
        $('#rally_miniavatars').append(avatar)
        avatar.show()
        avatars[avnick] = avatar

        $.ajax({
          url:'/api/user/'+avnick,
          type:'GET',
          dataType:'json',
          success:function(res){
            if( res.avimg ) {
              avatar.css({
                'background-image':'url('+res.avimg+')',
                'background-position':'0% 0%',
                'background-size':'32px 32px'
              })
            }
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

  }
  self.el.nick = self.el.box.find('h2')

  var cnick


  showif(self,{
    messagebtn: function(){
      return nick != cnick
    },
    banbtn: function(){
      return app.ismod && nick != cnick && !app.chat.bans[cnick]
    },
    unbanbtn: function(){
      return app.ismod && nick != cnick && app.chat.bans[cnick]
    },
    you: function(){
      return nick == cnick
    }
  })


  self.render = function(pnick) {
    cnick = pnick
    
    //self.el.box.show()
    self.el.nick.text(cnick)

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


  self.el.messagebtn.click(function(){
    self.el.box.hide()
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

}


function SettingsBox() {
  var self = this

  self.el = {
    dummy: null

    ,box: $('#settings_box')

    ,history: $('#settings_history')
    ,history_item_tm: $('#settings_history_item_tm')

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
        histitem.find('.settings_chat_title').text(chatitem.t)
        histitem.find('.settings_chat_modname').text(chatitem.m)
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

