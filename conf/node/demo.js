
module.exports = {
  conf: {
    env:'demo',
    mongo: {
      main: {
        server:'flame.mongohq.com',
        port:27044,
        name:'stanzrdemo',
        username:'demo',
        password:'S2QP11CC'
      }
    },
    keys: {
      linkedin: {
        key:'JIvFtpTOzqLNNfc2-DwH4g47p-EZAdlxvS8jORnLL7HbtoTeFaqqSZ6MEZIjUKJZ',
        secret:'73BIQurFiKIkMvzIBWw4zAh8Moh2tjafRM-xM3PQ3IcMWbZb3rzn8BNx1zCL49YG',
      },
      twitter: {
        key:'QQfcRCUXyQVPfQqrzw19Q',
        secret:'dzJujZo6jUMExSAWa3qkcQjJwyVAb06QP9veL05nw'
      },
      facebook: {
        key:'0190c50506a037b02a70fb5beafd6c54',
        secret:'cd7aaec2cfeb61335cc2274c007a2329',
      }
    }
  }
}