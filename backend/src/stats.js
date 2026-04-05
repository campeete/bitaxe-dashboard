const axios = require('axios');
const { getDb } = require('./db');

// Current Bitcoin network hashrate from public API (mempool.space)
async function getNetworkHashrate() {
  try {
    const res = await axios.get('https://mempool.space/api/v1/mining/hashrate/3d', { timeout: 8000 });
    // returns array of { timestamp, avgHashrate } in H/s
    const latest = res.data.hashrates?.slice(-1)[0];
    if (latest) return latest.avgHashrate / 1e18; // convert to EH/s
  } catch (e) {
    console.warn('Could not fetch network hashrate, using fallback');
  }
  return 700; // fallback EH/s — update manually if API is down
}

// Current BTC price
async function getBtcPrice() {
  try {
    const res = await axios.get('https://mempool.space/api/v1/prices', { timeout: 5000 });
    return res.data.USD || parseFloat(process.env.BTC_PRICE_USD);
  } catch (e) {
    return parseFloat(process.env.BTC_PRICE_USD) || 96000;
  }
}

// Probability of finding at least one block in `days` days
// P = 1 - (1 - yourHashrate/networkHashrate)^(144 * days)
// 144 = avg blocks per day
function blockHitProbability(ourHashrateGhs, networkHashrateEhs, days) {
  const networkGhs = networkHashrateEhs * 1e9;
  const perBlockProb = ourHashrateGhs / networkGhs;
  const trials = 144 * days;
  const pNoHit = Math.pow(1 - perBlockProb, trials);
  return ((1 - pNoHit) * 100).toFixed(2);
}

// Estimated daily BTC earnings in pool mode
// dailyBTC = (ourHashrate / networkHashrate) * 144 * blockReward
function estimatedDailyBtc(ourHashrateGhs, networkHashrateEhs) {
  const networkGhs = networkHashrateEhs * 1e9;
  const blockReward = parseFloat(process.env.BLOCK_REWARD_BTC) || 3.125;
  return (ourHashrateGhs / networkGhs) * 144 * blockReward;
}

// Compute and store totals snapshot
async function updateTotals(totalHashrateGhs) {
  const db = getDb();
  const [networkEhs, btcPrice] = await Promise.all([getNetworkHashrate(), getBtcPrice()]);

  const prob30  = blockHitProbability(totalHashrateGhs, networkEhs, 30);
  const prob365 = blockHitProbability(totalHashrateGhs, networkEhs, 365);
  const dailyBtc = estimatedDailyBtc(totalHashrateGhs, networkEhs);

  db.prepare(`
    INSERT INTO totals (updated_at, block_hit_prob_30d, block_hit_prob_1yr, network_hashrate_eh, btc_price_usd)
    VALUES (?, ?, ?, ?, ?)
  `).run(Date.now(), prob30, prob365, networkEhs, btcPrice);

  return { prob30, prob365, dailyBtc, dailyUsd: dailyBtc * btcPrice, networkEhs, btcPrice };
}

// Get cumulative estimated earnings since first snapshot
function getCumulativeEarnings() {
  const db = getDb();
  const row = db.prepare(`
    SELECT SUM(estimated_btc) as total_btc, SUM(estimated_usd) as total_usd
    FROM daily_stats
  `).get();
  return row || { total_btc: 0, total_usd: 0 };
}

module.exports = { updateTotals, getCumulativeEarnings, blockHitProbability, estimatedDailyBtc, getBtcPrice };
