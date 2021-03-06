try {

function enterkey(cb) {
  return function(event) {
    if( 13 == event.keyCode ) {
      cb()
    }
  }
}


function jsonify(args) {
  try {
    return JSON.stringify(args)
  }
  catch(e) {
    var sb = ['[']
    for(var i = 0; i < args.length; i++ ) {

      try {
        sb.push( JSON.stringify(args[i]))
      }
      catch( e ) {
        sb.push('"'+args[i]+'"')
      }
      sb.push(',')
    }
    sb.push(']')

    return sb.join(' ')
  }
}


function debug() {
  if( app && app.debug && 'undefined' != typeof(console) ) {
    if( console.log.apply ) {
      console.log.apply(console,arguments)
    }
    else {
      console.log(jsonify(Array.prototype.slice.call(arguments)))
    }
  }

  /*
  if( app && ( page.user.admin || app.ismod ) ) {
    logerror('debug',jsonify(Array.prototype.slice.call(arguments)))
  }
  */
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


function setCaretPosition(ctrl, pos){
  try {
  if(ctrl.setSelectionRange) {
    ctrl.focus();
    ctrl.setSelectionRange(pos,pos);
  }
  else if (ctrl.createTextRange) {
    var range = ctrl.createTextRange();
    range.collapse(true);
    range.moveEnd('character', pos);
    range.moveStart('character', pos);
    range.select();
  }
  }
  catch ( e) {
    logerror('error',e)
  }
}


function validateEmail(email) { 
 var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/ 
 return email.match(re) 
}



var http = {

  success:function(cb){
    return function(res){
      cb && cb(null,res)
    }
  },

  error:function(cb){
    return function(jqXHR, textStatus, errorThrown){
      cb && cb({hasError:true,status:jqXHR.status, jqXHR:jqXHR, textStatus:textStatus, errorThrown:errorThrown},null)
    }
  },

  post: function(url,data,cb) {
    $.ajax({
      url:url,
      type:'POST',
      contentType:'application/json',
      data:JSON.stringify(data),
      xdataType:'json',
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
      },
      error:http.error(cb)
    })
  }
  
}


var app = {
  debug:window.location.hash=='#debug',
  
  mode:'chat',

  topic: 0,
  active_topic: 0,
  topicheads:[],

  chat: {},
  msgcache: {},
  nickmap: {},
  joinmap: {},
  avimg: {},
  usersocial: {},
  invitesused: 0,

  usercache: {},

  text: {
    dummy: null
    ,loginfail: 'Your Login details are incorrect. Please try again.'
    ,registerfail: 'That username is taken. Please try again.'

    ,chatopenmsg: 'chat opened'
    ,chatclosedmsg: 'chat closed'

    ,enteremail: 'Please enter your email address.'
    ,validemail: 'Please enter a valid email address.'
    ,entername: 'Please enter your name.'

    ,pwdnomatch: 'Your passwords do not match'

    ,registernick: 'Please enter a username'
    ,registeremail: 'Please enter an email address'
    ,registerpwd:  'Please enter a password'
    ,registerpwdnomatch: 'Your passwords do not match'

    ,entersubject: 'Please enter a subject line'
    ,enterbody: 'Please enter a some body text'
  },


  dump: function(where) {
    return {
      where:where,mode:app.mode,topic:app.topic,nick:nick,chat:app.chat,nickmap:app.nickmap,joinmap:app.joinmap
    }
  },

  reloadpage: function(chatalias) {
    window.location.href = '/api/bounce/'+(chatalias||alias||'member')+'?'+Math.random()
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
    
    $('#rally_agree_container ul').hide()
    $('#rally_agree_' + app.topic).show()

    app.resize()

    app.scrolldown()
  },


  postsareascrolltop: function(){
    var postsarea = $('div.postsarea')
    var h  = postsarea.height()

    if( postsarea[0] ) {
      var sh = postsarea[0].scrollHeight
      //return sh - h;
      return sh;
    }
  },

  postbottom: function() {
    var postsarea = $('div.postsarea')
    if( postsarea[0] ) {
      var past = app.postsareascrolltop()
      if( 220+postsarea.scrollTop() > (past - postsarea.innerHeight()) ) {
        postsarea.scrollTop( past )
      }
    }
  },

  scrolldown: function() {
    var postsarea = $('div.postsarea')
    var sh = postsarea[0].scrollHeight
    postsarea.scrollTop(sh)
  },


  resize: function( chop ) {
    chop = 'undefined'==typeof(chop)?0:_.isNumber(chop)?chop:0;
    var published = 'done'==(app.chat.state||page.chat.state)?100:0

    var winh    = $(window).height()
    var headerh = $('div.header').height()
    var colh    = Math.max( 400, winh - headerh - chop)
    $('div.col').height(colh)

    //if( app.topichead ) {
      var thh = (app.topichead && app.topichead.height()) || 50
      var sbh = $('div.topicsend').height() || 100
      $('div.postsarea').height( colh-(sbh+thh+50) - chop + published)
    //}
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
        app.rightbar.box.agree.render()
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
    if( nick ) {
      $.ajax({
        url:'/api/chat/'+app.chat.chatid+
          (other?'/user/'+other:'')+
          '/dm'+(dmid?'/'+dmid:''),
        dataType:'json',
        success:function(res){
          cb && cb(res)
        }
      })
    }
    else {
      cb([])
    }
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


  getuserdetails: function(pnick,cb) {
    http.get('/api/user/'+pnick+'/details',function(res){
      if( res ) {
        app.usercache[pnick] = res 
      }
      cb && cb(res)
    })
  },


  userterms: function(data,cb) {
    http.post(
      '/api/user/'+page.user.nick+'/terms',
      {email:data.email,name:data.name,chatid:data.chatid},
      RE(function(res){
        cb && cb(res)
      }))
  },


  updateuser: function(data,cb) {
    http.post(
      '/api/user/'+page.user.nick,
      {email:data.email,name:data.name,pwd:data.pwd,pwd2:data.pwd2,avimg:data.avimg},
      RE(function(res){
        cb && cb(res)
      }))
  },


  getavatarandsocial: function(avnick,cb) {
    debug('getavatarandsocial:'+avnick+':'+app.avimg[avnick])
    if( (app.avimg[avnick] && '__pending__'!=app.avimg[avnick]) || null === app.avimg[avnick] ) {
      cb && cb(app.avimg[avnick], app.usersocial[avnick])
    }
    else if('__pending__'==app.avimg[avnick]) {
      setTimeout(function(){
        app.getavatarandsocial(avnick,cb)
      },5000)
    }
    else {
      app.avimg[avnick] = '__pending__'
      debug('getavatarandsocial:HTTP GET:'+avnick)
      http.get('/api/user/'+avnick+'/avatar_and_social',function(res){
        if( res.avimg ) {
          app.avimg[avnick] = res.avimg
        } else {
          app.avimg[avnick] = null        
        }
        if ( res.usersocial ) {
          app.usersocial[avnick] = res.usersocial
        } else {
          app.usersocial[avnick] = null
        }
        cb && cb(app.avimg[avnick], app.usersocial[avnick])
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
    try {
      now.joinchat(msg)
    }
    catch(e) {
      debug('joinchat',e)
    }
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
      app.leftbar.box.detail.render()
      http.post( '/api/chat/'+app.chat.chatid+'/state',
                 {state:'open'}, 
                 RE(function(data){
                   app.updatetopics(data)
                 }))
    }
  },


  closechat: function(cb) {
    if( app.ismod && 'closed' != app.chat.state ) {
      app.chat.state = 'closed'
      app.leftbar.box.detail.render()
      http.post( '/api/chat/'+app.chat.chatid+'/state',
                 {state:'closed'}, 
                 RE(function(data){
                   app.updatetopics(data)
                   cb && 'function'==typeof(cb) && cb()
                 }))
    }
  },


  movevanity: function() {
    if( app.ismod && 'done' == app.chat.state && app.chat.followon ) {
      http.post( '/api/chat/'+app.chat.followon+'/movevanity',
                 {}, 
                 RE(function(data){
                   app.reloadpage(data.chatname)
                 }))
    }
  },


  updatetopics: function() {
    debug('updatetopics',app.topicheads)
    for( var i = 0; i < app.topicheads.length; i++ ) {
      app.topicheads[i].render()
    }
  },

  linkify_atnames: function( t ) {
    // I need a list of lowercase->normalcase usernames, as users may enter any case
    var usernames = {} 
    for(var i in app.usersocial){ usernames[i.toLowerCase()] = i; }

    // get list of @name tags as best as we can with a regexp
    var atnames = t.match(/@[^,: \?!&;]+/g) || []
    atnames = $.unique(atnames)
    
    // if we have a social url for this username, use it. 
    for(var i in atnames) {
      var name = atnames[i].substring(1).toLowerCase()
      if (name in usernames && usernames[name]) {
        t = t.replace(new RegExp(atnames[i], 'g'), '@<a target="_blank" href="' + app.usersocial[usernames[name]] + '">' + atnames[i].substring(1) + '</a>')
      }
    }
    return t
  },

  formatmsgtext: function( text ) {
    var t = $('#escaper').text(text).html()
    t = linkify( t )

    if( 'done' != app.chat.state && -1 != t.indexOf('@'+nick) ) {
      t = '<b>'+t+'</b>'
    }

    t = app.linkify_atnames( t )
    
    return t
  },

  
  share: function(msgid,text,tweet,cb) {
    http.post( '/api/chat/'+app.chat.chatid+'/msg/'+msgid+'/share',
               {text:text,tweet:tweet}, 
               RE(function(data){
                 cb && 'function'==typeof(cb) && cb()
               }))
  },


  getmoderatoremail: function(cb) {
    debug('getmodemail')
    http.get( '/api/chat/'+app.chat.chatid+'/email/moderator',
              cb
            )
  },


  emailparticipants: function(subject,body,cb) {
    http.post( '/api/chat/'+app.chat.chatid+'/email/send',
               {subject:subject,body:body}, 
               cb
             )
  },


  formatpublishedchat: function() {
    
    app.leftbar.box.detail.init(app.chat).render()
    app.rightbar.box.agree.load()
    app.rightbar.box.reply.set(app.chat)
    app.rightbar.box.dm.render()

    $('p.post').each(function(index,post){
      var p = $(post)
      var ht = app.formatmsgtext( p.text() )
      p.html(ht)
    })

  },


  uploadimage: function(done,percent,info) {
    if( info ) {
      if( info.err ) {
        debug('upload',done,percent,info)
      }
      else {
        if( 'settings' == info.tag ) {
          app.popup.box.settings.uploadstatus(done,percent,info)
        }
        else if( 'signup' == info.tag ) {
          app.popup.box.signup.uploadstatus(done,percent,info)
        }
        else if( 'hostchat' == info.tag ) {
          app.popup.box.hostchat.uploadstatus(done,percent,info)
        }
      }
    }
  },


  fiximg: function(img,maxsize) {
    if( maxsize < img.width() ) {
      img.css({width:maxsize})
    }
    else if( maxsize < img.height() ) {
      img.css({height:maxsize})
    }
  },


  infomsg: function(text) {
    app.displaymsg({type:'info',text:text})
  },


  displaymsg: function(msg,noscroll) {
    debug(msg)
    if( msg.h ) return;

    if( 'info' == msg.type ) {
      var text = msg.text
      var post = $('#posts_tm li.infomsg').clone()
      post.find('p').text(text)
      var topicposts = $('#topic_posts_'+app.topic)
      topicposts.append(post)
      post.animate({opacity:1},500)
      app.postbottom()
      return
    }

    app.nickmap[msg.f] = true

    msg.p = 'undefined'==typeof(msg.p) ? app.topic : msg.p

    var social
    var post = $('#posts_tm li.message').clone()
    post.attr('id','msg_'+msg.i)
    post.find('p').html( app.formatmsgtext(msg.t) )

    if( msg.s ) {
      var when = post.find('div.when').attr('title',msg.s).text($.timeago(msg.s))
      app.timeago.push(when)
    }

    if( app.chat.modnicks[msg.f] ) {
      post.find('div.moderator').removeClass('hide')
    }

    app.getavatarandsocial(msg.f,function(avimg, usersocial){
      var buffer = ''
      debug('avimg',msg.f,avimg,usersocial)
      if ( avimg )       buffer += '<img src="'+avimg+'" width="32" height="32"></img>'
      if ( usersocial ) {
        social = usersocial
        buffer = '<a target="_blank" href="'+usersocial+'">' + buffer + '</a>'
      }
      if ( avimg )      post.find('div.post_avatar').html(buffer)
    })


    var buffer = msg.f
    if ( social ) buffer = '<a target="_blank" href="' + social + '">' + buffer + '</a>'
    post.find('h4').html(buffer)

    var share = post.find('a.share')
    var reply = post.find('a.sprite-at-reply')
    var approve = post.find('a.sprite-approve')


    if( !msg.x && nick ) {
      if( 0 < msg.a ) {
        post.find('.agrees').text('x'+msg.a)
      }

      reply.click(function(){
        var txt = $('#post_text').val()
        if( -1 == txt.indexOf( msg.f ) ) {
          var replywith = '@'+msg.f+' '+txt
          $('#post_text').val( replywith ) 
          setCaretPosition($('#post_text')[0],replywith.length)
        }
        $('#post_text').focus()
      })

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

      if( 'twitter' == page.user.service || 'facebook' == page.user.service || 'linkedin' == page.user.service ) {
        share.click(function(){
          app.popup.box.share.render(msg.i)
        })
      }
      else {
        share.hide()
      }
    }
    else {
      share.hide()
      reply.hide()
      approve.hide()
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
      if( !msg.nofadein ) {
        post.animate({opacity:opacity},500)
      }
      else {
        post.css({opacity:opacity})
      }

      if( !noscroll ) {
        app.postbottom()
      }
    }
    else if( !msg.h) {
      post.css({opacity:opacity})
    }
  },



  inituser: function(){    
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
            app.infomsg( msg.nick + ' has joined' )
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
            app.infomsg( 'discussion has moved to next topic' )
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
          app.infomsg( 'open' == msg.state ? app.text.chatopenmsg : app.text.chatclosedmsg )
        }
      }
      else if( 'external' == msg.type ) {
        app.rightbar.box.avatar.external(msg)
      }
    }

    
    setTimeout(app.joinchat,1000)
  },




  popup: {
    box: {}
  },


  rightbar: {
    box: {},

    show: function(others) {
      for( var i = 0; i < others.length; i++ ) {
        var box = app.rightbar.box[others[i]]
        box && showif(box) //box.show()
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

  $.cookie('socketio',null)

  $.ajaxSetup({ cache: false })

  $.timeago.settings.refreshMillis = 60000
  app.timeago = $('#timeago').timeago()

  
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




  function signupbox(next) {
    app.popup.box.signup.render()
    //$('#signup_box').show()
    app.signupbox_next = next
  }
  
  var registrationProcess = function() {
    var regmsg = $('#register_msg')

    var regdata = {
      nick:$('#register_username').val(),
      password:$('#register_password').val(),
      email:$('#register_email').val(),
      avimg:app.popup.box.signup.user.avimg
    }

    if( '' == regdata.nick ) {
      regmsg.text(app.text.registernick)
    }
    else if( '' == regdata.email ) {
      regmsg.text(app.text.registeremail)
    }
    else if( !validateEmail(regdata.email) ) {
      regmsg.text(app.text.validemail)
    }
    else if( '' == regdata.password ) {
      regmsg.text(app.text.registerpwd)
    }
    else if( $('#register_repeat').val() != regdata.password ) {
      regmsg.text(app.text.registerpwdnomatch)
    }
    else {
      $.ajax({
        url:'/api/auth/register',
        type:'POST',
        dataType:'json',
        contentType:'application/json',
        data:JSON.stringify(regdata),
        success:function(res){
          if( res.ok ) {
            window.nick = res.nick
            if( app.signupbox_next ) {
              var next = app.signupbox_next
              delete app.signupbox_next
              next()
            }
            else {
              app.reloadpage()
            }
          }
          else {
            regmsg.text(app.text.registerfail)
          }
        }
      })
    }
  }
  
  var registrationOnEnter = function(e){ 
    if (e.keyCode == 13) {
      registrationProcess() 
    }
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
          app.reloadpage()
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
        app.reloadpage()
      }
    })
  })


  $('div.modalbox').css({left:($(window).width()-200)/2})


  if( 'done' == page.chat.state ) {
    $('div.topicsend').hide()
  }
  else {
    debug('joinchat: start')

    if( nick ) {
      debug('joinchat: logged-in: '+nick)

      if( !now.name ) {
        now.name = nick
      }

      now.ready(function(){
        debug('joinchat: nowjs ready')
        app.inituser()
      })
    }
    else {
      //$('#welcome').show()
    }
  }



  

  app.popup.box.hostchat  = new HostChatBox()
  app.popup.box.profile   = new ProfileBox()
  app.popup.box.settings  = new SettingsBox()
  app.popup.box.signup    = new SignUpBox()
  app.popup.box.history   = new HistoryBox()
  app.popup.box.terms     = new TermsBox()
  app.popup.box.email     = new EmailBox()

  app.popup.box.share   = new ShareBox().init()

  app.leftbar.box.detail  = new ChatDetailsBox()

  app.midbar.box.send  = new SendBox().init()

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



  if( page.user.admin && chatid && 'member'!=chatid) {

    app.popup.box.aliases  = new WinzigBox('aliases_box')
    $('#aliases_box').winzig({
      entityurl:'/api/chat/'+chatid+'/admin/alias',
      onitem:function(itemdata){
        window.location = '/'+itemdata.text
      },
      onerror:function(){
        alert('Admin operation failed: duplicate alias.')
      }
    })

    app.popup.box.moderators  = new WinzigBox('moderators_box')
    $('#moderators_box').winzig({
      entityurl:'/api/chat/'+chatid+'/admin/moderator',
      onerror:function(){
        alert('Admin operation failed: unknown chat.')
      }
    })
  }


  $('h4').live('click',function(event){
    var n = $(event.target).text()
    if( app.nickmap[n] ) {
      app.popup.box.profile.render(n,app.avimg[n])
      app.popup.box.profile.el.box.show()
    }
  })





  if( chatid ) {
    if( nick && !page.user.toc ) {
      app.popup.box.terms.render()
    }

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

        var nicks = app.chat.nicks || []
        for( var i = 0; i < nicks.length; i++ ) {
          var other = nicks[i]
          app.rightbar.box.avatar.add(other)
        }


        var topicheads = $('#topicheads')
        var postsarea = $('div.postsarea')

        var topicposts_tm = $('#topicposts_tm')

        app.topic  = app.chat.topic || 0
        var topics = app.chat.topics || ['General']

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
          app.leftbar.box.detail.init(app.chat).render()

          $.ajax({
            url:'/api/chat/'+chatid+'/msgs',
            type:'GET',
            dataType:'json',
            success:function(res){
              debug(res)
              for( var i = 0; i < res.length; i++ ) {
                var msg = res[i]
                msg.nofadein = true
                app.msgcache[msg.i] = msg
                app.displaymsg(msg,true)
              }

              app.scrolldown()

              app.rightbar.box.agree.load()
              app.rightbar.box.reply.set(res)
              app.rightbar.box.dm.load()

              $('#appdump').text(app.dump('live-chat-loaded'))
            }
          })
        }

        // chat done
        else {
	    
	    app.formatpublishedchat()
	    $('#appdump').text(app.dump('done-chat-loaded'))
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


  $('#appdump').text(app.dump('init-done'))
});



