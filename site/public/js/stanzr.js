

var app = {
  topic: 0,
  active_topic: 0,
  chat: {},
  msgcache: {},
  agrees: [],
  nickmap: {},
  agrees_start: 0,


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
    $('div.topicsend').fadeIn(function(){
      $("#post_text").focus()
    })
  },


  resize: function() {
    var winh    = $(window).height()
    var headerh = $('div.header').height()
    var colh    = Math.max( 400, winh - headerh - 30 );
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
        cb(res)
      }
    })
  },


  agree: function(msgid,cb) {
    $.ajax({
      url:'/api/chat/'+app.chat.chatid+'/msg/'+msgid+'/agree',
      type:'POST',
      contentType:'application/json',
      data:'{}',
      dataType:'json',
      success:function(res){
        cb(res)
      }
    })
  },


  topagrees: function(cb) {
    $.ajax({
      url:'/api/chat/'+app.chat.chatid+'/msgs/agrees',
      dataType:'json',
      success:function(res){
        var msgids = []
        for(var i = 0; i < res.length; i++) {
          var msg = res[i]
          msg && ( app.msgcache[msg.i] = msg, msgids.push(msg.i) )
        }
        app.agrees = msgids
        cb(res)
      }
    })
  },


  loadagrees: function() {
    $.ajax({
      url:'/api/chat/'+chatid+'/msgs/agrees',
      type:'GET',
      dataType:'json',
      success:function(res){
        app.agrees = res
        app.displayagrees()
      }})
  },


  displayagrees: function(start){
    app.agrees_start = start || app.agrees_start

/*
    var mostagreed_drilldown = $('#mostagreed_drilldown')
    if( 3 < app.agrees.length && app.agrees_start < app.agrees.length ) {
      mostagreed_drilldown.show()
    }
    else {
      mostagreed_drilldown.hide()
    }

    var mostagreed_drillup = $('#mostagreed_drillup')
    if( 3 <= app.agrees_start ) {
      mostagreed_drillup.css({opacity:1})
    }
    else {
      mostagreed_drillup.css({opacity:0.001})
    }
*/

    var rally_mostagreed = $('#rally_mostagreed')
    var mostagreed_msg_tm = $('#mostagreed_msg_tm')

    rally_mostagreed.empty()

    for( var i = app.agrees_start; i < app.agrees_start+3; i++ ) {
      function displaymostagreed(msg){
        var msgdiv = mostagreed_msg_tm.clone().attr('id','')
        msgdiv.find('h4').text(msg.f)
        msgdiv.find('.agrees').text(msg.a)
        msgdiv.find('.post').text(msg.t)
        rally_mostagreed.append(msgdiv.fadeIn())
      }

      var msgid = app.agrees[i]
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
  },

  rightbar: {
    box: {},

    show: function(others) {
      console.log(others)

      for( var i = 0; i < others.length; i++ ) {
        var box = app.rightbar.box[others[i]]
        box && box.show()
      }
    },
    
    hide: function(others) {
      console.log(others)

      for( var i = 0; i < others.length; i++ ) {
        var box = app.rightbar.box[others[i]]
        box && box.hide()
      }
    }
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
    ,head_login: $('#head_login')
  }


  app.hostchatbox = new HostChatBox()

  app.rightbar.box.avatar = new AvatarBox()
  app.rightbar.box.agree  = new AgreeBox()
  app.rightbar.box.reply  = new ReplyBox()

  app.el.head_hostchat.click(killpopups(app.hostchatbox.hostchat))
  app.el.head_signup.click(killpopups(signupbox))
  app.el.head_login.click(killpopups(loginbox))



  $('h4').live('click',function(event){
    var n = $(event.target).text()
    if( app.nickmap[n] ) {
      $('#profile_box').show().find('h2').text(n)
    }
  })

  $('#mostagreed_drillup').click(function(){
    if( 3 <= app.agrees_start ) {
      app.displayagrees(app.agrees_start-3)
    }
  })

  $('#mostagreed_drilldown').click(function(){
    app.displayagrees(app.agrees_start+3)
  })




  function enterkey(cb) {
    return function(event) {
      if( 13 == event.keyCode ) {
        cb()
      }
    }
  }

  function inituser(){    
    now.name = nick

    
    now.receiveMessage = function(from, jsonstr){
      var msg = JSON.parse(jsonstr)

      if( 'message' == msg.type ) {
        if( !app.msgcache[msg.i] ) {
          app.msgcache[msg.i] = msg
          display(msg)
        }
      }
      else if( 'join' == msg.type ) {
        if( nick == msg.nick && chatid ) {
          app.sendbox()
        }
        infomsg( msg.nick + ' has joined' )

        app.rightbar.box.avatar.add(from)
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
          msg.a = (msg.a || 0) + 1
          msg.an = msg.an || []
          msg.an.push(from)
          msg.an = _.uniq(msg.an)
        }

        if( app.msgcache[msgid] ) {
          incmsg(app.msgcache[msgid])
        }
        else {
          app.loadmsg(msgid,function(){
            incmsg(app.msgcache[msgid])
          })
        }

        app.loadagrees()
      }
      
    }

    
    function post(){
      var msg = {c:chatid,t:$("#post_text").val(),type:'message',p:app.topic}
      $("#post_text").val("");
      $("#post_text").focus();

      now.distributeMessage(JSON.stringify(msg),function(msg){
        app.msgcache[msg.i] = msg
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
    $('#welcome').show()
  }


  function infomsg(text) {
    var post = $('#posts_tm li.infomsg').clone()
    post.find('p').text(text)
    var topicposts = $('#topic_posts_'+app.topic)
    topicposts.append(post)
    post.animate({opacity:1},500)
    app.postbottom()
  }

  function display(msg) {
    app.nickmap[msg.f] = true

    var post = $('#posts_tm li.message').clone()
    post.attr('id','topic_'+msg.p+'_post_'+msg.i)
    post.find('h4').text(msg.f)
    post.find('p').text(msg.t)

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

        app.agree(msg.i,function(res){
          msg.a = msg.a || 1
          msg.an = _.include( (msg.an = msg.an || []), nick )

          post.find('.agrees').text('x'+msg.a)

          app.agrees = res
          app.displayagrees()
        })
      })
    }


    post.css({opacity:0})
    
    var topicposts = $('#topic_posts_'+msg.p)
    topicposts.append(post)

    if( msg.p == app.topic ) {
      post.animate({opacity:1},500)
      app.postbottom()
    }
    else {
      post.css({opacity:1})
    }
  }

  



  if( chatid ) {
    $.ajax({
      url:'/api/chat/'+chatid,
      type:'GET',
      dataType:'json',
      success:function(res){
        app.chat = res
        var nicks = res.nicks || []
        for( var i = 0; i < nicks.length; i++ ) {
          var other = nicks[i]
          if( other != nick ) {
            app.rightbar.box.avatar.add(other)
          }
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


        $('#rally_title').text(res.title)
        $('#rally_modname').text(res.modname)
        $('#rally_whenstr').text(res.whenstr)
        $('#rally_desc').text(res.desc)

        if( app.chat.modnicks && app.chat.modnicks[nick] ) {
          $('#rally_editbtn').show().click(app.hostchatbox.editchat)
        }

        $.ajax({
          url:'/api/chat/'+chatid+'/msgs',
          type:'GET',
          dataType:'json',
          success:function(res){
            for( var i = 0; i < res.length; i++ ) {
              var msg = res[i]
              app.msgcache[msg.i] = msg
              display(msg)
            }

            app.loadagrees()
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



function RightbarBox() {
  this.hide = function() {
    this.el.box.slideUp();
  }

  this.show = function() {
    this.el.box.slideDown();
  }

  this.init = function(others) {
    var self = this
    self.el.drillup.click(function(){
      self.el.box.animate({height:140})
      setTimeout(function(){
        app.rightbar.show(others)
      },200)
      self.el.drilldown.show()
      self.el.drillup.hide()
    })

    self.el.drilldown.click(function(){
      app.rightbar.hide(others)
      setTimeout(function(){
        self.el.box.animate({height:$('div.rightcol').height()-21})
      },200)
      self.el.drilldown.hide()
      self.el.drillup.css({display:'inline-block'})
    })
  }
}


function AgreeBox() {
  var self = this

  self.el = {
    dummy: null
    ,drilldown: $('#agree_drilldown')
    ,drillup: $('#agree_drillup')
    ,box: $('#agree_box')
  }

  self.init(['reply','avatar'])
}
AgreeBox.prototype = new RightbarBox()


function ReplyBox() {
  var self = this

  self.el = {
    dummy: null
    ,drilldown: $('#reply_drilldown')
    ,drillup: $('#reply_drillup')
    ,box: $('#reply_box')
  }

  self.init(['agree','avatar'])
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

  self.init(['agree','reply'])

  var avatars = {}

  self.add = function(avnick) {
    app.nickmap[avnick] = true

    if( !avatars[avnick] ) {
      avatars[avnick] = true

      var avatar = $('#miniavatar_tm').clone().attr('id','side_avatar_'+avnick).show()
      avatar.click(function(){
        $('#profile_box').show().find('h2').text(avnick)
      })
      $('#rally_miniavatars').append(avatar)

      var pcount = $('#rally_pcount').text()
      pcount = '' == pcount ? 0 : parseInt(pcount,10)
      pcount++
      $('#rally_pcount').text(''+pcount)

      var rally_pcount_drilldown = $('#rally_pcount_drilldown')
      if( 20 < pcount ) {
        rally_pcount_drilldown.show()
      }
      else {
        rally_pcount_drilldown.hide()
      }
    }
  }



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
