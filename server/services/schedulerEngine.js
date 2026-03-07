const cron = require("node-cron");
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const startScheduler = () => {
  console.log("[Scheduler] Starting cron jobs...");

  cron.schedule("0 * * * *", async () => {
    try {
      const result = await pool.query(
        `SELECT id FROM content_jobs WHERE status = "scheduled" AND scheduled_at <= NOW() LIMIT 20`
      );
      for (const job of result.rows) {
        await pool.query(`UPDATE content_jobs SET status = "processing" WHERE id = $1`, [job.id]);
      }
      if (result.rows.length > 0) console.log(`[Scheduler] Processed ${result.rows.length} jobs`);
    } catch (err) { console.error("[Scheduler] Hourly error:", err.message); }
  });

  cron.schedule("0 3 * * *", async () => {
    try {
      await pool.query(`DELETE FROM content_jobs WHERE status = "completed" AND created_at < NOW() - INTERVAL "30 days"`);
      await pool.query(`UPDATE influencers SET status = "deleted" WHERE status = "suspended" AND suspended_at < NOW() - INTERVAL "30 days"`);
      console.log("[Scheduler] Daily cleanup done");
    } catch (err) { console.error("[Scheduler] Cleanup error:", err.message); }
  });

  console.log("[Scheduler] All cron jobs registered");
};

module.exports = { startScheduler };
