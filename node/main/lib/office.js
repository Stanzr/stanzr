
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

module.exports  = office