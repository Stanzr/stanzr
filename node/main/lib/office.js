
var office = {
  months:['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  chat:{}
}

office.chat.makepublishalias = function( chat ) {
  var tag = chat.vanity || chat.hashtag || chat.chatid
  var when = chat.when ? ''+chat.when.getFullYear()+'-'+office.months[chat.when.getMonth()]+'-'+chat.when.getDate() : chat.whenstr;
  var desc = chat.topics && chat.topics[0] && chat.topics[0].title

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