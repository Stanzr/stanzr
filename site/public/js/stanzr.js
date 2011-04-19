


var app = {
  topic: 0,

  changetopic: function(topic) {
    app.topic = topic

    $('div.topichead').hide()
    app.topichead = $('#topic_head_'+app.topic).show()

    $('ul.topicposts').hide()
    app.topicposts = $('#topic_posts_'+app.topic).show()

    app.postbottom()
  },

  postbottom: function() {
    var h  = $('div.postsarea').height()
    var sh = $('div.postsarea')[0].scrollHeight
    console.log(sh,h)
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
    $('div.postsarea').height(colh-180)
  }

}

$(function(){
  app.changetopic(0)
  
  app.resize()
  window.onresize = app.resize


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
        display(msg)
      }
      else if( 'join' == msg.type ) {
        var post = $('#posts_tm li.infomsg').clone()
        post.find('p').text(msg.nick + ' has joined')

        var topicposts = $('#topic_posts_'+app.topic)
        topicposts.append(post)
        post.animate({opacity:1},500)
        app.postbottom()
        addAvatar(msg.from)
      }
    }
  
    function post(){
      var msg = {chat:chatid,text:$("#post_text").val(),type:'message',topic:app.topic}
      now.distributeMessage(JSON.stringify(msg));
      $("#post_text").val("");
      $("#post_text").focus();
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
        topics.push({name:topicstr,desc:'Description of '+topicstr})
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

  function addAvatar(nick) {
    if( !avatars[nick] ) {
      avatars[nick] = true

      var avatar = $('#miniavatar_tm').clone().attr('id','side_avatar_'+nick).show()
      $('#rally_miniavatars').append(avatar)

      var pcount = $('#rally_pcount').text()
      pcount = '' == pcount ? 0 : parseInt(pcount,10)
      pcount++
      $('#rally_pcount').text(''+pcount)
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


  $('#login_box').css({left:($(window).width()-200)/2})
  $('#signup_box').css({left:($(window).width()-200)/2})
  $('#hostchat_box').css({left:($(window).width()-200)/2})


  if( nick ) {
    inituser()
  }
  else {
    $('#welcome').show()
  }


  function display(msg) {
    var post = $('#posts_tm li.message').clone()
    post.attr('id','topic_'+msg.topic+'_post_'+msg.id)
    post.find('h4').text(msg.from)
    post.find('p').text(msg.text)
    post.css({opacity:0})
    
    var topicposts = $('#topic_posts_'+msg.topic)
    topicposts.append(post)

    if( msg.topic == app.topic ) {
      post.animate({opacity:1},500)
      app.postbottom()
    }
    else {
      post.css({opacity:1})
    }
  }

  console.log(chatid)
  if( chatid ) {
    console.log('sending '+chatid)
  $.ajax({
    url:'/api/chat/'+chatid,
    type:'GET',
    dataType:'json',
    success:function(res){
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
        var topichead = topichead_tm.clone()
        topichead.attr('id','topic_head_'+i)
        topichead.find('h4').text(topic.name)
        topichead.find('p').text(topic.desc)

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
      $('#topic_head_'+app.topic).show()
      $('#topic_posts_'+app.topic).show()
      

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
            display( {from:msg.f,text:msg.t,topic:msg.p})
          }
          app.sendbox()
        }
      })
    }
  })
  }
  else if( nick ) {
    $('#hostyourown').show()
  }

});

