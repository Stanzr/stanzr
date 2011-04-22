

var app = {
  topic: 0,
  active_topic: 0,
  chat: {},
  msgcache: {},
  agrees: [],
  nickmap: {},
  agrees_start: 0,

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
    var h  = $('div.postsarea').height()
    var sh = $('div.postsarea')[0].scrollHeight
    $('div.postsarea').scrollTop( sh - h  )
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
  }
  
}




$(function(){
  $.cookie('socketio',null)

  app.changetopic(0)
  
  app.resize()
  window.onresize = app.resize

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

        addAvatar(from)
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


  function hostchatbox() {
    $('#hostchat_box').show()
  }
  $('#hostchat_createbtn').click(function(){
    
    var topics = []
    var topicentry
    var tI = 0
    while( 0 < (topicentry = $('#hostchat_topic'+tI)).length ) {
      var topicstr = topicentry.val()
      if( 0 < topicstr.length ) {
        topics.push({title:topicstr,desc:'Description of '+topicstr})
      }
      tI++
    }

    $.ajax({
      url:'/api/chat',
      type:'PUT',
      dataType:'json',
      contentType:'application/json',
      data:JSON.stringify({

        moderator:nick,
        title:$('#hostchat_title').val(),
        modname:$('#hostchat_modname').val(),
        whenstr:$('#hostchat_whenstr').val(),
        hashtag:$('#hostchat_hashtag').val(),
        desc:$('#hostchat_desc').val(),
        topics:topics

      }),
      success:function(res){
        if( res.chatid ) {
          window.location.href = '/api/bounce/'+res.chatid
        }
        else {
          $('#hostchat_msg').text('create chat failed')
        }
      }
    })
  })



  function signupbox() {
    $('#signup_box').show()
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
          $('#signup_box').fadeOut(function(){
            $('#login_box').fadeIn()
          })
        }
        else {
          $('#register_msg').text('register failed')
        }
      }
    })
  })


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
          window.location.href = '/api/bounce/'+chatid
        }
        else {
          $('#login_msg').text('login failed')
        }
      }
    })
  })


  var avatars = {}

  function addAvatar(avnick) {
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



  $('#head_hostchat').click(hostchatbox)
  $('#head_signup').click(signupbox)
  $('#head_login').click(loginbox)


  $('#head_logout').click(function(){
    $.ajax({
      url:'/api/auth/logout',
      type:'POST',
      contentType:'application/json',
      dataType:'json',
      data:'{}',
      success:function(res){
        window.location.href = '/api/bounce/'+chatid
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
            addAvatar(other)
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

