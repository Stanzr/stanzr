
var office = {
  chat:{}
}

office.chat.makepublishalias = function( tag, when, desc ) {
  tag  = tag.replace(/\W/g,'-')
  when = when.replace(/\W/g,'-')
  desc = desc.replace(/\W/g,'-')
  var alias = tag + '-' + when + '-' + desc
  alias = alias.replace(/-+/g,'-')
  return alias
}

office.zpad = function(str,width) {
  str = ''+str
  width = width || 2
  while( str.length < width ) {
    str = '0'+str
  }
  return str
}

module.exports  = office