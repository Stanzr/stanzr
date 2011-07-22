var common = require('./common')

var util     = common.util
var uuid     = common.uuid
var postmark = common.postmark

var conf    = common.conf



function Emailer() {
  var self = this

  self.postmark = postmark(conf.keys.postmark.key)

  self.send = function( spec, cb ) {
    var pmspec = {
      "From": conf.keys.postmark.sender, 
      "To": spec.to, 
      "Subject": spec.subject, 
      "TextBody": spec.text,
      "ReplyTo":"no-reply@stanzr.com",
      "Tag": spec.code
    }

    try {
      self.postmark.send( pmspec )
      cb(null)
    }
    catch( e ) {
      cb(e)
    }
  }




  self.insert = function(fields,text) {
    for( var f in fields ) {
      var uf = f.toUpperCase()

      var re = new RegExp('%'+uf+'%','g')

      text = text.replace(re,fields[f])
    }
    
    return text
  }
  
}



exports.Emailer = Emailer


var procname = process.argv[1]
if( /email\.js$/.test( procname) ) {

  var emailer = new Emailer()

  //console.log( emailer.insert({foo:'111',bar:'222'},'my %FOO% %FOO% is %BAR%') )

  

  return

  emailer.send({
    to:'richard@chartaca.com',
    subject:'test01',
    text:'t01',
    code:'test'
  },function(err){
    console.dir(err)
  })
}