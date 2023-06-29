/* eslint-disable camelcase */
const OneSignal = require('onesignal-node');

const config = require('../config/index');
const logger = require('../utils/logger');

const client = new OneSignal.Client(config.onesignal.id, config.onesignal.key);
class CustomNotification {
  constructor({
    includedSegments, contents, includePlayerIds, filters, web_url,
  }) {
    this.id = '';
    this.client = client;
    this.notification = {
      contents,
    };
    if (includedSegments) {
      this.notification.included_segments = includedSegments;
    } else if (includePlayerIds) {
      this.notification.include_player_ids = includePlayerIds;
    }

    if (filters) {
      this.notification.filters = filters;
    }
    if (web_url) {
      this.notification.web_url = web_url;
    }
  }

  async create() {
    let data = null;
    try {
      data = await this.client.createNotification(this.notification);
    } catch (e) {
      if (e instanceof OneSignal.HTTPError) {
        logger.info(JSON.stringify(e));
      }
    }
    return data;
  }
}

module.exports = CustomNotification;
