
module.exports = {
  conf: {
    env:'demo',
    hosturl:'http://stanzr.com',
    tweetsearch:true,
    accesslog:'/var/log/stanzr/access.log',
    web: {
      port: 80
    },
    mongo: {
      main: {
        server:'rose.mongohq.com',
        port:10033,
        name:'stanzrlive',
        username:'stanzrlive',
        password:'WDcc4tt1zw'
      },
      log: {
        server:'flame.mongohq.com',
        port:27059,
        name:'stanzr01',
        username:'design',
        password:'w1ckl0w1'
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
      },
      postmark: {
        key:'5a3d643a-1803-47e9-9517-ffda1e18c308',
        sender:'taariq@stanzr.com'
      }
    }
  }
}