const https = require('https');
const querystring = require('querystring');
const logger = require('../config/logger');
const db = require('../models');
const paypalSettingsService = require('../services/paypal-settings.service');

const { Op } = db.Sequelize;

/**
 * Verify PayPal Payment Data Transfer (PDT) token
 * This is called when a user returns from PayPal with a tx (transaction) token
 */
exports.verifyPDT = async (req, res) => {
    try {
        const { tx } = req.query;

        if (!tx) {
            return res.status(400).send({ message: 'No transaction token provided' });
        }

        // Get PDT token from database
        const pdtToken = await paypalSettingsService.getPDTToken();

        if (!pdtToken) {
            logger.warn('PayPal PDT token not configured');
            return res.status(500).send({
                message: 'PayPal PDT not configured. Please configure it in Admin Settings.',
                configured: false
            });
        }

        // Get PayPal mode (sandbox or live)
        const mode = await paypalSettingsService.getPayPalMode();

        // Prepare the verification request to PayPal
        const postData = querystring.stringify({
            cmd: '_notify-synch',
            tx: tx,
            at: pdtToken
        });

        // Determine PayPal URL (sandbox vs production)
        const isProduction = mode === 'live';
        const paypalHost = isProduction ? 'www.paypal.com' : 'www.sandbox.paypal.com';

        const options = {
            hostname: paypalHost,
            port: 443,
            path: '/cgi-bin/webscr',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        // Make request to PayPal
        const paypalRequest = https.request(options, (paypalResponse) => {
            let data = '';

            paypalResponse.on('data', (chunk) => {
                data += chunk;
            });

            paypalResponse.on('end', () => {
                const lines = data.split('\n');
                const status = lines[0];

                if (status === 'SUCCESS') {
                    // Parse the response
                    const details = {};
                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i];
                        const equalPos = line.indexOf('=');
                        if (equalPos > 0) {
                            const key = line.substring(0, equalPos);
                            const value = decodeURIComponent(line.substring(equalPos + 1));
                            details[key] = value;
                        }
                    }

                    logger.info('PayPal PDT verification successful', {
                        tx,
                        amount: details.mc_gross,
                        email: details.payer_email
                    });

                    // Return the transaction details
                    res.status(200).send({
                        success: true,
                        verified: true,
                        transactionId: tx,
                        amount: parseFloat(details.mc_gross) || 0,
                        currency: details.mc_currency || 'EUR',
                        payerEmail: details.payer_email,
                        payerName: details.first_name && details.last_name
                            ? `${details.first_name} ${details.last_name}`
                            : details.payer_email,
                        paymentDate: details.payment_date,
                        paymentStatus: details.payment_status,
                        details: details
                    });
                } else {
                    logger.warn('PayPal PDT verification failed', { tx, status, response: data });
                    res.status(400).send({
                        success: false,
                        verified: false,
                        message: 'Transaction verification failed',
                        status: status
                    });
                }
            });
        });

        paypalRequest.on('error', (error) => {
            logger.error('PayPal PDT request error', { error: error.message, tx });
            res.status(500).send({
                success: false,
                message: 'Error communicating with PayPal',
                error: error.message
            });
        });

        paypalRequest.write(postData);
        paypalRequest.end();

    } catch (err) {
        logger.error('PayPal PDT verification error', { error: err.message });
        res.status(500).send({ message: err.message });
    }
};

/**
 * Get PayPal settings (no authentication required for checking if configured)
 */
exports.getPayPalSettings = async (req, res) => {
    try {
        const settings = await paypalSettingsService.getPayPalSettings();
        res.status(200).send(settings);
    } catch (err) {
        logger.error('Error getting PayPal settings', { error: err.message });
        res.status(500).send({ message: err.message });
    }
};

// Public donation summary for the past 12 months
exports.getDonationSummary = async (_req, res) => {
    try {
        const since = new Date();
        since.setFullYear(since.getFullYear() - 1);

        const where = { donatedAt: { [Op.gte]: since } };

        const recentDonations = await db.donation.findAll({
            where,
            order: [['donatedAt', 'DESC']],
            attributes: ['id', 'amount', 'donatedAt'],
            limit: 3,
        });

        const totalLast12Months = recentDonations.reduce((sum, donation) => sum + (donation.amount || 0), 0);

        res.status(200).send({
            totalLast12Months,
            donations: recentDonations,
        });
    } catch (err) {
        logger.error('Error fetching donation summary', { error: err.message });
        res.status(500).send({ message: 'Error fetching donation summary' });
    }
};