function showhide(jqe,show) {
  if( jqe ) {
    if( show ) {
      jqe.show()
    }
    else {
      jqe.hide()
    }
  }
}

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
    self.el.desc.html( linkify( $('#escaper').text(topic.desc).html() ) ) // escape, then linkify topic.desc


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
        return app.active_topic != topic && topic.index < app.active_topic && 'open'==app.chat.state
      },
      makeactive: function() {
        return app.ismod && 'open' == app.chat.state && app.active_topic + 1 == topic.index && 'open'==app.chat.state
      },
      open: function() {
        return app.ismod && 'open' != app.chat.state && 'chat'==app.mode
      },
      close: function() {
        return app.ismod && 'open' == app.chat.state && topic.islast && app.active_topic == topic.index && 'chat'==app.mode
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
    ,cover: $('#send_box_cover')

    ,sendbtn: $("#post_send")
    ,text: $("#post_text")
    ,tweet: $('#send_tweet')
    ,count: $('#send_count')

    ,tweetout: $('div.tweetout')
    
  }


  
  showif(self,{
    tweetout: function(){
      return page && page.user && 'twitter' == page.user.service
    },
    box: function() {
      return true
    },
    cover: function() {
      return !( !!nick && (app.ismod || 'open' == app.chat.state ) && 'chat' == app.mode)
    }
  })


  self.init = function() {
    var max_length = 210, tweet_length = 140-(page.chat.hashtag.length)-1;

    self.el.tweet.change(function(){self.el.text.keydown()})

    self.el.text.NobleCount('#send_count',{
      max_chars:max_length,
      on_update:function(t_obj, char_area, c_settings, char_remaining){
        var tweet = self.el.tweet.attr('checked')

        var countelem = self.el.count
        char_rem = tweet ? char_remaining - ( max_length - tweet_length ) : char_remaining

        if( tweet ) {
          self.el.count.text( parseInt(self.el.count.text()) - ( max_length - tweet_length ) )
        }

        var warnsize = 20
        var oversize = 0

        if( char_rem < warnsize ) {
          countelem.show()
          if( char_rem < oversize ) {
            countelem.removeClass('undermax').addClass('overmax')
            self.el.sendbtn.hide()
          }
          else {
            self.el.sendbtn.show()
            countelem.removeClass('overmax').addClass('undermax')
          }
        }
        else {
          self.el.sendbtn.show()
          countelem.hide()
        }

        // limit text input to [maxLength] characters and display error message if above
        if (char_remaining < 0) {
          self.el.text.val(self.el.text.val().substring(0,max_length));
          self.el.count.text( "Woah!")
        }
      } 
    })

    return self
  }


  self.render = function() {
    showif(self)
  }


  self.post = function() {
    var tweet = self.el.tweet.attr('checked')
    var text  = self.el.text.val().replace(/\n/g,'')
    
    if (!text) return false;
    
    var msg = {c:chatid,t:text,type:'message',p:app.topic,w:tweet,g:app.chat.hashtag}
    debug(msg)
    
    setTimeout(function(){self.el.text.val('').text('')},200);
    self.el.text.focus();
    
    now.distributeMessage(JSON.stringify(msg),function(err,msg){
      if( err ) return debug(err);

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
    ,logo: $('#chat_logo')  
    ,img: $('#chat_logo img')  


    ,modmsgbtn: $('#rally_modmsgbtn')
    ,modname: $('#rally_modname')

    ,whenstr: $('#rally_whenstr')
    
    ,followon: $('#rally_followon')

    ,addtocalbtn: $('#rally_addtocalbtn')

    ,editbtn: $('#rally_editbtn')
    ,emailbtn: $('#rally_emailbtn')
    ,curatebtn: $('#rally_curatebtn')
    ,unpublishbtn: $('#rally_unpublishbtn')

    ,aliasesbtn: $('#rally_aliasesbtn')
    ,moderatorsbtn: $('#rally_moderatorsbtn')
    ,analyticsbtn: $('#rally_analyticsbtn')
  }


  self.init = function(chat) {

    self.el.addtocalbtn.AddToCal({
      icalEnabled:true,
      vcalEnabled:false,
        
      getEventDetails: function( element ) {
        var start = Date.parseExact( app.chat.whenstr, 'd MMM yyyy HH:mm zzz' )
        var end = new Date(start.getTime()+(60*60*1000))

        var out = { 
          webcalurl: null,
          icalurl: "/api/chat/"+app.chat.chatid+"/ical/"+start.getTime()+"/chat.ics",
          vcalurl: null, 
          start: start, 
          end: end, 
          title: app.chat.title, 
          details: app.chat.desc, 
          location: null, 
          url: "http://stanzr.com/"+(app.chat.vanity?app.chat.vanity:app.chat.chatid)
        };

        return out;
      },
    });

    $('#rally_title').text(chat.title||'')
    $('#rally_modname').text(chat.modname||'')
    $('#rally_modtitle').text(chat.modtitle||'')
    $('#rally_modorg').text(chat.modorg||'')

    $('#rally_whenstr').text(chat.whenstr||'')

    
    $('#rally_desc').html( markdown.toHTML(chat.desc) ).show()
    
    if( app.ismod ) {
      self.el.editbtn.click(killpopups(app.popup.box.hostchat.editchat))
      self.el.emailbtn.click(killpopups(app.popup.box.email.render))
      // self.el.moderatorsbtn.click(killpopups(app.popup.box.moderators.render))
      // self.el.analyticsbtn.attr('href','/'+chat.chatid+'/moderator')
      self.el.curatebtn.click(killpopups(app.curate.render))
      self.el.unpublishbtn.click(killpopups(function(){app.closechat(function(){
        app.reloadpage(alias)
      })}))
      self.el.followon.click(function(){
        app.movevanity(app.chat.followon)
      })
    }


    if( page.user.admin ) {
      self.el.aliasesbtn.click(killpopups(app.popup.box.aliases.render))
      self.el.moderatorsbtn.click(killpopups(app.popup.box.moderators.render))
      self.el.analyticsbtn.attr('href','/'+chat.chatid+'/moderator')
    }

    showif(self,{
      editbtn: function(){
        return app.ismod
      },
      emailbtn: function(){
        return app.ismod
      },
      curatebtn: function(){
        return app.ismod && 'closed'==app.chat.state
      },
      unpublishbtn: function(){
        return app.ismod && 'done'==app.chat.state
      },
      aliasesbtn: function(){
        return page.user.admin
      },
      moderatorsbtn: function(){
        return page.user.admin
      },
      analyticsbtn: function(){
        return page.user.admin
      },
      modmsgbtn: function() {
        return !!nick
      },
      followon: function() {
        return app.ismod && 'done'==app.chat.state && app.chat.followon 
      }
    })

    var img = self.el.img
    img[0].onload = function(){app.fiximg(img,200)}

    self.setlogo(chat.logo)

    self.el.modmsgbtn.click(function(){
      for( var modnick in app.chat.modnicks ) break;
      app.rightbar.box.dm.other = modnick
      app.rightbar.box.dm.drilldown()
    })

    self.el.modname.click(function(){
      for( var modnick in app.chat.modnicks ) break;
      app.popup.box.profile.render(modnick,app.avimg[modnick]);
      app.popup.box.profile.el.box.show()
    })

    return self
  }


  self.setlogo = function(logo) {
    if( logo ) {
      var imgurl = logo;//'http://c1.stanzr.com/img/logo/'+chat.logo
      var imgobj = new Image()
      imgobj.src = imgurl
      imgobj.onload = function() {
        //var width = 200 < imgobj.width ? 200 : imgobj.width
        //self.el.img.css({width:width})
        self.el.img.attr('src',imgurl).show()
        self.el.logo.show()
      }
    }
  }


  self.render = function() {
    showif(self)
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

        self.showhide()
      },200)

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
  

  this.showhide = function() {
    showhide( this.el.drilldown, this.showdrilldown ? this.showdrilldown() : true )
  }

  this.init = function(me) {
    var self = this
    var others = []
    for(var i = 0; i < this.all.length; i++) {
      if( me != this.all[i] ) {
        others.push(this.all[i])
      }
    }

    this.showhide()

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

  var dmcount = 0

  self.showdrilldown = function() {
    return 3 < dmcount && 'up'==self.drill
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
    box: function() {
      return 'done'!=page.chat.state && ( 0 < dmcount || 'down' == self.drill )
    },
    send: function(){
      return !!self.other && 'down' == self.drill
    },
    allbtn: function(){
      return !!self.other
    }
  })




  self.render = function(other) {
    if( 'done'==page.chat.state ) {
      showif(self)
      return
    }

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
      dmcount = dmlist && dmlist.length
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
      self.showhide()

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

  var agrees = []

  self.el = {
    dummy: null
    ,box: $('#agree_box')

    ,drilldown: $('#agree_drilldown')
    ,drillup: $('#agree_drillup')
    ,box: $('#agree_box')

    ,msgs_tm: $('#rally_agree_tm')
    ,msg_lists_container: $('#rally_agree_container')
    ,msg_lists: {}
    ,msg_tm: $('#agree_msg_tm')

  }

  self.showdrilldown = function() {
    return 3 < agrees.length
  }

  self.init('agree')




  showif(self,{
    box:function() {
      return 0 < self.count
    }
  })


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

    for ( var i in self.el.msg_lists ) {
        self.el.msg_lists[i].empty()
    }

    self.count = 0
    var topic_tapped_out = {};
    for( var i = 0; i < agrees.length; i++ ) {
      function displaymostagreed(msg){
        if( 1 <= msg.a && ! topic_tapped_out[msg.p] ) {
          var msgdiv = self.el.msg_tm.clone().attr('id','agree_'+msg.i)
          msgdiv.find('h4').text(msg.f)
          msgdiv.find('.count').text('x'+msg.a)
          msgdiv.find('.post').text(msg.t)
          if( !msg.h ) {
            // if we don't have a div for this topic (msg.p) yet, create one
            if( ! (msg.p in self.el.msg_lists) ) {
                var new_msg_list = self.el.msgs_tm.clone().attr('id', 'rally_agree_'+msg.p)
                topic_tapped_out[msg.p] = false;

                self.el.msg_lists[msg.p] = new_msg_list
                self.el.msg_lists_container.append(new_msg_list)

                // app.topic is set in the initial ajax call to get all app data, on line 1158
                // if the ajax call doesnt return before this runs, when it does return it runs
                // app.changetopic which will set this to displayed anyway.
                if ( typeof app.topic != 'undefined' && app.topic == msg.p ) {
                    new_msg_list.show()
                }
            }
            self.el.msg_lists[msg.p].append(msgdiv)
            msgdiv.fadeIn()
            self.count++
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

    showif(self)
    self.showhide()
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

  var replies = []


  self.el = {
    dummy: null
    ,box: $('#reply_box')

    ,drilldown: $('#reply_drilldown')
    ,drillup: $('#reply_drillup')
    ,box: $('#reply_box')

    ,msgs: $('#rally_reply')
    ,msg_tm: $('#reply_msg_tm')
  }

  self.showdrilldown = function() {
    return 3 < replies.length
  }


  self.init('reply')



  showif(self,{
    box:function() {
      return 0 < replies.length
    }
  })


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
    else {
      showif(self)
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

        var origmsg = $('#msg_'+msg.i)

        var share = msgdiv.find('a.share')
        var reply = msgdiv.find('a.sprite-at-reply')
        var approve = msgdiv.find('a.sprite-approve')


        if( 'twitter' == page.user.service ) {
          share.click(function(){
            origmsg.find('a.share').click()
          })
        }
        else {
          share.hide()
        }

        reply.click(function(){
          origmsg.find('a.sprite-at-reply').click()
        })

        approve.click(function(){
          origmsg.find('a.sprite-approve').click()
        })



        if( !msg.h ) {
          msgdiv.fadeIn()
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

    showif(self)
    self.showhide()
  }
  
}
ReplyBox.prototype = new RightbarBox()



function AvatarBox() {
  var self = this
  
  self.el = {
    dummy: null
    ,box: $('#avatar_box')
    ,drilldown: $('#avatar_drilldown')
    ,drillup: $('#avatar_drillup')
  }

  showif(self,{
    box: function() { return true; },
    drilldown: function() { return 'up'==self.drill; },
    drillup: function() { return 'down'==self.drill; }
  })


  self.init('avatar')

  var avatars = {}
  var externals = {}


  function buildpopup(avatar,avnick,avimg) {
    if( nick ) {
      avatar.click(function(){
        app.popup.box.profile.render(avnick,avimg,externals[avnick]);
        app.popup.box.profile.el.box.show()
      })
    
      avatar.mouseenter(function(){
        app.popup.box.profile.render(avnick,avimg,externals[avnick]);
        app.popup.box.profile.el.box.css({
          top:20+(avatar.offset().top),
          left:(avatar.offset().left)-220
        }).show()
      })

      avatar.mouseleave(function(){
        app.popup.box.profile.checkmouse()
      })
    }
  }


  self.add = function(avnick) {
    if( avnick ) {
      if( !avatars[avnick] ) {

        var avatar = $('#miniavatar_tm').clone()
        avatar.attr('id','miniavatar_'+avnick)
        
        buildpopup(avatar,avnick,app.avimg[avnick])

        $('#rally_miniavatars').append(avatar)
        avatar.show()
        avatars[avnick] = avatar

        app.getavatarandsocial(avnick,function(avimg, usersocial){
          var buffer = ''
          debug('avatarbox',avnick,avimg,usersocial)
          if ( avimg )      buffer += '<img src="'+avimg+'" width="32" height="32"></img>'
          if ( usersocial ) buffer = '<a target="_blank" href="'+usersocial+'">' + buffer + '</a>'
          if ( avimg )      avatar.html(buffer)
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

    buildpopup(avatar,msg.f,msg.av)

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

    ,title:    $('#hostchat_title')
    ,modname:  $('#hostchat_modname')
    ,modtitle: $('#hostchat_modtitle')
    ,modorg:   $('#hostchat_modorg')
    ,whenstr:  $('#hostchat_whenstr')
    ,hashtag:  $('#hostchat_hashtag')
    ,desc:     $('#hostchat_desc')

    ,details:    $('#hostchat_details')
    ,topics:     $('#hostchat_topics')

    ,upload:    $('#hostchat_upload')
    ,image:     $('#hostchat_image')

    ,topiclist:    $('#hostchat_topiclist')
    ,topicitem_tm: $('#hostchat_topicitem_tm')
  }


  var img = self.el.image.find('img')
  img[0].onload = function(){app.fiximg(img,200)}


  self.el.whenstr.datetimepicker({
    dateFormat:'d M yy',
    timeFormat:'hh:mm z',
    showTimezone:true,
    timezoneList:['GMT','EST','CST','MST','PST','EDT','CDT','MDT','PDT'],
    //timezoneList:['A','ADT','AFT','AKDT','AKST','ALMT','AMST','AMT','ANAST','ANAT','AQTT','ART','AST','AZOST','AZOT','AZST','AZT','B','BNT','BOT','BRST','BRT','BST','BTT','C','CAST','CAT','CCT','CDT','CEST','CET','CHADT','CHAST','CKT','CLST','CLT','COT','CST','CVT','CXT','ChST','D','DAVT','E','EASST','EAST','EAT','ECT','EDT','EEST','EET','EGST','EGT','EST','ET','F','FJST','FJT','FKST','FKT','FNT','G','GALT','GAMT','GET','GFT','GILT','GMT','GST','GYT','H','HAA','HAC','HADT','HAE','HAP','HAR','HAST','HAT','HAY','HKT','HLV','HNA','HNC','HNE','HNP','HNR','HNT','HNY','HOVT','I','ICT','IDT','IOT','IRDT','IRKST','IRKT','IRST','IST','JST','K','KGT','KRAST','KRAT','KST','KUYT','L','LHDT','LHST','LINT','M','MAGST','MAGT','MART','MAWT','MDT','MHT','MMT','MSD','MSK','MST','MUT','MVT','MYT','N','NCT','NDT','NFT','NOVST','NOVT','NPT','NST','NUT','NZDT','NZST','O','OMSST','OMST','P','PDT','PET','PETST','PETT','PGT','PHOT','PHT','PKT','PMDT','PMST','PONT','PST','PT','PWT','PYST','PYT','Q','R','RET','S','SAMT','SAST','SBT','SCT','SGT','SRT','SST','T','TAHT','TFT','TJT','TKT','TLT','TMT','TVT','U','ULAT','UYST','UYT','UZT','V','VET','VLAST','VLAT','VUT','W','WAST','WAT','WDT','WEST','WET','WFT','WGST','WGT','WIB','WIT','WITA','WST','WT','X','Y','YAKST','YAKT','YAPT','YEKST','YEKT','Z'],
    timezone:'GMT'
  })


  function newchat() {
    self.el.details.show()
    self.el.topics.hide()

    self.el.title.val()
    self.el.modname.val()
    self.el.modtitle.val()
    self.el.modorg.val()
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
    self.el.modtitle.val( chat.modtitle );
    self.el.modorg.val( chat.modorg );
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
    var topic_title_count = topic.find('#topic_title_countitem_tm')
    var topic_title = topic.find('input')
    var topic_description_count = topic.find('#topic_description_countitem_tm')
    var topic_description = topic.find('textarea')
    var tI = self.el.topiclist.find('li').length
    topic.attr('id','hostchat_topic_'+tI)
    topic_title_count.attr('id', 'topic_character_count_'+tI)

    if( topicdata ) {
      topic.find('input').val(topicdata.title)
      topic.find('textarea').val(topicdata.desc)
    }

    self.el.topiclist.append(topic)
    topic.show()

    if( 1 < self.el.topiclist.find('li').length ) {
      self.el.lessbtn.show()
    }
    
    topic_title.NobleCount('#topic_title_count_' + tI, {
        max_chars: 140,
        on_update: function(t_obj, char_area, c_settings, char_rem){
            topic_title_count.val(char_rem < 0 ? char_rem : 0)
            if(char_rem < 0) {
                topic_title.val(topic_title.val().substring(0,140))
            }
        }
    })

    topic_description.NobleCount('#topic_description_count_' + tI, {
        max_chars: 140,
        on_update: function(t_obj, char_area, c_settings, char_rem){
            topic_description_count.val(char_rem < 0 ? char_rem : 0)
            if(char_rem < 0) {
                topic_description.val(topic_description.val().substring(0,140))
            }
        }
    })

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

    var whenstr = self.el.whenstr.val()
    var when = ( whenstr && 0 < whenstr.length && Date.parseExact( whenstr, 'd MMM yyyy HH:mm zzz' ) ) || new Date()


    if( valid ) {
      $.ajax({
        url:'/api/chat'+(chatid?'/'+chatid:''),
        type: (chatid?'POST':'PUT'),
        dataType:'json',
        contentType:'application/json',
        data:JSON.stringify({

          chatid:     app.chat.chatid,
          moderator:  nick,
          
          logo:       self.logo,

          title:      title,
          modname:    self.el.modname.val(),
          modtitle:   self.el.modtitle.val(),
          modorg:     self.el.modorg.val(),
          whenstr:    whenstr,
          when:       when.getTime(),
          hashtag:    hashtag,
          desc:       self.el.desc.val(),
          topics:     topics

        }),
        success:function(res){
          if( res.chatid ) {
            app.reloadpage(res.chatid)
          }
          else {
            $('#hostchat_msg').text('Unable to create chat session')
          }
        }
      })
    }
  }


  self.uploadstatus = function(done,percent,info) {
    debug(done,percent,info)
    self.el.upload.hide()
    self.el.image.show()
    self.el.image.find('div').animate({width:(Math.floor(250*(percent/100)))})

    if( 100 == percent ) {
      self.el.image.find('div').animate({width:250}).fadeOut(function(){
        self.logo = info.url
        var img = self.el.image.find('img')
        img.attr('src',self.logo).fadeIn()
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

    ,nick: $('#profile_nick')
    ,name: $('#profile_name')

    ,messagebtn: $('#profile_messagebtn')
    ,banbtn: $('#profile_banbtn')
    ,unbanbtn: $('#profile_unbanbtn')

    ,you: $('#profile_you')
    ,moderator: $('#profile_moderator')
    ,smlink: $('#profile_smlink')

    ,avimg: $('#profile_avimg')
    ,invitebtn: $('#profile_invitebtn')
    ,sendbtn: $('#profile_sendbtn')
    ,body: $('#profile_body')
  }

  self.cnick
  self.avimg
  self.external

  showif(self,{
    messagebtn: function() {
      return nick != self.cnick && !self.external
    },
    banbtn: function() {
      return app.ismod && nick != self.cnick && !app.chat.bans[self.cnick] && !self.external
    },
    unbanbtn: function() {
      return app.ismod && nick != self.cnick && app.chat.bans[self.cnick] && !self.external
    },
    you: function() {
      return nick == self.cnick
    },
    invitebtn: function() {
      return self.external && app.ismod && app.invitesused < 3
    },
    sendbtn: function() {
      return false
    },
    body: function() {
      return false
    },
    moderator: function() {
      return app.chat.modnicks[self.cnick]
    },
    image: function() {
      return 
    }
  })


  self.render = function(pnick,pavimg,pext) {
    self.cnick = pnick
    self.avimg = pavimg || app.avimg[self.cnick]
    self.external = pext

    self.el.nick.text(self.cnick)


    if( self.avimg ) {
      self.el.avimg.html('<img src="'+self.avimg+'" width="32" height="32"></img>')
    }
    else {
      self.el.avimg.html('')
    }


    function userdetails(user) {
      self.el.name.text(user.name)

      if( user.social ) {
        var sn = user.social.service
        var url = 
          'twitter'==sn  ?'http://twitter.com/'+user.nick:
          'facebook'==sn ?'http://facebook.com/'+user.nick:
          'linkedin'==sn ?'http://www.linkedin.com/in/'+user.nick:
          '';
        if( url ) {
          self.el.smlink.text(user.nick).attr('href',url)
        }
      }
    }

    self.el.name.text('')
    self.el.smlink.text('').attr('href','')

    if( app.usercache[self.cnick] ) {
      userdetails(app.usercache[self.cnick])
    }
    else {
      app.getuserdetails(self.cnick,userdetails)
    }

    showif(self)
  }


  function sendban(ban,cb) {
    $.ajax({
      url:'/api/chat/'+app.chat.chatid+'/user/'+self.cnick+'/status',
      type:'POST',
      contentType:'application/json',
      dataType:'json',
      data:JSON.stringify({ban:ban}),
      success:function(res){
        cb(res)
      }
    })
  }


  self.checkmouse = function() {
    if( !self.mouseoverme ) {
      //self.el.box.hide() does not work
    }
  }
  
  self.el.box.mouseenter(function(){
    self.mouseoverme = true
  })


  self.el.box.mouseleave(function(){
    self.mouseoverme = false
    self.el.box.hide()
  })

  self.el.messagebtn.click(function(){
    self.el.box.hide()
    //$('body .qtip').hide();
    app.rightbar.box.dm.other = self.cnick
    app.rightbar.box.dm.drilldown()
    app.rightbar.box.dm.render()
  })

  self.el.banbtn.click(function(){
    app.chat.bans[self.cnick]=1
    showif(self)
    app.rightbar.box.avatar.ban(true,self.cnick)
    sendban(true,function(){
    })
  })

  self.el.unbanbtn.click(function(){
    delete app.chat.bans[self.cnick]
    showif(self)
    app.rightbar.box.avatar.ban(false,self.cnick)
    sendban(false,function(){
    })    
  })

  self.el.invitebtn.click(function(){
    self.el.box.css({height:300})
    self.el.body.val('@'+self.cnick+' Come join the chat at: '+window.location.href).show()
    self.el.sendbtn.show().click(function(){
      var body = self.el.body.val()
      app.sendinvite(self.cnick,body)
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
            app.reloadpage(chatid)
          }
        })(chatitem.c))
        self.el.history.append(histitem)
      }
    })

    showif(self)
  }
}

	     /*
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
	     */

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
    ,heading: $('#settings_heading')

    ,name: $('#settings_name')
    ,email: $('#settings_email')

    ,pwd: $('#settings_pwd')
    ,pwd2: $('#settings_pwd2')

    ,image: $('#settings_image')
    ,upload: $('#settings_upload')

    ,savebtn: $('#settings_savebtn')

    ,msg: $('#settings_msg')
  }

  
  showif(self,{
    upload: function() {
      return true //self.user && self.user.avimg;
    },
    image: function() {
      return false //self.user && self.user.avimg;
    }
  })


  self.render = function() {
    self.el.box.show()

    self.el.heading.click(function(){
      debug(app.dump('manual'))
    })

    app.getuser(function(user){
      self.user = user

      self.user.avimg = self.user.avimg || ''

      var img = self.el.image.find('img')
      img[0].onload = function(){app.fiximg(img,64)}

      ui.text(self.el.box,{
        '#settings_username':user.nick
      })
      ui.val(self.el.box,{
        '#settings_email':user.email,
        '#settings_name':user.name
      })
    })

    showif(self)

    self.el.savebtn.click(function(){
      var user = {
        email:self.el.email.val(),
        name:self.el.name.val(),
        pwd:self.el.pwd.val(),
        pwd2:self.el.pwd2.val(),
        avimg:self.user.avimg
      }
      
      if( ''==user.email ) {
        self.el.msg.text(app.text.enteremail)
      }
      else if( !validateEmail(user.email) ) {
        self.el.msg.text(app.text.validemail)
      }
      else if( ''==user.name ) {
        self.el.msg.text(app.text.entername)
      }
      else if( user.pwd != user.pwd2 ) {
        self.el.msg.text(app.text.pwdnomatch)
      }
      else {
        app.updateuser(user,function(){
          app.reloadpage()
        })
      }
    })
  },


  self.uploadstatus = function(done,percent,info) {
    debug(done,percent,info)
    self.el.upload.hide()
    self.el.image.show()
    self.el.image.find('div').animate({width:(Math.floor(250*(percent/100)))})

    if( 100 == percent ) {
      self.el.image.find('div').animate({width:250}).fadeOut(function(){
        self.user.avimg = info.url
        var img = self.el.image.find('img')
        img.attr('src',self.user.avimg).fadeIn()
      })
    }
  }

}



function SignUpBox() {
  var self = this

  self.user = {}

  self.el = {
    dummy: null

    ,box: $('#signup_box')

    ,image: $('#signup_image')
    ,upload: $('#signup_upload')

  }

  
  showif(self,{
    upload: function() {
      return true
    },
    image: function() {
      return false
    }
  })


  self.render = function() {
    self.el.box.show()

    var img = self.el.image.find('img')
    img[0].onload = function(){app.fiximg(img,64)}

    showif(self)
  },


  self.uploadstatus = function(done,percent,info) {
    debug(done,percent,info)
    self.el.upload.hide()
    self.el.image.show()
    self.el.image.find('div').animate({width:(Math.floor(250*(percent/100)))})

    if( 100 == percent ) {
      self.el.image.find('div').animate({width:250}).fadeOut(function(){
        self.user.avimg = info.url
        var img = self.el.image.find('img')
        img.attr('src',self.user.avimg).fadeIn()
      })
    }
  }

}




function ShareBox() {
  var self = this

  self.el = {
    dummy: null

    ,box: $('#share_box')

    ,text: $('#share_text')
    ,tweetout: $('#share_tweetout')
    ,tweet: $('#share_tweet')
    ,count: $('#share_count')
    ,title: $('#share_box h2')

    ,postbtn: $('#share_postbtn')
  }

  
  showif(self,{
    tweetout: function() {
      return page && page.user && 'twitter' == page.user.service
    }
  })


  self.init = function() {
    self.el.postbtn.click(function(){
      var text = self.el.text.val()
      self.el.text.val('')
      self.el.box.hide()

      switch (page.user.service) {
        case 'twitter':
            break;
        case 'facebook':
            break;
        case 'linkedin':
            break;
      }

      var tweet = self.el.tweet.attr('checked')

      app.share(self.msg.i,text,tweet,function(){
      })
    })

    self.el.text.NobleCount('#share_count',{
      max_chars: 140-(page.chat.hashtag.length)-1,
      on_negative: 'overmax',
      on_positive: 'undermax',
      on_update: function(t_obj, char_area, c_settings, char_rem){
        debug(t_obj,char_area,c_settings,char_rem)
        if( char_rem < 0 ) {
          self.el.postbtn.hide()
        }
        else {
          self.el.postbtn.show()
        }
      }
    })

    return self
  }


  self.render = function(msgid) {
    self.el.box.show()

    if ( page.user.service == 'twitter' ) {
      self.el.title.text("Post to Twitter")
    } else if ( page.user.service == 'facebook' ) {
      self.el.title.text("Post to Facebook")
    } else if ( page.user.service == 'linkedin' ) {
      self.el.title.text("Post to LinkedIn")
    }

    self.msg = app.msgcache[msgid]
    var text =  ('RT @'+self.msg.f+': '+self.msg.t).replace(/\n/g,'')
    //self.el.text.text(text)
    self.el.text.val(text)
    self.el.text.keydown()

    showif(self)
  }
}



function TermsBox() {
  var self = this

  self.el = {
    dummy: null

    ,box: $('#terms_box')

    ,msg: $('#terms_msg')
    ,toc: $('#terms_toc')

    ,email: $('#terms_email')
    ,name: $('#terms_name')

    ,okbtn: $('#terms_okbtn')
  }

  
  showif(self,{
  })


  self.render = function() {
    self.el.box.show()

    self.el.email.val(page.user.email)
    self.el.name.val(page.user.name)

    showif(self)

    $.ajax({
      url:'/terms.html',
      type:'GET',
      success:function(terms){
        self.el.toc.html(terms)
      }})

    self.el.okbtn.click(function(){
      if( !self.el.email.val() ) {
        self.el.msg.text(app.text.enteremail).show()
      }
      else if( !validateEmail( self.el.email.val() ) ) {
        self.el.msg.text(app.text.validemail).show()
      }
      else if( !self.el.name.val() ) {
        self.el.msg.text(app.text.entername).show()
      }
      else {
        self.el.box.hide()
        app.userterms({chatid:app.chat.chatid,email:self.el.email.val(),name:self.el.name.val()})
      }
    })
  }
}



function EmailBox() {
  var self = this

  self.el = {
    dummy: null

    ,box: $('#email_box')

    ,subject: $('#email_subject')
    ,body: $('#email_body')

    ,sendbtn: $('#email_sendbtn')
    ,closebtn: $('#email_closebtn')

    ,msg: $('#email_msg')
  }

  
  showif(self,{
  })


  self.render = function() {

    self.el.box.show()

    app.getmoderatoremail(function(data){
      self.el.subject.val(data.subject)
      self.el.body.val(data.body)
    })
  }


  self.el.sendbtn.click(function(){
    var subject = self.el.subject.val()
    var body    = self.el.body.val()

    if( '' == subject ) {
      self.el.msg.text(app.text.entersubject)
    }
    else if( '' == body ) {
      self.el.msg.text(app.text.enterbody)
    }
    else {
      self.el.msg.text('Sending email...')
      self.el.sendbtn.hide()

      app.emailparticipants(subject,body,function(err,out){
	self.el.closebtn.show()

        if( err ) {
          self.el.msg.text('Email sending failed.')
        }
        else {
          self.el.msg.text('Email sent successfully.')
        }
      })
    }
  })

  self.el.closebtn.click(function(){ self.el.box.hide() } )
}


function WinzigBox(elemid) {
  var self = this

  self.el = {
    box: $('#'+elemid)
  }

  self.render = function() {
    self.el.box.winzig('reload')
    self.el.box.slideDown()
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
    app.mode = 'curate'
    app.changetopic(0)
    app.updatetopics()

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
    $('div.when').fadeOut()

    var items = self.el.list.find('li')
    if( 0 == items.length ) {
      self.addtopics()
    }

    $('a.topic_copyall').removeClass('hide')

    $('li.message').bind('click.curate',function(event){
      var msgitem = self.makeitem( $(event.target).parents('li') )
      self.insert(msgitem)
    })

    $('a.topic_copyall').bind('click.curate',function(event){
      var topic = $(event.target).parents('div.topichead').attr('id').substring(11)
      debug('topic',topic)

      var posts = $('#topic_posts_'+topic).find('li.message')
      for( var i = 0; i < posts.length; i++) {
        var msgid = $(posts[i]).attr('id').substring(4)
        var msg = app.msgcache[msgid]
        if( !msg.h ) {
          var item = self.makeitem(posts[i])
          self.insert(item)
        }
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
    app.mode = 'chat'
    app.updatetopics()

    self.el.topbar.animate({height:0})

    app.el.midcol.css({'overflow-y':'hidden'}).animate({width:450},function(){
      self.el.result.fadeOut()
    })
    
    app.el.leftcol.show().animate({width:265})
    app.el.rightcol.animate({width:265})
    
    $('a.topic_copyall').addClass('hide')

    $('div.topicsend').fadeIn()
    $('div.when').fadeIn()

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
    msgitem.find('p').html( app.formatmsgtext(msg.t) )

    if( app.avimg[msg.f] ) {
      msgitem.find('div.post_avatar').html('<img src="'+app.avimg[msg.f]+'" width="32" height="32"></img>')
    }

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
                   a:(app.msgcache[msgid].a||0),
                   w:(app.msgcache[msgid].w||0)
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
      http.post('/api/chat/'+app.chat.chatid+'/publish',{entries:entries},function(err,res){
	      if( err ) return debug(err);
        app.reloadpage(res.pubalias)
      })
    }
  })
}

var restartdelay = 500

window.restartchat = function() {
  now.name = nick
  app.inituser()
  restartdelay = 2 * restartdelay
  setTimeout(app.joinchat, restartdelay )
}


$('li.message').live('mouseenter', function(){
  $('.post_actions', this).show();
});

$('li.message').live('mouseleave', function(){
  if( $(this).data('shared')!==true ){
    $('.post_actions', this).hide();
  }
});	

$('li.message .post_actions a.sprite-reshare, li.message .post_actions a.sprite-approve').live('click', function(evt){
  $(this).parents('li.message').data('shared', true);
});

}
catch( e ) {
  logerror('error',e)
}



