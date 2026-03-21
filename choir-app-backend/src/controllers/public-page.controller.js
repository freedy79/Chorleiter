const path = require('path');
const sanitizeHtml = require('sanitize-html');
const db = require('../models');

const ALLOWED_TEMPLATES = new Set(['classic', 'hero', 'gallery']);

function normalizeSlug(rawSlug) {
    if (rawSlug === undefined || rawSlug === null) {
        return null;
    }

    const trimmed = String(rawSlug).trim().toLowerCase();
    const normalized = trimmed
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    return normalized || null;
}

function sanitizeText(value, maxLen = 5000) {
    if (value === undefined || value === null) {
        return null;
    }
    const sanitized = sanitizeHtml(String(value), { allowedTags: [], allowedAttributes: {} }).trim();
    return sanitized.length > maxLen ? sanitized.substring(0, maxLen) : sanitized;
}

function sanitizeUrl(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const trimmed = String(value).trim();
    if (!/^https?:\/\//i.test(trimmed)) {
        return null;
    }
    return trimmed;
}

function sanitizeBlocks(input) {
    if (!Array.isArray(input)) {
        return [];
    }

    return input.slice(0, 25).map((block, index) => {
        const type = sanitizeText(block?.type, 50) || 'text';
        return {
            id: sanitizeText(block?.id, 100) || `block-${index + 1}`,
            type,
            title: sanitizeText(block?.title, 200),
            text: sanitizeText(block?.text, 10000),
            imageUrl: sanitizeUrl(block?.imageUrl),
            imageAlt: sanitizeText(block?.imageAlt, 200),
            ctaLabel: sanitizeText(block?.ctaLabel, 120),
            ctaUrl: sanitizeUrl(block?.ctaUrl),
        };
    });
}

const ALLOWED_RICH_BLOCK_TYPES = new Set([
    'rich-text', 'hero-banner', 'image', 'image-text', 'gallery',
    'divider', 'spacer', 'quote', 'cta', 'embed',
]);

const RICH_TEXT_OPTS = {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h2', 'h3', 'h4', 'hr', 'u']),
    allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        '*': ['style'],
    },
    allowedStyles: {
        '*': { 'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/] },
    },
};

function sanitizeRichBlocks(input) {
    if (!Array.isArray(input)) {
        return [];
    }

    return input.slice(0, 50).map((block, index) => {
        const type = sanitizeText(block?.type, 50);
        if (!type || !ALLOWED_RICH_BLOCK_TYPES.has(type)) {
            return null;
        }

        const base = {
            id: sanitizeText(block?.id, 100) || `rblock-${index + 1}`,
            type,
        };

        switch (type) {
            case 'rich-text':
                return { ...base, content: sanitizeHtml(String(block?.content || ''), RICH_TEXT_OPTS).substring(0, 50000) };
            case 'hero-banner':
                return {
                    ...base,
                    headline: sanitizeText(block?.headline, 200),
                    subheadline: sanitizeText(block?.subheadline, 400),
                    imageUrl: sanitizeUrl(block?.imageUrl),
                    imageAlt: sanitizeText(block?.imageAlt, 200),
                    ctaLabel: sanitizeText(block?.ctaLabel, 120),
                    ctaUrl: sanitizeUrl(block?.ctaUrl),
                    overlay: Boolean(block?.overlay),
                };
            case 'image':
                return {
                    ...base,
                    imageUrl: sanitizeUrl(block?.imageUrl),
                    imageAlt: sanitizeText(block?.imageAlt, 200),
                    caption: sanitizeText(block?.caption, 500),
                    alignment: ['left', 'center', 'right', 'full'].includes(block?.alignment) ? block.alignment : 'center',
                };
            case 'image-text':
                return {
                    ...base,
                    imageUrl: sanitizeUrl(block?.imageUrl),
                    imageAlt: sanitizeText(block?.imageAlt, 200),
                    content: sanitizeHtml(String(block?.content || ''), RICH_TEXT_OPTS).substring(0, 50000),
                    imagePosition: block?.imagePosition === 'right' ? 'right' : 'left',
                };
            case 'gallery': {
                const images = Array.isArray(block?.images) ? block.images.slice(0, 20).map(img => ({
                    url: sanitizeUrl(img?.url),
                    alt: sanitizeText(img?.alt, 200),
                    caption: sanitizeText(img?.caption, 500),
                })) : [];
                return {
                    ...base,
                    images,
                    columns: [2, 3, 4].includes(block?.columns) ? block.columns : 3,
                };
            }
            case 'divider':
                return { ...base, style: ['solid', 'dashed', 'dotted', 'double'].includes(block?.style) ? block.style : 'solid' };
            case 'spacer':
                return { ...base, height: ['small', 'medium', 'large'].includes(block?.height) ? block.height : 'medium' };
            case 'quote':
                return {
                    ...base,
                    text: sanitizeText(block?.text, 2000),
                    attribution: sanitizeText(block?.attribution, 200),
                };
            case 'cta':
                return {
                    ...base,
                    label: sanitizeText(block?.label, 120),
                    url: sanitizeUrl(block?.url),
                    style: ['primary', 'secondary', 'outline'].includes(block?.style) ? block.style : 'primary',
                    alignment: ['left', 'center', 'right'].includes(block?.alignment) ? block.alignment : 'center',
                };
            case 'embed':
                return {
                    ...base,
                    url: sanitizeUrl(block?.url),
                    caption: sanitizeText(block?.caption, 500),
                };
            default:
                return null;
        }
    }).filter(Boolean);
}

