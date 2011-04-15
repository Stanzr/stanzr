

$(document).ready(function(){
      
  function enterkey(cb) {
    return function(event) {
      if( 13 == event.keyCode ) {
        cb()
      }
    }
  }

  function inituser(){
    $('div.topicsend').fadeIn(function(){
      $("#post_text").focus()
    })
    
    now.name = nick
    
    now.receiveMessage = function(nick, jsonstr){
      var msg = JSON.parse(jsonstr)
      console.log(msg)

      if( 'message' == msg.type ) {
        var post = $('#posts_tm li.message').clone()
        post.find('h4').text(nick)
        post.find('p').text(msg.text)
        post.css({opacity:0})

        $('#posts').prepend(post)
        post.animate({opacity:1},500)

      }
      else if( 'join' == msg.type ) {
        var post = $('#posts_tm li.infomsg').clone()
        post.find('p').text(msg.nick + ' has joined')

        $('#posts').prepend(post)
        post.animate({opacity:1},500)

        addAvatar(nick)
      }
    }
  
    function post(){
      var msg = {chat:chathash,text:$("#post_text").val(),type:'message'}
      now.distributeMessage(JSON.stringify(msg));
      $("#post_text").val("");
      $("#post_text").focus();
    }
    
    $("#post_send").click(post)
    $("#post_text").keypress(enterkey(post))

    function joinchat() {
      if( now.joinchat ) {
        var msg = JSON.stringify({chat:chathash})
        now.joinchat(msg)
      }
      else {
        setTimeout(joinchat,200)
      }
    }
    joinchat()

  }


  function signupbox() {
    $('#signup_box').show()
  }
  $('#register_registerbtn').click(function(){
    $.ajax({
      url:'/api/auth/register',
      type:'POST',
      dataType:'json',
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
      data:JSON.stringify({nick:$('#login_username').val(),password:$('#login_password').val()}),
      success:function(res){
        if( res.ok ) {
          window.location.href = '/api/bounce/'+chathash
        }
        else {
          $('#login_msg').text('login failed')
        }
      }
    })
  })


  function addAvatar(nick) {
    var avatar = $('#miniavatar_tm').clone().attr('id','side_avatar_'+nick).show()
    $('#rally_miniavatars').append(avatar)

    var pcount = $('#rally_pcount').text()
    pcount = '' == pcount ? 0 : parseInt(pcount,10)
    pcount++
    $('#rally_pcount').text(''+pcount)
    
  }




  $('#head_signup').click(signupbox)
  $('#head_login').click(loginbox)

  $('#head_logout').click(function(){
    $.ajax({
      url:'/api/auth/logout',
      type:'POST',
      dataType:'json',
      data:'{}',
      success:function(res){
        console.log(res)
        window.location.href = '/api/bounce/'+chathash
      }
    })
  })


  $('#login_box').css({left:($(window).width()-200)/2})
  $('#signup_box').css({left:($(window).width()-200)/2})


  if( nick ) {
    inituser()
  }
});

