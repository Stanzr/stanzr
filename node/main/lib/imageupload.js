/*
Copyright (c) 2011 Richard Rodger

BSD License
-----------

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

1. Redistributions of source code must retain the above copyright
notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright
notice, this list of conditions and the following disclaimer in the
documentation and/or other materials provided with the distribution.

3. The names of the copyright holders and contributors may not be used
to endorse or promote products derived from this software without
specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE
*/

var common = require('./common')

var fs    = common.fs

var connect = common.connect
var knox    = common.knox
var util    = common.util
var uuid    = common.uuid
var form    = common.form


var conf    = common.conf


var spacer = new Array(3048).join(' ')
var percent = function() {}

function reserr(res,desc) {
  res.end('<script>;'+conf.error+'(done,100,'+JSON.stringify(desc)+');</script>')
}


exports.service = function( conf ) {

  percent = function(res,pc,info) {
    var s = '<script>;'+conf.callback+'(false,'+pc+','+JSON.stringify(info)+');</script>'
    res.write(s)
  }


  return function(req, res, next){
    //console.log('========================= '+req.url+' '+conf.uploadpath.length)

    if( 0 == req.url.indexOf(conf.uploadpath) ) {
      var info = {tag:req.url.substring(5+conf.uploadpath.length)}
      console.dir(info)

      var max = 10240

      res.writeHead(200,{'Content-Type':'text/html','Content-Length':max})
      res.write(spacer)
      res.write('<html><head></head><body>')

      percent(res,1,info)

      req.form.on('progress', function(bytesReceived, bytesExpected){
        var pc = Math.max(1,(bytesReceived / bytesExpected * 50) | 0);
        percent(res,pc,info)
      })

      req.form.complete(function(err, fields, files){
        if( err ) return err.tag = info.tag, reserr(res,err);

        console.log('\nuploaded %s to %s',files.image.filename,files.image.path);
        var s3name = files.image.path.substring(files.image.path.lastIndexOf('/')+1)

        s3upload(res,tag,files.image.path,s3name,conf.s3folder,conf.s3bucket,function(out) {
          if( 200 == out.statusCode ) {
            info.url = 'http://'+conf.s3bucket+conf.s3folder+'/'+s3name
            var s = '<script>'+conf.callback+'(true,100,'+JSON.stringify(info)+')</script></body></html>'
            console.log(s)
            var pad = new Array(max).join(' ')
            res.end(s+pad)
          }
          else {
            err.tag = info.tag
            reserr(res,out)
          }
        })
      })

    }
    else {
      next()
    }
  }
} 



function s3upload(res,tag,filepath,s3name,s3folder,s3bucket,cb) {

  var s3client = knox.createClient({
    key:    conf.keys.amazon.key,
    secret: conf.keys.amazon.secret,
    bucket: 'c1.stanzr.com',
  })


  fs.stat(filepath, function(err, stat){
    if (err) return err.tag = tag, reserr(res,err);

    var filesize = stat.size
    var instream = fs.createReadStream(filepath)

    var s3req = s3client.put( s3folder+'/'+s3name, {
      'Content-Length':filesize,
      'x-amz-acl': 'public-read'
    })

    instream.on('data',function(chunk){
      console.log('sending: '+chunk.length)
      s3req.write(chunk)
      percent(res,50+Math.floor(chunk.length/filesize),{tag:tag})
    })

    instream.on('end',function(){
      s3req.end()
      console.log('waiting for amazon...')
    })

    s3req.on('error',function(err){
      console.log('error: '+err)
      err.tag = tag
      reserr(res,err)
    })

    s3req.on('response',function(res){
      console.log('response: '+res.statusCode)
      cb(res)
    })
  })
}