async function getOrCreatePage(choirId) {
    const [page] = await db.choir_public_page.findOrCreate({
        where: { choirId },
        defaults: {
            choirId,
            isEnabled: false,
            isPublished: false,
            templateKey: 'classic',
            contentBlocks: [],
        },
    });
    return page;
}

function mapAssetToPublicUrl(asset) {
    if (!asset?.filePath) {
        return null;
    }
    const normalizedPath = String(asset.filePath).replace(/\\/g, '/');
    return `/uploads/${normalizedPath}`;
}

exports.getPublicPageBySlug = async (req, res) => {
    const slug = normalizeSlug(req.params.slug);
    if (!slug) {
        return res.status(404).send({ message: 'Seite nicht gefunden.' });
    }

    const page = await db.choir_public_page.findOne({
        where: {
            slug,
            isEnabled: true,
            isPublished: true,
        },
        include: [
            {
                model: db.choir,
                as: 'choir',
                attributes: ['id', 'name', 'description', 'location'],
            },
            {
                model: db.choir_public_asset,
                as: 'assets',
                attributes: ['id', 'filePath', 'mimeType', 'altText', 'sortOrder', 'createdAt'],
            },
        ],
        order: [[{ model: db.choir_public_asset, as: 'assets' }, 'sortOrder', 'ASC']],
    });

    if (!page) {
        return res.status(404).send({ message: 'Seite nicht gefunden.' });
    }

    return res.status(200).send({
        choir: page.choir,
        page: {
            slug: page.slug,
            templateKey: page.templateKey,
            colorScheme: page.colorScheme || 'elegant-light',
            headline: page.headline,
            subheadline: page.subheadline,
            contentBlocks: page.contentBlocks || [],
            contactEmail: page.contactEmail,
            contactPhone: page.contactPhone,
            websiteUrl: page.websiteUrl,
            seoTitle: page.seoTitle,
            seoDescription: page.seoDescription,
            ogImageUrl: page.ogImageUrl,
            assets: (page.assets || []).map(asset => ({
                id: asset.id,
                url: mapAssetToPublicUrl(asset),
                mimeType: asset.mimeType,
                altText: asset.altText,
                sortOrder: asset.sortOrder,
                createdAt: asset.createdAt,
            })),
        },
    });
};

exports.getMyPublicPage = async (req, res) => {
    const choir = await db.choir.findByPk(req.activeChoirId);
    if (!choir) {
        return res.status(404).send({ message: 'Active choir not found.' });
    }

    const page = await getOrCreatePage(req.activeChoirId);
    const assets = await db.choir_public_asset.findAll({
        where: { choirPublicPageId: page.id },
        order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    });

    return res.status(200).send({
        ...page.toJSON(),
        assets: assets.map(asset => ({
            id: asset.id,
            url: mapAssetToPublicUrl(asset),
            mimeType: asset.mimeType,
            altText: asset.altText,
            sortOrder: asset.sortOrder,
            createdAt: asset.createdAt,
        })),
        choir: {
            name: choir.name,
            description: choir.description || null,
            location: choir.location || null,
        },
    });
};

exports.checkSlugAvailability = async (req, res) => {
    const requestedSlug = normalizeSlug(req.query.slug);
    if (!requestedSlug || requestedSlug.length < 3) {
        return res.status(400).send({ message: 'Slug muss mindestens 3 Zeichen lang sein.' });
    }

    const existing = await db.choir_public_page.findOne({ where: { slug: requestedSlug } });
    const isAvailable = !existing || existing.choirId === req.activeChoirId;
    return res.status(200).send({ slug: requestedSlug, available: isAvailable });
};

