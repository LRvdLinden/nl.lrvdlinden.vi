'use strict';
const Homey = require('homey');
const Parser = require('rss-parser');

class viApp extends Homey.App {
    log() {
        console.log.bind(this, '[log]').apply(this, arguments);
    }

    error() {
        console.error.bind(this, '[error]').apply(this, arguments);
    }

    // -------------------- INIT ----------------------

    onInit() {
        this.log(`[onInit] ${this.homey.manifest.id} - ${this.homey.manifest.version} started...`);

        this.triggerNewArticle = this.homey.flow.getTriggerCard('new_article');
 

        this.receivedArticleLink = null;
        this.receivedVideoUrls = new Set(); // Een Set om de ontvangen videolinks bij te houden

        this.checkInterval = 5 * 60 * 1000; // 5 minutes
        this.parser = new Parser();
        this.feedUrl = 'https://www.vi.nl/feed/nieuws';
        this.parser = new Parser({
            customFields: {
                item: [
                    ["media:thumbnail", "thumbnail"]
                  ]
            }
          });
        
        setInterval(async () => {
            this.checkRssFeed();
        }, this.checkInterval);

        this.checkRssFeed();
    }

    async checkRssFeed() {
        try {
            const feed = await this.parser.parseURL(this.feedUrl);

            if (feed && feed.items && feed.items.length) {
                let [latestItem] = feed.items;

                if (latestItem.title && (latestItem.title.includes('RTL Nieuws') || latestItem.title.includes('RTL Weer'))) {
                    this.log(`[checkRssFeed] - skip latestItem due to containing RTL in title:`, latestItem.title);
                    [, latestItem] = feed.items;
                }

                this.log(`[checkRssFeed] - got latestItem:`, latestItem);
                const { title, link, content, pubDate, thumbnail } = latestItem;
                const imageUrl = thumbnail && thumbnail.$ && thumbnail.$.url || "";
                const data = {
                    title,
                    link,
                    content,
                    pubDate,
                    imageUrl
                };
                
                this.log(`[checkRssFeed] - trigger new article Data:`, data);

                // Check if the new article has a different pubDate from the last triggered article
                if (pubDate !== this.lastTriggeredPubDate) {
                    this.log(`[checkRssFeed] - trigger new article Data:`, data);
                    this.triggerNewArticle.trigger(data).catch((err) => this.error('[checkRssFeed] - Error in triggerNewArticle', err));

                    // Update the lastTriggeredPubDate with the current pubDate
                    this.lastTriggeredPubDate = pubDate;
                } else {
                    this.log(`[checkRssFeed] - Article already triggered, skipping...`);
                }
            }


        } catch (err) {
            this.error(`[checkRssFeed] - Error in retrieving RSS-feed:`, err);
        }
    }
}

module.exports = viApp;
