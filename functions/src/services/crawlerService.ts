import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import Parser from "rss-parser";

export interface MarketInsight {
  title: string;
  source_url: string;
  publish_date: admin.firestore.Timestamp | null;
  content_snippet: string;
  platform: string;
  createdAt: admin.firestore.FieldValue;
}

export async function crawlWebsites(db: admin.firestore.Firestore): Promise<void> {
  const parser = new Parser();
  const rssUrl = "https://news.google.com/rss/search?q=umrah+OR+haji+when:7d&hl=id&gl=ID&ceid=ID:id";

  logger.info(`Starting RSS crawl from ${rssUrl}`);
  try {
    const feed = await parser.parseURL(rssUrl);
    const articles: MarketInsight[] = [];

    // Process a reasonable number of items from the feed
    for (let i = 0; i < feed.items.length; i++) {
      if (i >= 15) break;

      const item = feed.items[i];
      const title = item.title || "";
      const link = item.link || "";
      const dateStr = item.pubDate;
      const snippet = item.contentSnippet || item.content || title;

      if (title && link) {
        let publishDate = null;
        try {
          if (dateStr) {
            const parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate.getTime())) {
              publishDate = admin.firestore.Timestamp.fromDate(parsedDate);
            }
          }
        } catch (e) {
          // ignore date parse errors
        }

        articles.push({
          title,
          source_url: link,
          publish_date: publishDate,
          content_snippet: snippet,
          platform: "GOOGLE_NEWS",
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    logger.info(`Found ${articles.length} articles from Google News RSS`);

    if (articles.length > 0) {
      const batch = db.batch();
      const insightsRef = db.collection("market_insights");

      for (const article of articles) {
        const existingQuery = await insightsRef.where("source_url", "==", article.source_url).limit(1).get();

        if (existingQuery.empty) {
          const docRef = insightsRef.doc();
          batch.set(docRef, article);
        } else {
          logger.info(`Article already exists, skipping: ${article.source_url}`);
        }
      }

      await batch.commit();
      logger.info(`Saved new articles from Google News RSS to Firestore.`);
    }

  } catch (error: any) {
    logger.error(`Error crawling Google News RSS:`, error.message);
  }
}
