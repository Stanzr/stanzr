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
  res.end('<script>'+conf.error+'('+JSON.stringify(desc)+')</script>')
}


exports.service = function( conf ) {

  percent = function(res,pc) {
    var s = '<script>'+conf.callback+'(false,'+pc+')</script>'
    res.write(s)
  }


  return function(req, res, next){
    if( conf.uploadpath === req.url ) {
      var max = 10240

      res.writeHead(200,{'Content-Type':'text/html','Content-Length':max})
      res.write(spacer)
      res.write('<html><head></head><body>')

      percent(res,1)

      req.form.on('progress', function(bytesReceived, bytesExpected){
        var pc = Math.max(1,(bytesReceived / bytesExpected * 50) | 0);
        percent(res,pc)
      })

      req.form.complete(function(err, fields, files){
        if( err ) return reserr(res,err);

        console.log('\nuploaded %s to %s',files.image.filename,files.image.path);
        var s3name = files.image.path.substring(files.image.path.lastIndexOf('/')+1)

        s3upload(res,files.image.path,s3name,conf.s3folder,conf.s3bucket,function(out) {
          if( 200 == out.statusCode ) {
            var info = {url:'http://'+conf.s3bucket+conf.s3folder+'/'+s3name}
            var s = '<script>'+conf.callback+'(true,100,'+JSON.stringify(info)+')</script></body></html>'
            var pad = new Array(max).join(' ')
            res.end(s+pad)
          }
          else {
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



function s3upload(res,filepath,s3name,s3folder,s3bucket,cb) {

  var s3client = knox.createClient({
    key:    conf.keys.amazon.key,
    secret: conf.keys.amazon.secret,
    bucket: 'c1.stanzr.com',
  })


  fs.stat(filepath, function(err, stat){
    if (err) return reserr(res,err);

    var filesize = stat.size
    var instream = fs.createReadStream(filepath)

    var s3req = s3client.put( s3folder+'/'+s3name, {
      'Content-Length':filesize,
      'x-amz-acl': 'public-read'
    })

    instream.on('data',function(chunk){
      console.log('sending: '+chunk.length)
      s3req.write(chunk)
      percent(res,50+Math.floor(chunk.length/filesize))
    })

    instream.on('end',function(){
      s3req.end()
      console.log('waiting for amazon...')
    })

    s3req.on('error',function(err){
      console.log('error: '+err)
      reserr(res,err)
    })

    s3req.on('response',function(res){
      console.log('response: '+res.statusCode)
      cb(res)
    })
  })
}


/*


      s3req.on('error',function(err){
        util.debug('error: '+err)
      })

      s3req.on('response',function(res){
        util.debug('response: '+res.statusCode)

        res.on('data',function(chunk){
          util.debug(chunk)
        })
      })

      var remain = ''

      req.on('data', function(chunk) {
        var ascii = remain + chunk.toString('ascii')
        var bslen = bs * Math.floor( ascii.length / bs )

        var base64     = ascii.substring(0,bslen)
        var binary     = new Buffer(base64,'base64')
        var newremain  = ascii.substring(bslen)

        util.debug('in='+ascii.length+' out='+binary.length )
        bytes+=binary.length

        remain = newremain
        s3req.write(binary)
      });
    
      req.on('end', function() {
        if( 0 < remain.length ) {
          var binary = new Buffer(remain,'base64')
          bytes+=binary.length
          s3req.write(binary)
        }
        s3req.end()

        util.debug('bytes:'+bytes)
        util.debug('upload end')

        res.writeHead(200, "OK", {'Content-Type': 'application/json'});
        res.end( JSON.stringify({ok:true,picid:picid}) )
      });

}



/*


var bs = 48

var server = connect.createServer(
  connect.router(function(app){
 
    app.post('/lifestream/api/upload',function(req,res) {
      util.debug('upload start')
      var bytes = 0
      
      var s3client = knox.createClient({
        key:    keys.amazon.keyid,
        secret: keys.amazon.secret,
        bucket: 'YOUR_S3_BUCKET',
      })

      var conlen   = parseInt( req.headers['content-length'], 10 )
      var padding  = parseInt( req.headers['x-lifestream-padding'], 10 ) 
      var bytelen = Math.floor( ((conlen-padding)*3)/4 )
      util.debug('bytelen:'+bytelen)

      var picid = uuid()

      var s3req = s3client.put(
        picid+'.jpg',
        {
          'Content-Length':bytelen,
          'x-amz-acl': 'public-read'
        }
      )

      s3req.on('error',function(err){
        util.debug('error: '+err)
      })

      s3req.on('response',function(res){
        util.debug('response: '+res.statusCode)

        res.on('data',function(chunk){
          util.debug(chunk)
        })
      })

      var remain = ''

      req.on('data', function(chunk) {
        var ascii = remain + chunk.toString('ascii')
        var bslen = bs * Math.floor( ascii.length / bs )

        var base64     = ascii.substring(0,bslen)
        var binary     = new Buffer(base64,'base64')
        var newremain  = ascii.substring(bslen)

        util.debug('in='+ascii.length+' out='+binary.length )
        bytes+=binary.length

        remain = newremain
        s3req.write(binary)
      });
    
      req.on('end', function() {
        if( 0 < remain.length ) {
          var binary = new Buffer(remain,'base64')
          bytes+=binary.length
          s3req.write(binary)
        }
        s3req.end()

        util.debug('bytes:'+bytes)
        util.debug('upload end')

        res.writeHead(200, "OK", {'Content-Type': 'application/json'});
        res.end( JSON.stringify({ok:true,picid:picid}) )
      });

    })
  }),
  connect.static('../public')
)

server.listen(3009)


var express = require('../../lib/express')
  , form = require('connect-form');

var app = express.createServer(
  // connect-form (http://github.com/visionmedia/connect-form)
  // middleware uses the formidable middleware to parse urlencoded
  // and multipart form data
  form({ keepExtensions: true })
);

app.get('/', function(req, res){
  res.send('<form method="post" enctype="multipart/form-data">'
    + '<p>Image: <input type="file" name="image" /></p>'
    + '<p><input type="submit" value="Upload" /></p>'
    + '</form>');
});

app.post('/', function(req, res, next){

  // connect-form adds the req.form object
  // we can (optionally) define onComplete, passing
  // the exception (if any) fields parsed, and files parsed
  req.form.complete(function(err, fields, files){
    if (err) {
      next(err);
    } else {
      console.log('\nuploaded %s to %s'
        ,  files.image.filename
        , files.image.path);
      res.redirect('back');
    }
  });

  // We can add listeners for several form
  // events such as "progress"
  req.form.on('progress', function(bytesReceived, bytesExpected){
    var percent = (bytesReceived / bytesExpected * 100) | 0;
    process.stdout.write('Uploading: %' + percent + '\r');
  });
});

app.listen(3000);
console.log('Express app started on port 3000');


*/

