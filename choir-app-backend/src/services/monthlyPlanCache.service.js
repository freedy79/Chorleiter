const NodeCache = require('node-cache');
const db = require('../models');

const ttlEnv = parseInt(process.env.MONTHLY_PLAN_CACHE_TTL ?? '60', 10);
const disabledFlag = String(process.env.MONTHLY_PLAN_CACHE_DISABLED || '').toLowerCase();
const ttl = Number.isFinite(ttlEnv) ? ttlEnv : 60;
const cacheEnabled = !['1', 'true', 'yes'].includes(disabledFlag) && ttl > 0;

let cache = null;
if (cacheEnabled) {
    cache = new NodeCache({ stdTTL: ttl, checkperiod: Math.max(ttl, 60) });
}

function cacheKey(choirId, year, month) {
    return `${choirId}:${year}:${month}`;
}

async function getMonthlyPlanWithCache(choirId, year, month, loader) {
    if (!cacheEnabled) {
        return loader();
    }

    const key = cacheKey(choirId, year, month);
    if (cache.has(key)) {
        return cache.get(key);
    }

    const plan = await loader();
    cache.set(key, plan ?? null);
    return plan;
}

function invalidateMonthlyPlanCache(choirId, year, month) {
    if (!cacheEnabled) return;
    cache.del(cacheKey(choirId, year, month));
}

async function invalidateMonthlyPlanCacheById(monthlyPlanId) {
    if (!cacheEnabled || !monthlyPlanId) return;
    const plan = await db.monthly_plan.findByPk(monthlyPlanId, {
        attributes: ['choirId', 'year', 'month']
    });
    if (plan) {
        invalidateMonthlyPlanCache(plan.choirId, plan.year, plan.month);
    }
}

function isMonthlyPlanCacheEnabled() {
    return cacheEnabled;
}

module.exports = {
    getMonthlyPlanWithCache,
    invalidateMonthlyPlanCache,
    invalidateMonthlyPlanCacheById,
    isMonthlyPlanCacheEnabled,
    ttl
};
