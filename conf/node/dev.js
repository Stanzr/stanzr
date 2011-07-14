
module.exports = {
  conf: {
    env:'dev',
    hosturl:'http://stanzr.test',
    tweetsearch:true,
    web:{
      port:80
    },
    mongo: {
      main: {
        server:'localhost',
        port:27017,
        name:'stanzrdev'
      }
    },
    keys: {
      linkedin: {
        key:'JIvFtpTOzqLNNfc2-DwH4g47p-EZAdlxvS8jORnLL7HbtoTeFaqqSZ6MEZIjUKJZ',
        secret:'73BIQurFiKIkMvzIBWw4zAh8Moh2tjafRM-xM3PQ3IcMWbZb3rzn8BNx1zCL49YG',
      },
      twitter: {
        key:'QQfcRCUXyQVPfQqrzw19Q',
        secret:'dzJujZo6jUMExSAWa3qkcQjJwyVAb06QP9veL05nw',
        token: {
          key: '286375722-ArBDn9KfpYa3MAXxL9bN49BeWDv3nkQp6H4Btuzo',
          secret: 'GGCNKmiYsnkQ6T3iIDYVaWbsFaJM2wZ2nU8R5ZT4Z0w' 
        }
      },
      facebook: {
        key:'0190c50506a037b02a70fb5beafd6c54',
        secret:'cd7aaec2cfeb61335cc2274c007a2329',
      },
      amazon: {
        key: 'AKIAILYJ4OHQKFQHZAVQ',
        secret: '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'
      }
    }
  }
}