exports.updateMyPublicPage = async (req, res) => {
    const choir = await db.choir.findByPk(req.activeChoirId);
    if (!choir) {
        return res.status(404).send({ message: 'Active choir not found.' });
    }

    const page = await getOrCreatePage(req.activeChoirId);

    const payload = req.body || {};
    const updateData = {};

    if (payload.slug !== undefined) {
        const slug = normalizeSlug(payload.slug);
        if (!slug || slug.length < 3) {
            return res.status(400).send({ message: 'Slug muss mindestens 3 Zeichen lang sein.' });
        }

        const slugConflict = await db.choir_public_page.findOne({
            where: {
                slug,
                choirId: { [db.Sequelize.Op.ne]: req.activeChoirId },
            },
        });
        if (slugConflict) {
            return res.status(409).send({ message: 'Dieser Slug ist bereits vergeben.' });
        }
        updateData.slug = slug;
    }

    if (payload.isEnabled !== undefined) {
        updateData.isEnabled = Boolean(payload.isEnabled);
    }
    if (payload.isPublished !== undefined) {
        updateData.isPublished = Boolean(payload.isPublished);
        if (updateData.isPublished) {
            updateData.publishedAt = new Date();
        }
    }

    if (payload.templateKey !== undefined) {
        const templateKey = sanitizeText(payload.templateKey, 50) || 'classic';
        if (!ALLOWED_TEMPLATES.has(templateKey)) {
            return res.status(400).send({ message: 'Unbekanntes Template ausgewählt.' });
        }
        updateData.templateKey = templateKey;
    }

    if (payload.headline !== undefined) {
        updateData.headline = sanitizeText(payload.headline, 200);
    }
    if (payload.subheadline !== undefined) {
        updateData.subheadline = sanitizeText(payload.subheadline, 400);
    }
    if (payload.contactEmail !== undefined) {
        const email = sanitizeText(payload.contactEmail, 200);
        updateData.contactEmail = email;
    }
    if (payload.contactPhone !== undefined) {
        updateData.contactPhone = sanitizeText(payload.contactPhone, 100);
    }
    if (payload.websiteUrl !== undefined) {
        updateData.websiteUrl = sanitizeUrl(payload.websiteUrl);
    }
    if (payload.seoTitle !== undefined) {
        updateData.seoTitle = sanitizeText(payload.seoTitle, 200);
    }
    if (payload.seoDescription !== undefined) {
        updateData.seoDescription = sanitizeText(payload.seoDescription, 500);
    }
    if (payload.ogImageUrl !== undefined) {
        updateData.ogImageUrl = sanitizeUrl(payload.ogImageUrl);
    }
    if (payload.contentBlocks !== undefined) {
        updateData.contentBlocks = sanitizeBlocks(payload.contentBlocks);
    }
    if (payload.richBlocks !== undefined) {
        updateData.richBlocks = sanitizeRichBlocks(payload.richBlocks);
    }
    if (payload.colorScheme !== undefined) {
        const scheme = sanitizeText(payload.colorScheme, 50) || 'elegant-light';
        updateData.colorScheme = scheme;
    }

    updateData.updatedBy = req.userId;

    await page.update(updateData);
    return res.status(200).send({ message: 'Öffentliche Vorstellungsseite gespeichert.', page });
};

exports.uploadMyPublicAsset = async (req, res) => {
    const choir = await db.choir.findByPk(req.activeChoirId);
    if (!choir) {
        return res.status(404).send({ message: 'Active choir not found.' });
    }

    if (!req.file) {
        return res.status(400).send({ message: 'Keine Datei hochgeladen.' });
    }

    const page = await getOrCreatePage(req.activeChoirId);
    const relPath = path.join('choir-public-pages', req.file.filename).replace(/\\/g, '/');

    const sortOrder = Number.isInteger(Number(req.body?.sortOrder)) ? Number(req.body.sortOrder) : 0;
    const altText = sanitizeText(req.body?.altText, 200);

    const asset = await db.choir_public_asset.create({
        choirPublicPageId: page.id,
        filePath: relPath,
        mimeType: req.file.mimetype,
        altText,
        sortOrder,
    });

    return res.status(201).send({
        id: asset.id,
        url: mapAssetToPublicUrl(asset),
        mimeType: asset.mimeType,
        altText: asset.altText,
        sortOrder: asset.sortOrder,
    });
};

exports.deleteMyPublicAsset = async (req, res) => {
    const assetId = Number(req.params.assetId);
    if (!Number.isInteger(assetId) || assetId <= 0) {
        return res.status(400).send({ message: 'Ungültige Asset-ID.' });
    }

    const page = await db.choir_public_page.findOne({ where: { choirId: req.activeChoirId } });
    if (!page) {
        return res.status(404).send({ message: 'Keine Vorstellungsseite für diesen Chor vorhanden.' });
    }

    const asset = await db.choir_public_asset.findOne({
        where: {
            id: assetId,
            choirPublicPageId: page.id,
        },
    });

    if (!asset) {
        return res.status(404).send({ message: 'Asset nicht gefunden.' });
    }

    await asset.destroy();
    return res.status(200).send({ message: 'Asset gelöscht.' });
};
