

$(document).ready(function(){
      
  function enterkey(cb) {
    return function(event) {
      if( 13 == event.keyCode ) {
        cb()
      }
    }
  }

  function login(){
    var name = $('#username').val()

    if( 0 < name.length ) {
      $('#logindiv').fadeOut(function(){
        $('div.topicwelcome h2 span').text(name)
        $('div.topicwelcome').fadeIn()
        $('div.topicsend').fadeIn(function(){
          $("#post_text").focus()
        })
      })

      now.name = name

      now.receiveMessage = function(name, message){
        var post = $('#posts_tm li').clone()
        post.find('h4').text(name)
        post.find('p').text(message)
        post.css({opacity:0})
        $('#posts').prepend(post)
        post.animate({opacity:1},500)
      }
  
      function post(){
        now.distributeMessage($("#post_text").val());
        $("#post_text").val("");
        $("#post_text").focus();
      }

      $("#post_send").click(post)
      $("#post_text").keypress(enterkey(post))
    }
  }

  $('#loginbtn').click(login)
  $('#username').focus().keypress(enterkey(login))
      
});

