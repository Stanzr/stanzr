

var common = require('../lib/common.js') 
var request = common.request
var uuid    = common.uuid
var assert  = common.assert
var eyes    = common.eyes
var util    = common.util
var log     = common.log

var main = require('../lib/main.js')


function getseneca(cb) {
  if( main.seneca ) {
    cb(main.seneca)
  }
  else {
    setTimeout(function(){getseneca(cb)},50)
  }
}


function mockreq( params, json, user ) {
  return {
    params:params,
    json$:json,
    user$:user
  }
}

function mockres(cb) {
  function Response(cb) {
    var r = {}
    
    this.writeHead = function(status,headers) {
      r.status = status
      r.headers = headers
    }

    this.end = function( body ) {
      r.body = body
      cb(r)
    }
  }
  return new Response(cb)
}


function loadchat(req,cb) {
  var chat = main.ent.make$('app','chat')
  chat.load$({chatid:req.params.chatid},function(err,chat){
    if( err ) { 
      console.dir(err)
      assert.fail()
    }
    else {
      req.chat$ = chat
      cb(req)
    }
  })
}

module.exports = {

  seneca: function() {
    getseneca(function(seneca){

      ;seneca.act({on:'stanzr',cmd:'time'},function(err,date){
        assert.isNull(err)
        assert.ok( 'number' == typeof(date.getTime()) )

      ;seneca.act({on:'stanzr',cmd:'ping-mongo'},function(err,out){
        assert.isNull(err)
        assert.ok( 1, out.a )

      }) // mongo-ping
      }) // time

    })
  },

  ping: function() {
    getseneca(function(seneca){

      main.api.ping(mockreq({kind:'node'}),mockres(function(res){
        assert.equal(200,res.status)
        assert.equal('application/json',res.headers['Content-Type'])
        assert.ok( JSON.parse(res.body).ok )
      }))

      main.api.ping(mockreq({kind:'diag'},{foo:'bar'},{nick:'nock'}),mockres(function(res){
        assert.equal(200,res.status)
        assert.equal('application/json',res.headers['Content-Type'])
        var out = JSON.parse(res.body)
        assert.equal('diag', out.params.kind )
        assert.equal('bar', out.json.foo )
        assert.equal('nock', out.user.nick )
      }))

    })
  },


  chat: function() {
    getseneca(function(seneca){
      var nick = 'test-'+uuid().substring(0,8)

      ;main.api.chat.save(
        mockreq(
          {},
          {title:'t1',moderator:nick,topics:[
            {title:'t1',desc:'d1'},
            {title:'t2',desc:'d2'},
            {title:'t3',desc:'d3'},
          ]},
          {nick:nick}),
        mockres(function(res){
          eyes.inspect(res)
          assert.equal(200,res.status)
          var chat = JSON.parse(res.body)
          var chatid = chat.chatid
          assert.ok(chatid)

      ;main.chat.get(chatid,function(err,chat){
        assert.isNull(err)
        eyes.inspect(chat,'chat')
        assert.equal(chatid,chat.chatid)
        assert.equal('t1',chat.title)



      ;main.api.chat.save(
        mockreq(
          {chatid:chat.chatid},
          {title:'t1x',moderator:nick,topics:[
            {title:'t1',desc:'d1'},
            {title:'t2',desc:'d2'},
            {title:'t3',desc:'d3'},
          ]},
          {nick:nick}),
        mockres(function(res){
          eyes.inspect(res)
          assert.equal(200,res.status)
          var chat = JSON.parse(res.body)
          var chatid = chat.chatid
          assert.ok(chatid)

      ;main.chat.get(chatid,function(err,chat){
        assert.isNull(err)
        eyes.inspect(chat,'chat')
        assert.equal(chatid,chat.chatid)
        assert.equal('t1x',chat.title)

        

      ;main.api.chat.topic.get(
        mockreq(
          {chatid:chatid,topic:0},
          {},
          {nick:nick}
        ),
        mockres(function(res){
          eyes.inspect(res)
          assert.equal(200,res.status)
          var topic = JSON.parse(res.body)
          assert.equal('t1',topic.title)


      ;main.api.chat.topic.post(
        mockreq(
          {chatid:chatid,topic:0},
          {title:'t1x'},
          {nick:nick}
        ),
        mockres(function(res){
          eyes.inspect(res)
          assert.equal(200,res.status)
          var body = JSON.parse(res.body)
          assert.equal('t1x',body.topic.title)


      ;main.api.chat.topic.post_active(
        mockreq(
          {chatid:chatid,topic:1},
          {},
          {nick:nick}
        ),
        mockres(function(res){
          eyes.inspect(res)
          assert.equal(200,res.status)
          var body = JSON.parse(res.body)
          assert.equal(1,body.topic)


      })) // api topic post_active
      })) // api topic post
      })) // api topic get

      })  // main chat get          
      })) // api chat post

      })  // main chat get          
      })) // api chat put

    })
  },


  chat_state: function() {
    getseneca(function(seneca){
      var nick = 'test-'+uuid().substring(0,8)

      ;main.api.chat.save(
        mockreq(
          {},
          {title:'s1',moderator:nick,topics:[
            {title:'t1',desc:'d1'}
          ]},
          {nick:nick}),
        mockres(function(res){
          assert.equal(200,res.status)
          var chat = JSON.parse(res.body)
          var chatid = chat.chatid
          assert.ok(chatid)
          assert.equal('closed',chat.state)

      ;loadchat(
        mockreq(
          {chatid:chatid},
          {state:'open'},
          {nick:nick}),
        function(req) {

      ;main.api.chat.state(
        req,
        mockres(function(res){
          assert.equal(200,res.status)
          var chat = JSON.parse(res.body)
          var chatid = chat.chatid
          assert.ok(chatid)
          assert.equal('open',chat.state)


      })) // chat.state         
      })  // loadchat

      })) // chat.save
    })
  }
}