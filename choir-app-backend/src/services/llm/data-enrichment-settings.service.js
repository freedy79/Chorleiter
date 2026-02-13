/**
 * Data Enrichment Settings Service
 * Manages configuration for data enrichment feature
 * Handles encryption of API keys
 */

const logger = require('../../config/logger');
const { encryptGCM, decryptGCM } = require('../encryption.service');
const db = require('../../models');

class DataEnrichmentSettingsService {
    /**
     * Get setting value
     * Automatically decrypts API keys
     * @param {string} key - Setting key
     * @returns {Promise<string|number|boolean>}
     */
    async get(key) {
        try {
            const setting = await db.data_enrichment_setting.findOne({
                where: { settingKey: key }
            });

            if (!setting) {
                return null;
            }

            let value = setting.settingValue;

            // Decrypt if needed
            if (setting.isEncrypted) {
                try {
                    value = decryptGCM(value);
                } catch (error) {
                    logger.error(`[Settings] Failed to decrypt ${key}:`, error);
                    return null;
                }
            }

            // Convert to appropriate data type
            switch (setting.dataType) {
                case 'number':
                    return parseFloat(value);
                case 'boolean':
                    return value === 'true' || value === '1' || value === true;
                case 'json':
                    try {
                        return JSON.parse(value);
                    } catch {
                        return value;
                    }
                default:
                    return value;
            }
        } catch (error) {
            logger.error(`[Settings] Error getting ${key}:`, error);
            return null;
        }
    }

    /**
     * Set setting value
     * Automatically encrypts API keys
     * @param {string} key - Setting key
     * @param {*} value - Value to set
     * @param {string} dataType - Data type (string, number, boolean, json)
     * @param {string} userId - User making the change
     * @returns {Promise<Object>}
     */
    async set(key, value, dataType = 'string', userId = null) {
        try {
            let stringValue = value;
            let isEncrypted = false;

            // Convert to string
            if (typeof value === 'boolean') {
                stringValue = value ? 'true' : 'false';
            } else if (typeof value === 'number') {
                stringValue = value.toString();
            } else if (typeof value === 'object') {
                stringValue = JSON.stringify(value);
            }

            // Encrypt API keys
            if (key.includes('api_key') || key.includes('API_KEY')) {
                stringValue = encryptGCM(stringValue);
                isEncrypted = true;
                logger.info(`[Settings] API key encrypted: ${key}`);
            }

            // Find or create setting
            const [setting, created] = await db.data_enrichment_setting.findOrCreate({
                where: { settingKey: key },
                defaults: {
                    settingValue: stringValue,
                    isEncrypted,
                    dataType,
                    lastModifiedBy: userId
                }
            });

            if (!created) {
                // Update existing setting
                await setting.update({
                    settingValue: stringValue,
                    isEncrypted,
                    dataType,
                    lastModifiedBy: userId
                });
            }

            logger.info(`[Settings] Setting saved: ${key}`, {
                created,
                encrypted: isEncrypted,
                modifiedBy: userId
            });

            return {
                key,
                saved: true,
                encrypted: isEncrypted
            };
        } catch (error) {
            logger.error(`[Settings] Error setting ${key}:`, error);
            throw error;
        }
    }

    /**
     * Get all settings
     * Does NOT return encrypted API keys (for security)
     * @returns {Promise<Object>}
     */
    async getAll() {
        try {
            const settings = await db.data_enrichment_setting.findAll();
            const result = {};

            for (const setting of settings) {
                let value = setting.settingValue;

                // Don't return encrypted API keys
                if (setting.isEncrypted) {
                    value = this.maskApiKey(value);
                } else {
                    // Decrypt non-API keys if needed
                    if (setting.dataType === 'number') {
                        value = parseFloat(value);
                    } else if (setting.dataType === 'boolean') {
                        value = value === 'true' || value === '1' || value === true;
                    } else if (setting.dataType === 'json') {
                        try {
                            value = JSON.parse(value);
                        } catch {
                            value = value;
                        }
                    }
                }

                result[setting.settingKey] = {
                    value,
                    dataType: setting.dataType,
                    encrypted: setting.isEncrypted,
                    lastModified: setting.updatedAt
                };
            }

            return result;
        } catch (error) {
            logger.error('[Settings] Error getting all settings:', error);
            throw error;
        }
    }

    /**
     * Mask API key for display
     * Shows only first 4 and last 4 characters
     */
    maskApiKey(encryptedKey) {
        try {
            // Try to show encrypted format without revealing content
            if (encryptedKey && encryptedKey.length > 20) {
                return `${encryptedKey.slice(0, 4)}...${encryptedKey.slice(-4)}`;
            }
            return '****hidden****';
        } catch {
            return '****hidden****';
        }
    }

    /**
     * Delete setting
     * @param {string} key
     * @returns {Promise<boolean>}
     */
    async delete(key) {
        try {
            const result = await db.data_enrichment_setting.destroy({
                where: { settingKey: key }
            });
            
            logger.info(`[Settings] Setting deleted: ${key}`);
            return result > 0;
        } catch (error) {
            logger.error(`[Settings] Error deleting ${key}:`, error);
            throw error;
        }
    }

    /**
     * Get provider config
     * Returns all settings related to a specific LLM provider
     */
    async getProviderConfig(providerName) {
        try {
            const apiKeyKey = `api_key_${providerName.toLowerCase()}`;
            const apiKey = await this.get(apiKeyKey);

            return {
                provider: providerName,
                apiConfigured: !!apiKey,
                apiKey: this.maskApiKey(apiKey),
                settings: await this.getAll()
            };
        } catch (error) {
            logger.error(`[Settings] Error getting provider config for ${providerName}:`, error);
            throw error;
        }
    }
}

module.exports = new DataEnrichmentSettingsService();
