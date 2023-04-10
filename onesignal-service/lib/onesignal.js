const OneSignal = require('onesignal-node');

const config = require('../../notify-service/config/index');
const logger = require('../../notify-service/utils/logger/index');

const client = new OneSignal.Client(config.onesignal.id, config.onesignal.key);

class CustomNotification {
  constructor({
    includedSegments, contents, includePlayerIds, filters,
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
  }

  async create() {
    let data = null;
    try {
      data = await this.client.createNotification(this.notification);
      logger.info(`notify: ${JSON.stringify(data)}`);
    } catch (e) {
      if (e instanceof OneSignal.HTTPError) {
        logger.info(JSON.stringify(e));
      }
    }
    return data;
  }
}

module.exports = CustomNotification;
