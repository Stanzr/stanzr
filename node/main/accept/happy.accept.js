

var common = require('../lib/common.js') 
var request = common.request
var uuid    = common.uuid
var assert  = common.assert
var eyes    = common.eyes
var util    = common.util
var log     = common.log


var urlprefix = 'http://127.0.0.1:8080'


function get(spec,cb) {
  request.get(spec,handle(cb,'GET',spec))
}

function post(spec,cb) {
  request.post(spec,handle(cb,'POST',spec))
}

function put(spec,cb) {
  request.put(spec,handle(cb,'PUT',spec))
}

function del(spec,cb) {
  request.del(spec,handle(cb,'DELETE',spec))
}


function handle(cb,method,spec) {
  log(method,spec.uri,spec.json)
  return function(error, response, body) {
    assert.equal(null,error)
    log(method,spec.uri,response.statusCode+': '+body)
    var json = JSON.parse(body)
    cb(json,response)
  }
}



function createuser(cb) {
  var nick = 'test-'+uuid().substring(0,8)
  post(
    {uri:urlprefix+'/api/auth/register',
     json:{nick:nick,email:nick+'@example.com',password:nick.toLowerCase()}}, 
    function(json){
      assert.ok(json.ok)
      
      post(
        {uri:urlprefix+'/api/auth/login',
         json:{nick:nick,password:nick.toLowerCase()}}, 
          function(json,response){
            assert.ok(json.ok)
            eyes.inspect(response)

            cb({nick:nick},response)
          }
      )        
    }
  )
  
}


module.exports = {

  ping:function() {
    get(
      {uri:urlprefix+'/api/ping/node'}, 
      function(json){
        assert.ok(json.ok)
        assert.ok(json.now)
      }
    )

    get(
      {uri:urlprefix+'/api/ping/mongo'}, 
      function(json){
        assert.ok(json.ok)
        assert.ok(json.end)
        assert.ok(json.dur)
      }
    )
  },


  auth:function() {
    var nick = 'test-'+uuid().substring(0,8)
    post(
      {uri:urlprefix+'/api/auth/register',
       json:{nick:nick,email:nick+'@example.com',password:nick.toLowerCase()}}, 
      function(json){
        assert.ok(json.ok)

        post(
          {uri:urlprefix+'/api/auth/login',
           json:{nick:nick,password:nick.toLowerCase()}}, 
          function(json,response){
            assert.ok(json.ok)
            //eyes.inspect(response)
          }
        )        
      }
    )

  },



  chat:function() {
    var title = uuid().substring(0,8)
    createuser(function(user,res){
      console.log('createuser:'+JSON.stringify(user))
      var token = (/stanzr=(.*?);/.exec(res.headers['set-cookie']))[1]
      console.log(token)

      put(
        {uri:urlprefix+'/api/chat',
         headers:{'Cookie':'stanzr='+token+';'},
         json:{
           moderator:user.nick,
           title:'title-'+title,
           hashtag:'tag'+title,
           desc:'desc-'+title,
           whenstr:'when-'+title,
           topics:[
             {name:'AAA', desc:'aaa'},
             {name:'BBB', desc:'bbb'},
             {name:'CCC', desc:'ccc'}
             ]
         }}, 
        function(json,response){
          eyes.inspect(json)
          eyes.inspect(response)
        }
      )
    })
  }


}