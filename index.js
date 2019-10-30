
function main (event, context) {
  const axios = require('axios')
  const whois = require('whois-json')
  const moment = require('moment')
  require('moment-timezone')

  // Env config
  require('dotenv').config({ path: '.env' })
  const fs = require('fs')

  // Database :p
  const rawData = fs.readFileSync(`${__dirname}/domains.json`)
  const domains = (JSON.parse(rawData)).domains
  /**
   * Fetch information
   */
  const fetchDomainExpiration = async domain => {
    const today = new Date()
    const results = await whois(domain)
    const { url, registrarUrl, creationDate, createdOn, expirationDate, registrarRegistrationExpirationDate } = results

    const provider = url || registrarUrl || 'Undefined'
    const created = creationDate || createdOn || 'Undefined'
    const expired = expirationDate || registrarRegistrationExpirationDate || today

    // get moment instance of remaining time
    const remaining = moment(expired).tz('America/Mexico_City').fromNow()
    const isExpired = remaining.includes('ago')
    const alert_month = remaining.includes('in a month')
    const alert_week = remaining.includes('days')
    return { domain, provider, created, expired, remaining, isExpired, alert_month, alert_week }
  }

  /**
   * Message format Slack
   * @param {String} url domain url
   * @param {String} expiration Data time expiration
   * @param {String} nameserver Name server
   */
  const message = (domain, expire, expried, expire_in_month, expire_in_week) => {
    const icon = (expried || expire_in_month || expire_in_week) ? ':fire:' : ':white_check_mark:'
    return {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": `Fecha: _${moment(expire).format('DD-MM-YYYY')}_ | Dominio: [${domain}] : ${icon}`
      }
    }
  }

  const slackSend = format => {
    axios.post(process.env.SLACK_HOOK, format)
      .then(res => console.log(res.status))
      .catch(err => console.log(err))
  }

  Promise.all(domains.map(domain => fetchDomainExpiration(domain)))
    .then(data => {
      const template = { "blocks": [] }
      const header = [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "Reporte de estatus de dominios"
          }
        },
        {
          "type": "section",
          "fields": [
            {
              "type": "mrkdwn",
              "text": `*Reporte el: ${moment().format('DD MM YYYY')}*`
            }
          ]
        }
      ]

      const messages = data.map(report => message(report.domain, report.expired, report.isExpired, report.alert_month, report.alert_week))
      const report = header.concat(messages)
      // setup message
      template.blocks = report

      slackSend(template)
    })
}

main()