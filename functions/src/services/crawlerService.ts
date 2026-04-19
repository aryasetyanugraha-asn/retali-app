import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import * as cheerio from "cheerio";
import axios from "axios";

export interface MarketInsight {
  title: string;
  source_url: string;
  publish_date: admin.firestore.Timestamp | null;
  content_snippet: string;
  platform: string;
  createdAt: admin.firestore.FieldValue;
}

export async function crawlWebsites(db: admin.firestore.Firestore): Promise<void> {
  const websites = [
    {
      name: "Kemenag",
      url: "https://kemenag.go.id/nasional",
      // These selectors might need adjusting based on the actual HTML structure
      articleSelector: ".post-item",
      titleSelector: ".post-title a",
      linkSelector: ".post-title a",
      dateSelector: ".post-date",
      snippetSelector: ".post-excerpt",
    },
    // We can add more websites here like Detik Travel etc.
  ];

  for (const site of websites) {
    logger.info(`Starting crawl for ${site.name}`);
    try {
      const response = await axios.get(site.url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 15000 // 15 seconds timeout
      });
      const html = response.data;
      const $ = cheerio.load(html);

      const articles: MarketInsight[] = [];

      $(site.articleSelector).each((i: number, element: any) => {
        // Just take the first 5 articles to start
        if (i >= 5) return;

        const title = $(element).find(site.titleSelector).text().trim();
        let link = $(element).find(site.linkSelector).attr("href");
        const dateStr = $(element).find(site.dateSelector).text().trim();
        const snippet = $(element).find(site.snippetSelector).text().trim();

        if (title && link) {
            // resolve relative URLs
            if (!link.startsWith('http')) {
                const urlObj = new URL(site.url);
                link = `${urlObj.origin}${link.startsWith('/') ? '' : '/'}${link}`;
            }

            // Simple date parsing, might need more robust handling
            let publishDate = null;
            try {
                 if (dateStr) {
                     // Try to parse the date, or just use null if it fails
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
                content_snippet: snippet || title,
                platform: "WEBSITE",
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
      });

      logger.info(`Found ${articles.length} articles from ${site.name}`);

      // Save to Firestore
      if (articles.length > 0) {
        const batch = db.batch();
        const insightsRef = db.collection("market_insights");

        // We probably want to check if the URL already exists to avoid duplicates
        for (const article of articles) {
            // Query to check if the article already exists by source_url
            const existingQuery = await insightsRef.where("source_url", "==", article.source_url).limit(1).get();

            if (existingQuery.empty) {
                 const docRef = insightsRef.doc();
                 batch.set(docRef, article);
            } else {
                 logger.info(`Article already exists, skipping: ${article.source_url}`);
            }
        }

        await batch.commit();
        logger.info(`Saved new articles from ${site.name} to Firestore.`);
      }

    } catch (error: any) {
      logger.error(`Error crawling ${site.name}:`, error.message);
    }
  }
}
