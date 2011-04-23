
var common = require('./common')

var util     = common.util
var uuid     = common.uuid
var eyes     = common.eyes
var Cookies  = common.cookies
var linkedin = common.linkedin

var conf = common.conf

var seneca

var cache = {}

var social = {
  linkedin: {
    client: null,

    initclient: function(conf){
      social.linkedin.client = linkedin(
        conf.keys.linkedin.key,
        conf.keys.linkedin.secret,
        conf.keys.linkedin.callback
      )
    },

    initapp: function(expapp){
      expapp.get('/social/linkedin/login/:chatid?', function (req, res) {

        if( req.params.chatid ) {
          cookies = new Cookies( req, res )
          cookies.set('stanzr-chat',req.params.chatid)
        }

        social.linkedin.client.getAccessToken(req, res, function (error, token) {
          util.debug('REQ ERROR: '+JSON.stringify(error))
          util.debug('REQ TOKEN: '+JSON.stringify(token))
          //cache.token = token
        })
      })

      expapp.get('/social/linkedin/callback', function (req, res) {
        util.debug(req.url)
        util.debug(JSON.stringify(req.headers))

        social.linkedin.client.getAccessToken(req, res, function (error, token) {
          util.debug('ACC ERROR: '+JSON.stringify(error))
          util.debug('ACC TOKEN: '+JSON.stringify(token))

          social.linkedin.client.apiCall('GET','/people/~:(id,first-name,last-name,public-profile-url)',{token:token},function(err,lout){
            util.debug(JSON.stringify(err))
            util.debug(JSON.stringify(lout))

            function launch() {
              cookies = new Cookies( req, res )
              var chatid = cookies.get('stanzr-chat')
              cookies.set('stanzr-chat',null)
              util.debug(chatid)

              chatid = chatid || 'member'

              res.writeHead( 301, {
                'Location':"/"+chatid
              })
              res.end()
            }


            function login(user,cb) {
                seneca.act(
                  {
                    tenant:'stanzr',
                    on:'user',
                    cmd:'login',
                    nick:user.nick,
                    email:user.email,
                    auto:true
                  }, 
                  function(err,out){
                    if(err) {
                      util.debug('err:'+JSON.stringify(err))
                    }
                    else {
                      cookies = new Cookies( req, res )
                      cookies.set('stanzr',out.login.token,{expires:new Date( new Date().getTime()+(30*24*3600*1000) )})
                      cb()
                    }
                  }
                )
            }
            
            var userent = seneca.make('stanzr','sys','user')
            userent.load$({linkedin_id:lout.id},function(err,user){
              if(err) {
                util.debug('err:'+JSON.stringify(err))
              }

              // user exists, auto login
              else if( user ) {
                login(user,launch)
              }

              // new user, register and login
              else { 
                var username = lout['public-profile-url'].substring(27)
                userent.load$({nick:username},function(err,existing){
                  if(err) {
                    util.debug('err:'+JSON.stringify(err))
                  }
                  else if(!existing) {
                    seneca.act(
                      {
                        tenant:'stanzr',
                        on:'user',
                        cmd:'register',
                        nick:username,
                        password:uuid(),
                        active:true
                      }, 
                      function(err,out){
                        if(err) {
                          util.debug('err:'+JSON.stringify(err))
                        }
                        else {
                          out.user.linkedin_id = lout.id
                          out.user.save$(function(err,out){
                            if(err) {
                              util.debug('err:'+JSON.stringify(err))
                            }
                            else {
                              login(out,launch)
                            }
                          })
                        }
                      }
                    )
                  }
                  else {
                    login(existing,launch)
                  }
                })
              }
            })








          })
        })


      })
    }
  }
}





exports.init = function(expapp,pseneca) {
  seneca = pseneca

  social.linkedin.initclient(conf)
  social.linkedin.initapp(expapp)
}