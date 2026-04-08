const db = require('../models');
const logger = require('../config/logger');

async function ensureTrainingTables() {
    try {
        await db.training_profile.sync();
        logger.info('[Migration] training_profile table ensured.');

        await db.exercise.sync();
        logger.info('[Migration] exercise table ensured.');

        await db.exercise_attempt.sync();
        logger.info('[Migration] exercise_attempt table ensured.');

        await db.badge_definition.sync();
        logger.info('[Migration] badge_definition table ensured.');

        await db.user_badge.sync();
        logger.info('[Migration] user_badge table ensured.');
    } catch (err) {
        logger.error('[Migration] Error ensuring training tables:', err);
        throw err;
    }
}

async function seedExercises(force = false) {
    try {
        const count = await db.exercise.count();
        if (count > 0 && !force) {
            logger.debug('[Seed] Training exercises already exist, skipping seed.');
            return;
        }

        const exercises = [
            // === RHYTHM MODULE – Beginner ===
            {
                module: 'rhythm',
                difficulty: 'beginner',
                type: 'tap_rhythm',
                title: 'Viertelnoten klopfen',
                description: 'Klopfe den angezeigten Rhythmus aus Viertelnoten im 4/4-Takt.',
                content: {
                    timeSignature: '4/4',
                    bpm: 80,
                    bars: 2,
                    pattern: [
                        { type: 'quarter', beat: 1 },
                        { type: 'quarter', beat: 2 },
                        { type: 'quarter', beat: 3 },
                        { type: 'quarter', beat: 4 },
                        { type: 'quarter', beat: 5 },
                        { type: 'quarter', beat: 6 },
                        { type: 'quarter', beat: 7 },
                        { type: 'quarter', beat: 8 }
                    ],
                    toleranceMs: 150
                },
                xpReward: 10,
                orderIndex: 1
            },
            {
                module: 'rhythm',
                difficulty: 'beginner',
                type: 'tap_rhythm',
                title: 'Halbe und Viertelnoten',
                description: 'Klopfe einen einfachen Rhythmus mit halben und Viertelnoten.',
                content: {
                    timeSignature: '4/4',
                    bpm: 80,
                    bars: 2,
                    pattern: [
                        { type: 'half', beat: 1 },
                        { type: 'quarter', beat: 3 },
                        { type: 'quarter', beat: 4 },
                        { type: 'quarter', beat: 5 },
                        { type: 'half', beat: 6 },
                        { type: 'quarter', beat: 8 }
                    ],
                    toleranceMs: 150
                },
                xpReward: 10,
                orderIndex: 2
            },
            {
                module: 'rhythm',
                difficulty: 'beginner',
                type: 'rhythm_recognition',
                title: 'Rhythmus erkennen – Einfach',
                description: 'Höre den Rhythmus und wähle das passende Notenbild.',
                content: {
                    bpm: 80,
                    rounds: [
                        {
                            correctPattern: [
                                { type: 'quarter' }, { type: 'quarter' },
                                { type: 'half' },
                                { type: 'quarter' }, { type: 'quarter' },
                                { type: 'quarter' }, { type: 'quarter' }
                            ],
                            options: [
                                { id: 'a', label: '♩ ♩ 𝅗𝅥 | ♩ ♩ ♩ ♩', correct: true },
                                { id: 'b', label: '𝅗𝅥 ♩ ♩ | ♩ ♩ 𝅗𝅥', correct: false },
                                { id: 'c', label: '♩ ♩ ♩ ♩ | 𝅗𝅥 𝅗𝅥', correct: false },
                                { id: 'd', label: '𝅝 | ♩ ♩ ♩ ♩', correct: false }
                            ]
                        },
                        {
                            correctPattern: [
                                { type: 'half' },
                                { type: 'quarter' }, { type: 'quarter' },
                                { type: 'quarter' }, { type: 'quarter' },
                                { type: 'half' }
                            ],
                            options: [
                                { id: 'a', label: '𝅗𝅥 ♩ ♩ | ♩ ♩ 𝅗𝅥', correct: true },
                                { id: 'b', label: '♩ ♩ 𝅗𝅥 | 𝅗𝅥 ♩ ♩', correct: false },
                                { id: 'c', label: '𝅗𝅥 𝅗𝅥 | ♩ ♩ ♩ ♩', correct: false },
                                { id: 'd', label: '♩ ♩ ♩ ♩ | ♩ ♩ ♩ ♩', correct: false }
                            ]
                        },
                        {
                            correctPattern: [
                                { type: 'quarter' }, { type: 'quarter' },
                                { type: 'quarter' }, { type: 'quarter' },
                                { type: 'half' },
                                { type: 'half' }
                            ],
                            options: [
                                { id: 'a', label: '♩ ♩ ♩ ♩ | 𝅗𝅥 𝅗𝅥', correct: true },
                                { id: 'b', label: '𝅗𝅥 𝅗𝅥 | ♩ ♩ ♩ ♩', correct: false },
                                { id: 'c', label: '♩ ♩ 𝅗𝅥 | ♩ ♩ 𝅗𝅥', correct: false },
                                { id: 'd', label: '𝅝 | 𝅝', correct: false }
                            ]
                        },
                        {
                            correctPattern: [
                                { type: 'whole' },
                                { type: 'quarter' }, { type: 'quarter' },
                                { type: 'quarter' }, { type: 'quarter' }
                            ],
                            options: [
                                { id: 'a', label: '𝅝 | ♩ ♩ ♩ ♩', correct: true },
                                { id: 'b', label: '♩ ♩ ♩ ♩ | 𝅝', correct: false },
                                { id: 'c', label: '𝅗𝅥 𝅗𝅥 | 𝅗𝅥 𝅗𝅥', correct: false },
                                { id: 'd', label: '♩ ♩ 𝅗𝅥 | ♩ ♩ ♩ ♩', correct: false }
                            ]
                        },
                        {
                            correctPattern: [
                                { type: 'quarter' }, { type: 'half' }, { type: 'quarter' },
                                { type: 'half' }, { type: 'quarter' }, { type: 'quarter' }
                            ],
                            options: [
                                { id: 'a', label: '♩ 𝅗𝅥 ♩ | 𝅗𝅥 ♩ ♩', correct: true },
                                { id: 'b', label: '𝅗𝅥 ♩ ♩ | ♩ 𝅗𝅥 ♩', correct: false },
                                { id: 'c', label: '♩ ♩ 𝅗𝅥 | ♩ ♩ 𝅗𝅥', correct: false },
                                { id: 'd', label: '♩ ♩ ♩ ♩ | 𝅗𝅥 𝅗𝅥', correct: false }
                            ]
                        },
                        {
                            correctPattern: [
                                { type: 'half' }, { type: 'half' },
                                { type: 'quarter' }, { type: 'half' }, { type: 'quarter' }
                            ],
                            options: [
                                { id: 'a', label: '𝅗𝅥 𝅗𝅥 | ♩ 𝅗𝅥 ♩', correct: true },
                                { id: 'b', label: '♩ 𝅗𝅥 ♩ | 𝅗𝅥 𝅗𝅥', correct: false },
                                { id: 'c', label: '𝅗𝅥 ♩ ♩ | 𝅗𝅥 ♩ ♩', correct: false },
                                { id: 'd', label: '𝅝 | ♩ 𝅗𝅥 ♩', correct: false }
                            ]
                        }
                    ]
                },
                xpReward: 10,
                orderIndex: 3
            },
            {
                module: 'rhythm',
                difficulty: 'beginner',
                type: 'tap_rhythm',
                title: 'Pausen erkennen',
                description: 'Klopfe den Rhythmus und beachte die Viertelpausen.',
                content: {
                    timeSignature: '4/4',
                    bpm: 80,
                    bars: 2,
                    pattern: [
                        { type: 'quarter', beat: 1 },
                        { type: 'rest_quarter', beat: 2 },
                        { type: 'quarter', beat: 3 },
                        { type: 'quarter', beat: 4 },
                        { type: 'quarter', beat: 5 },
                        { type: 'quarter', beat: 6 },
                        { type: 'rest_quarter', beat: 7 },
                        { type: 'quarter', beat: 8 }
                    ],
                    toleranceMs: 150
                },
                xpReward: 10,
                orderIndex: 4
            },
            {
                module: 'rhythm',
                difficulty: 'beginner',
                type: 'rhythm_recognition',
                title: 'Rhythmus erkennen – Mit Pausen',
                description: 'Höre den Rhythmus und wähle das richtige Muster mit Pausen.',
                content: {
                    bpm: 80,
                    rounds: [
                        {
                            correctPattern: [
                                { type: 'quarter' }, { type: 'rest_quarter' },
                                { type: 'quarter' }, { type: 'quarter' },
                                { type: 'half' },
                                { type: 'rest_quarter' }, { type: 'quarter' }
                            ],
                            options: [
                                { id: 'a', label: '♩ 𝄾 ♩ ♩ | 𝅗𝅥 𝄾 ♩', correct: true },
                                { id: 'b', label: '♩ ♩ 𝄾 ♩ | 𝅗𝅥 ♩ 𝄾', correct: false },
                                { id: 'c', label: '♩ ♩ ♩ ♩ | 𝅗𝅥 𝅗𝅥', correct: false },
                                { id: 'd', label: '𝄾 ♩ ♩ ♩ | ♩ 𝄾 𝅗𝅥', correct: false }
                            ]
                        },
                        {
                            correctPattern: [
                                { type: 'rest_quarter' }, { type: 'quarter' },
                                { type: 'quarter' }, { type: 'quarter' },
                                { type: 'quarter' }, { type: 'rest_quarter' },
                                { type: 'quarter' }, { type: 'quarter' }
                            ],
                            options: [
                                { id: 'a', label: '𝄾 ♩ ♩ ♩ | ♩ 𝄾 ♩ ♩', correct: true },
                                { id: 'b', label: '♩ 𝄾 ♩ ♩ | 𝄾 ♩ ♩ ♩', correct: false },
                                { id: 'c', label: '♩ ♩ 𝄾 ♩ | ♩ ♩ 𝄾 ♩', correct: false },
                                { id: 'd', label: '♩ ♩ ♩ ♩ | ♩ ♩ ♩ ♩', correct: false }
                            ]
                        },
                        {
                            correctPattern: [
                                { type: 'quarter' }, { type: 'quarter' },
                                { type: 'rest_quarter' }, { type: 'quarter' },
                                { type: 'quarter' }, { type: 'quarter' },
                                { type: 'quarter' }, { type: 'rest_quarter' }
                            ],
                            options: [
                                { id: 'a', label: '♩ ♩ 𝄾 ♩ | ♩ ♩ ♩ 𝄾', correct: true },
                                { id: 'b', label: '♩ 𝄾 ♩ ♩ | ♩ ♩ 𝄾 ♩', correct: false },
                                { id: 'c', label: '♩ ♩ ♩ 𝄾 | 𝄾 ♩ ♩ ♩', correct: false },
                                { id: 'd', label: '𝄾 ♩ ♩ ♩ | ♩ 𝄾 ♩ ♩', correct: false }
                            ]
                        },
                        {
                            correctPattern: [
                                { type: 'half' }, { type: 'rest_quarter' }, { type: 'quarter' },
                                { type: 'quarter' }, { type: 'rest_quarter' },
                                { type: 'half' }
                            ],
                            options: [
                                { id: 'a', label: '𝅗𝅥 𝄾 ♩ | ♩ 𝄾 𝅗𝅥', correct: true },
                                { id: 'b', label: '♩ 𝄾 𝅗𝅥 | 𝅗𝅥 𝄾 ♩', correct: false },
                                { id: 'c', label: '𝅗𝅥 ♩ 𝄾 | 𝄾 ♩ 𝅗𝅥', correct: false },
                                { id: 'd', label: '𝅗𝅥 𝅗𝅥 | ♩ ♩ 𝅗𝅥', correct: false }
                            ]
                        },
                        {
                            correctPattern: [
                                { type: 'rest_quarter' }, { type: 'rest_quarter' },
                                { type: 'quarter' }, { type: 'quarter' },
                                { type: 'quarter' }, { type: 'quarter' },
                                { type: 'rest_quarter' }, { type: 'rest_quarter' }
                            ],
                            options: [
                                { id: 'a', label: '𝄾 𝄾 ♩ ♩ | ♩ ♩ 𝄾 𝄾', correct: true },
                                { id: 'b', label: '♩ ♩ 𝄾 𝄾 | 𝄾 𝄾 ♩ ♩', correct: false },
                                { id: 'c', label: '𝄾 ♩ 𝄾 ♩ | ♩ 𝄾 ♩ 𝄾', correct: false },
                                { id: 'd', label: '♩ 𝄾 ♩ 𝄾 | 𝄾 ♩ 𝄾 ♩', correct: false }
                            ]
                        }
                    ]
                },
                xpReward: 10,
                orderIndex: 5
            },

            // === RHYTHM MODULE – Intermediate ===
            {
                module: 'rhythm',
                difficulty: 'intermediate',
                type: 'tap_rhythm',
                title: 'Achtelnoten-Rhythmus',
                description: 'Klopfe einen Rhythmus mit Achtel- und Viertelnoten.',
                content: {
                    timeSignature: '4/4',
                    bpm: 90,
                    bars: 2,
                    pattern: [
                        { type: 'eighth', beat: 1 },
                        { type: 'eighth', beat: 1.5 },
                        { type: 'quarter', beat: 2 },
                        { type: 'quarter', beat: 3 },
                        { type: 'eighth', beat: 4 },
                        { type: 'eighth', beat: 4.5 },
                        { type: 'half', beat: 5 },
                        { type: 'quarter', beat: 7 },
                        { type: 'quarter', beat: 8 }
                    ],
                    toleranceMs: 120
                },
                xpReward: 15,
                orderIndex: 10
            },
            {
                module: 'rhythm',
                difficulty: 'intermediate',
                type: 'tap_rhythm',
                title: 'Punktierte Viertelnoten',
                description: 'Klopfe einen Rhythmus mit punktierten Noten.',
                content: {
                    timeSignature: '4/4',
                    bpm: 85,
                    bars: 2,
                    pattern: [
                        { type: 'dotted_quarter', beat: 1 },
                        { type: 'eighth', beat: 2.5 },
                        { type: 'quarter', beat: 3 },
                        { type: 'quarter', beat: 4 },
                        { type: 'dotted_quarter', beat: 5 },
                        { type: 'eighth', beat: 6.5 },
                        { type: 'half', beat: 7 }
                    ],
                    toleranceMs: 120
                },
                xpReward: 15,
                orderIndex: 11
            },
            {
                module: 'rhythm',
                difficulty: 'intermediate',
                type: 'rhythm_recognition',
                title: 'Synkopen & Achtel erkennen',
                description: 'Erkenne Rhythmen mit Achteln, Synkopen und gemischten Notenwerten.',
                content: {
                    bpm: 90,
                    rounds: [
                        {
                            correctPattern: [
                                { type: 'eighth' }, { type: 'quarter' }, { type: 'eighth' },
                                { type: 'quarter' }, { type: 'quarter' },
                                { type: 'eighth' }, { type: 'quarter' }, { type: 'eighth' },
                                { type: 'half' }
                            ],
                            options: [
                                { id: 'a', label: '♪ ♩ ♪ ♩ ♩ | ♪ ♩ ♪ 𝅗𝅥', correct: true },
                                { id: 'b', label: '♩ ♩ ♩ ♩ | ♩ ♩ 𝅗𝅥', correct: false },
                                { id: 'c', label: '♪ ♪ ♩ ♩ ♩ | ♪ ♪ ♩ 𝅗𝅥', correct: false },
                                { id: 'd', label: '♩ ♪ ♩ ♪ ♩ | 𝅗𝅥 ♪ ♩ ♪', correct: false }
                            ]
                        },
                        {
                            correctPattern: [
                                { type: 'eighth' }, { type: 'eighth' },
                                { type: 'quarter' }, { type: 'quarter' }, { type: 'quarter' },
                                { type: 'eighth' }, { type: 'eighth' },
                                { type: 'half' }, { type: 'quarter' }
                            ],
                            options: [
                                { id: 'a', label: '♪♪ ♩ ♩ ♩ | ♪♪ 𝅗𝅥 ♩', correct: true },
                                { id: 'b', label: '♩ ♪♪ ♩ ♩ | ♩ ♪♪ 𝅗𝅥', correct: false },
                                { id: 'c', label: '♪♪ ♪♪ ♩ ♩ | ♩ ♩ ♩ ♩', correct: false },
                                { id: 'd', label: '♩ ♩ ♪♪ ♩ | 𝅗𝅥 ♪♪ ♩', correct: false }
                            ]
                        },
                        {
                            correctPattern: [
                                { type: 'quarter' }, { type: 'eighth' }, { type: 'eighth' },
                                { type: 'half' },
                                { type: 'quarter' }, { type: 'eighth' }, { type: 'eighth' },
                                { type: 'quarter' }, { type: 'quarter' }
                            ],
                            options: [
                                { id: 'a', label: '♩ ♪♪ 𝅗𝅥 | ♩ ♪♪ ♩ ♩', correct: true },
                                { id: 'b', label: '♪♪ ♩ 𝅗𝅥 | ♪♪ ♩ ♩ ♩', correct: false },
                                { id: 'c', label: '♩ ♩ 𝅗𝅥 | ♩ ♩ ♩ ♩', correct: false },
                                { id: 'd', label: '♩ ♪♪ ♩ ♩ | ♩ ♪♪ 𝅗𝅥', correct: false }
                            ]
                        },
                        {
                            correctPattern: [
                                { type: 'dotted_quarter' }, { type: 'eighth' },
                                { type: 'quarter' }, { type: 'quarter' },
                                { type: 'dotted_quarter' }, { type: 'eighth' },
                                { type: 'half' }
                            ],
                            options: [
                                { id: 'a', label: '♩. ♪ ♩ ♩ | ♩. ♪ 𝅗𝅥', correct: true },
                                { id: 'b', label: '♩ ♪ ♩. ♩ | ♩ ♪ 𝅗𝅥.', correct: false },
                                { id: 'c', label: '♩ ♩ ♩ ♩ | ♩ ♩ 𝅗𝅥', correct: false },
                                { id: 'd', label: '𝅗𝅥 ♪♪ | 𝅗𝅥 ♩ ♩', correct: false }
                            ]
                        },
                        {
                            correctPattern: [
                                { type: 'eighth' }, { type: 'eighth' },
                                { type: 'eighth' }, { type: 'eighth' },
                                { type: 'quarter' }, { type: 'quarter' },
                                { type: 'half' }, { type: 'half' }
                            ],
                            options: [
                                { id: 'a', label: '♪♪ ♪♪ ♩ ♩ | 𝅗𝅥 𝅗𝅥', correct: true },
                                { id: 'b', label: '♩ ♩ ♪♪ ♪♪ | 𝅗𝅥 𝅗𝅥', correct: false },
                                { id: 'c', label: '♪♪ ♩ ♩ ♪♪ | 𝅗𝅥 𝅗𝅥', correct: false },
                                { id: 'd', label: '♩ ♩ ♩ ♩ | ♩ ♩ ♩ ♩', correct: false }
                            ]
                        },
                        {
                            correctPattern: [
                                { type: 'quarter' }, { type: 'quarter' },
                                { type: 'eighth' }, { type: 'quarter' }, { type: 'eighth' },
                                { type: 'half' },
                                { type: 'eighth' }, { type: 'eighth' }, { type: 'quarter' }
                            ],
                            options: [
                                { id: 'a', label: '♩ ♩ ♪ ♩ ♪ | 𝅗𝅥 ♪♪ ♩', correct: true },
                                { id: 'b', label: '♩ ♩ ♩ ♩ | 𝅗𝅥 ♩ ♩', correct: false },
                                { id: 'c', label: '♪ ♩ ♪ ♩ ♩ | ♩ ♪♪ 𝅗𝅥', correct: false },
                                { id: 'd', label: '♩ ♪♪ ♩ ♩ | 𝅗𝅥 ♩ ♩', correct: false }
                            ]
                        },
                        {
                            correctPattern: [
                                { type: 'eighth' }, { type: 'rest_eighth' },
                                { type: 'eighth' }, { type: 'eighth' },
                                { type: 'quarter' }, { type: 'quarter' },
                                { type: 'eighth' }, { type: 'rest_eighth' },
                                { type: 'half' }, { type: 'quarter' }
                            ],
                            options: [
                                { id: 'a', label: '♪ 𝄾♪ ♪♪ ♩ ♩ | ♪ 𝄾♪ 𝅗𝅥 ♩', correct: true },
                                { id: 'b', label: '♪♪ ♪♪ ♩ ♩ | ♪♪ 𝅗𝅥 ♩', correct: false },
                                { id: 'c', label: '♩ ♪♪ ♩ ♩ | ♩ 𝅗𝅥 ♩', correct: false },
                                { id: 'd', label: '♪ ♩ ♪ ♩ ♩ | ♪ ♩ ♪ 𝅗𝅥', correct: false }
                            ]
                        },
                        {
                            correctPattern: [
                                { type: 'quarter' }, { type: 'dotted_quarter' }, { type: 'eighth' },
                                { type: 'eighth' }, { type: 'eighth' }, { type: 'quarter' },
                                { type: 'quarter' }, { type: 'half' }
                            ],
                            options: [
                                { id: 'a', label: '♩ ♩. ♪ ♪♪ | ♩ ♩ 𝅗𝅥', correct: true },
                                { id: 'b', label: '♩ ♩ ♩ ♪♪ | ♩. ♪ 𝅗𝅥', correct: false },
                                { id: 'c', label: '♩. ♪ ♩ ♪♪ | ♩ 𝅗𝅥 ♩', correct: false },
                                { id: 'd', label: '♩ ♩ ♩ ♩ | ♩ ♩ 𝅗𝅥', correct: false }
                            ]
                        }
                    ]
                },
                xpReward: 15,
                orderIndex: 12
            },

            // === RHYTHM MODULE – Advanced ===
            {
                module: 'rhythm',
                difficulty: 'advanced',
                type: 'tap_rhythm',
                title: 'Triolen-Rhythmus',
                description: 'Klopfe einen Rhythmus mit Triolen.',
                content: {
                    timeSignature: '4/4',
                    bpm: 100,
                    bars: 2,
                    pattern: [
                        { type: 'triplet_eighth', beat: 1 },
                        { type: 'triplet_eighth', beat: 1.33 },
                        { type: 'triplet_eighth', beat: 1.67 },
                        { type: 'quarter', beat: 2 },
                        { type: 'quarter', beat: 3 },
                        { type: 'quarter', beat: 4 },
                        { type: 'half', beat: 5 },
                        { type: 'triplet_eighth', beat: 7 },
                        { type: 'triplet_eighth', beat: 7.33 },
                        { type: 'triplet_eighth', beat: 7.67 },
                        { type: 'quarter', beat: 8 }
                    ],
                    toleranceMs: 100
                },
                xpReward: 20,
                orderIndex: 20
            },
            {
                module: 'rhythm',
                difficulty: 'advanced',
                type: 'tap_rhythm',
                title: '6/8-Takt',
                description: 'Klopfe einen Rhythmus im 6/8-Takt.',
                content: {
                    timeSignature: '6/8',
                    bpm: 60,
                    bars: 2,
                    pattern: [
                        { type: 'dotted_quarter', beat: 1 },
                        { type: 'eighth', beat: 2.5 },
                        { type: 'eighth', beat: 3 },
                        { type: 'eighth', beat: 3.5 },
                        { type: 'quarter', beat: 4 },
                        { type: 'eighth', beat: 5 },
                        { type: 'dotted_quarter', beat: 5.5 }
                    ],
                    toleranceMs: 100
                },
                xpReward: 20,
                orderIndex: 21
            },

            // === NOTE READING – Beginner ===
            {
                module: 'note_reading',
                difficulty: 'beginner',
                type: 'name_note',
                title: 'Stammtöne im Violinschlüssel',
                description: 'Benenne die angezeigten Noten im Violinschlüssel.',
                content: {
                    clef: 'treble',
                    notes: [
                        { pitch: 'C4', display: 'c1' },
                        { pitch: 'D4', display: 'd1' },
                        { pitch: 'E4', display: 'e1' },
                        { pitch: 'F4', display: 'f1' },
                        { pitch: 'G4', display: 'g1' },
                        { pitch: 'A4', display: 'a1' },
                        { pitch: 'B4', display: 'h1' }
                    ],
                    count: 8,
                    timeLimitSeconds: 60
                },
                xpReward: 10,
                orderIndex: 30
            },
            {
                module: 'note_reading',
                difficulty: 'beginner',
                type: 'name_note',
                title: 'Stammtöne im Bassschlüssel',
                description: 'Benenne die angezeigten Noten im Bassschlüssel.',
                content: {
                    clef: 'bass',
                    notes: [
                        { pitch: 'C3', display: 'c' },
                        { pitch: 'D3', display: 'd' },
                        { pitch: 'E3', display: 'e' },
                        { pitch: 'F3', display: 'f' },
                        { pitch: 'G3', display: 'g' },
                        { pitch: 'A3', display: 'a' },
                        { pitch: 'B3', display: 'h' }
                    ],
                    count: 8,
                    timeLimitSeconds: 60
                },
                xpReward: 10,
                orderIndex: 31
            },
            {
                module: 'note_reading',
                difficulty: 'beginner',
                type: 'name_note',
                title: 'Violinschlüssel – Erweiterter Bereich',
                description: 'Stammtöne inkl. Hilfslinien: von A3 bis C6 (zwei Hilfslinien ober- und unterhalb).',
                content: {
                    clef: 'treble',
                    notes: [
                        { pitch: 'A3', display: 'a' },
                        { pitch: 'B3', display: 'h' },
                        { pitch: 'C4', display: 'c1' },
                        { pitch: 'D4', display: 'd1' },
                        { pitch: 'E4', display: 'e1' },
                        { pitch: 'F4', display: 'f1' },
                        { pitch: 'G4', display: 'g1' },
                        { pitch: 'A4', display: 'a1' },
                        { pitch: 'B4', display: 'h1' },
                        { pitch: 'C5', display: 'c2' },
                        { pitch: 'D5', display: 'd2' },
                        { pitch: 'E5', display: 'e2' },
                        { pitch: 'F5', display: 'f2' },
                        { pitch: 'G5', display: 'g2' },
                        { pitch: 'A5', display: 'a2' },
                        { pitch: 'B5', display: 'h2' },
                        { pitch: 'C6', display: 'c3' }
                    ],
                    count: 10,
                    timeLimitSeconds: 90
                },
                xpReward: 10,
                orderIndex: 30.5
            },
            {
                module: 'note_reading',
                difficulty: 'beginner',
                type: 'name_note',
                title: 'Bassschlüssel – Erweiterter Bereich',
                description: 'Stammtöne inkl. Hilfslinien: von C2 bis E4 (zwei Hilfslinien ober- und unterhalb).',
                content: {
                    clef: 'bass',
                    notes: [
                        { pitch: 'C2', display: 'C' },
                        { pitch: 'D2', display: 'D' },
                        { pitch: 'E2', display: 'E' },
                        { pitch: 'F2', display: 'F' },
                        { pitch: 'G2', display: 'G' },
                        { pitch: 'A2', display: 'A' },
                        { pitch: 'B2', display: 'H' },
                        { pitch: 'C3', display: 'c' },
                        { pitch: 'D3', display: 'd' },
                        { pitch: 'E3', display: 'e' },
                        { pitch: 'F3', display: 'f' },
                        { pitch: 'G3', display: 'g' },
                        { pitch: 'A3', display: 'a' },
                        { pitch: 'B3', display: 'h' },
                        { pitch: 'C4', display: 'c1' },
                        { pitch: 'D4', display: 'd1' },
                        { pitch: 'E4', display: 'e1' }
                    ],
                    count: 10,
                    timeLimitSeconds: 90
                },
                xpReward: 10,
                orderIndex: 31.5
            },

            // === NOTE READING – Intermediate ===
            {
                module: 'note_reading',
                difficulty: 'intermediate',
                type: 'interval_reading',
                title: 'Intervalle erkennen – Stufen',
                description: 'Bestimme das Intervall zwischen zwei angezeigten Noten.',
                content: {
                    clef: 'treble',
                    intervals: [
                        { note1: 'C4', note2: 'D4', answer: 'Sekunde' },
                        { note1: 'C4', note2: 'E4', answer: 'Terz' },
                        { note1: 'C4', note2: 'F4', answer: 'Quarte' },
                        { note1: 'C4', note2: 'G4', answer: 'Quinte' },
                        { note1: 'C4', note2: 'A4', answer: 'Sexte' },
                        { note1: 'C4', note2: 'B4', answer: 'Septime' },
                        { note1: 'C4', note2: 'C5', answer: 'Oktave' }
                    ],
                    options: ['Sekunde', 'Terz', 'Quarte', 'Quinte', 'Sexte', 'Septime', 'Oktave'],
                    count: 8,
                    timeLimitSeconds: 90
                },
                xpReward: 15,
                orderIndex: 35
            },

            // === EAR TRAINING – Beginner ===
            {
                module: 'ear_training',
                difficulty: 'beginner',
                type: 'interval_hearing',
                title: 'Intervalle hören – Aufwärts',
                description: 'Höre zwei Töne nacheinander und bestimme das Intervall.',
                content: {
                    direction: 'ascending',
                    intervals: [
                        { semitones: 2, name: 'Große Sekunde', shortName: 'gr. 2' },
                        { semitones: 4, name: 'Große Terz', shortName: 'gr. 3' },
                        { semitones: 5, name: 'Reine Quarte', shortName: 'r. 4' },
                        { semitones: 7, name: 'Reine Quinte', shortName: 'r. 5' },
                        { semitones: 12, name: 'Oktave', shortName: '8' }
                    ],
                    baseNote: 'C4',
                    count: 8,
                    timeLimitSeconds: 120
                },
                xpReward: 10,
                orderIndex: 50
            },
            {
                module: 'ear_training',
                difficulty: 'beginner',
                type: 'interval_hearing',
                title: 'Dur oder Moll?',
                description: 'Höre einen Dreiklang und bestimme, ob er Dur oder Moll ist.',
                content: {
                    type: 'chord_quality',
                    chords: [
                        { notes: ['C4', 'E4', 'G4'], answer: 'dur' },
                        { notes: ['C4', 'Eb4', 'G4'], answer: 'moll' },
                        { notes: ['F4', 'A4', 'C5'], answer: 'dur' },
                        { notes: ['D4', 'F4', 'A4'], answer: 'moll' },
                        { notes: ['G4', 'B4', 'D5'], answer: 'dur' },
                        { notes: ['E4', 'G4', 'B4'], answer: 'moll' }
                    ],
                    count: 8,
                    timeLimitSeconds: 120
                },
                xpReward: 10,
                orderIndex: 51
            },

            // === EAR TRAINING – Intermediate ===
            {
                module: 'ear_training',
                difficulty: 'intermediate',
                type: 'interval_hearing',
                title: 'Intervalle hören – Alle Grundintervalle',
                description: 'Höre alle Grundintervalle aufwärts, inkl. kleine Terz, Tritonus und Septimen.',
                content: {
                    direction: 'ascending',
                    intervals: [
                        { semitones: 1, name: 'Kleine Sekunde', shortName: 'kl. 2' },
                        { semitones: 2, name: 'Große Sekunde', shortName: 'gr. 2' },
                        { semitones: 3, name: 'Kleine Terz', shortName: 'kl. 3' },
                        { semitones: 4, name: 'Große Terz', shortName: 'gr. 3' },
                        { semitones: 5, name: 'Reine Quarte', shortName: 'r. 4' },
                        { semitones: 6, name: 'Tritonus', shortName: 'TT' },
                        { semitones: 7, name: 'Reine Quinte', shortName: 'r. 5' },
                        { semitones: 8, name: 'Kleine Sexte', shortName: 'kl. 6' },
                        { semitones: 9, name: 'Große Sexte', shortName: 'gr. 6' },
                        { semitones: 10, name: 'Kleine Septime', shortName: 'kl. 7' },
                        { semitones: 11, name: 'Große Septime', shortName: 'gr. 7' },
                        { semitones: 12, name: 'Oktave', shortName: '8' }
                    ],
                    baseNote: 'C4',
                    count: 10,
                    timeLimitSeconds: 180
                },
                xpReward: 15,
                orderIndex: 52
            },
            {
                module: 'ear_training',
                difficulty: 'intermediate',
                type: 'interval_hearing',
                title: 'Intervalle hören – Abwärts',
                description: 'Höre Intervalle abwärts und bestimme sie.',
                content: {
                    direction: 'descending',
                    intervals: [
                        { semitones: 2, name: 'Große Sekunde', shortName: 'gr. 2' },
                        { semitones: 3, name: 'Kleine Terz', shortName: 'kl. 3' },
                        { semitones: 4, name: 'Große Terz', shortName: 'gr. 3' },
                        { semitones: 5, name: 'Reine Quarte', shortName: 'r. 4' },
                        { semitones: 7, name: 'Reine Quinte', shortName: 'r. 5' },
                        { semitones: 9, name: 'Große Sexte', shortName: 'gr. 6' },
                        { semitones: 12, name: 'Oktave', shortName: '8' }
                    ],
                    baseNote: 'C5',
                    count: 8,
                    timeLimitSeconds: 150
                },
                xpReward: 15,
                orderIndex: 53
            },
            {
                module: 'ear_training',
                difficulty: 'intermediate',
                type: 'interval_hearing',
                title: 'Akkorde bestimmen – Dreiklänge',
                description: 'Höre einen Dreiklang und bestimme, ob er Dur, Moll, vermindert oder übermäßig ist.',
                content: {
                    type: 'chord_quality',
                    chords: [
                        { notes: ['C4', 'E4', 'G4'], answer: 'dur' },
                        { notes: ['C4', 'Eb4', 'G4'], answer: 'moll' },
                        { notes: ['C4', 'Eb4', 'Gb4'], answer: 'vermindert' },
                        { notes: ['C4', 'E4', 'G#4'], answer: 'uebermässig' },
                        { notes: ['F4', 'A4', 'C5'], answer: 'dur' },
                        { notes: ['D4', 'F4', 'A4'], answer: 'moll' },
                        { notes: ['D4', 'F4', 'Ab4'], answer: 'vermindert' },
                        { notes: ['Eb4', 'G4', 'B4'], answer: 'dur' },
                        { notes: ['F4', 'Ab4', 'C5'], answer: 'moll' },
                        { notes: ['G4', 'B4', 'D#5'], answer: 'uebermässig' },
                        { notes: ['A4', 'C5', 'E5'], answer: 'moll' },
                        { notes: ['G4', 'B4', 'D5'], answer: 'dur' }
                    ],
                    count: 10,
                    timeLimitSeconds: 180
                },
                xpReward: 15,
                orderIndex: 54
            },

            // === EAR TRAINING – Advanced ===
            {
                module: 'ear_training',
                difficulty: 'advanced',
                type: 'interval_hearing',
                title: 'Intervalle hören – Harmonisch',
                description: 'Höre zwei gleichzeitig gespielte Töne und bestimme das Intervall.',
                content: {
                    direction: 'harmonic',
                    intervals: [
                        { semitones: 3, name: 'Kleine Terz', shortName: 'kl. 3' },
                        { semitones: 4, name: 'Große Terz', shortName: 'gr. 3' },
                        { semitones: 5, name: 'Reine Quarte', shortName: 'r. 4' },
                        { semitones: 7, name: 'Reine Quinte', shortName: 'r. 5' },
                        { semitones: 8, name: 'Kleine Sexte', shortName: 'kl. 6' },
                        { semitones: 9, name: 'Große Sexte', shortName: 'gr. 6' },
                        { semitones: 12, name: 'Oktave', shortName: '8' }
                    ],
                    baseNote: 'C4',
                    count: 8,
                    timeLimitSeconds: 150
                },
                xpReward: 20,
                orderIndex: 55
            },
            // Septakkorde – Intermediate (arpeggio + chord)
            {
                module: 'ear_training',
                difficulty: 'intermediate',
                type: 'interval_hearing',
                title: 'Septakkorde bestimmen – Einzeln & Akkord',
                description: 'Höre Septakkorde erst einzeln (Arpeggio), dann als Akkord. Bestimme den Typ.',
                content: {
                    type: 'chord_quality',
                    playback: 'arpeggio_then_chord',
                    chords: [
                        { notes: ['C4', 'E4', 'G4', 'Bb4'], answer: 'dom7' },
                        { notes: ['G4', 'B4', 'D5', 'F5'], answer: 'dom7' },
                        { notes: ['F4', 'A4', 'C5', 'Eb5'], answer: 'dom7' },
                        { notes: ['D4', 'F4', 'A4', 'C5'], answer: 'moll7' },
                        { notes: ['A4', 'C5', 'E5', 'G5'], answer: 'moll7' },
                        { notes: ['E4', 'G4', 'B4', 'D5'], answer: 'moll7' },
                        { notes: ['C4', 'E4', 'G4', 'B4'], answer: 'maj7' },
                        { notes: ['F4', 'A4', 'C5', 'E5'], answer: 'maj7' },
                        { notes: ['Bb4', 'D5', 'F5', 'A5'], answer: 'maj7' },
                        { notes: ['B4', 'D5', 'F5', 'A5'], answer: 'hdim7' },
                        { notes: ['F#4', 'A4', 'C5', 'E5'], answer: 'hdim7' },
                        { notes: ['C#4', 'E4', 'G4', 'B4'], answer: 'hdim7' }
                    ],
                    count: 10,
                    timeLimitSeconds: 180
                },
                xpReward: 15,
                orderIndex: 54.5
            },
            // Septakkorde – Advanced (chord only)
            {
                module: 'ear_training',
                difficulty: 'advanced',
                type: 'interval_hearing',
                title: 'Septakkorde bestimmen',
                description: 'Höre Septakkorde nur als Akkord und bestimme den Typ.',
                content: {
                    type: 'chord_quality',
                    playback: 'chord_only',
                    chords: [
                        { notes: ['C4', 'E4', 'G4', 'Bb4'], answer: 'dom7' },
                        { notes: ['G4', 'B4', 'D5', 'F5'], answer: 'dom7' },
                        { notes: ['F4', 'A4', 'C5', 'Eb5'], answer: 'dom7' },
                        { notes: ['D4', 'F4', 'A4', 'C5'], answer: 'moll7' },
                        { notes: ['A4', 'C5', 'E5', 'G5'], answer: 'moll7' },
                        { notes: ['E4', 'G4', 'B4', 'D5'], answer: 'moll7' },
                        { notes: ['C4', 'E4', 'G4', 'B4'], answer: 'maj7' },
                        { notes: ['F4', 'A4', 'C5', 'E5'], answer: 'maj7' },
                        { notes: ['Bb4', 'D5', 'F5', 'A5'], answer: 'maj7' },
                        { notes: ['B4', 'D5', 'F5', 'A5'], answer: 'hdim7' },
                        { notes: ['F#4', 'A4', 'C5', 'E5'], answer: 'hdim7' },
                        { notes: ['C#4', 'E4', 'G4', 'B4'], answer: 'hdim7' }
                    ],
                    count: 10,
                    timeLimitSeconds: 180
                },
                xpReward: 20,
                orderIndex: 56
            },
            // Septakkordumkehrungen – Intermediate (arpeggio + chord)
            {
                module: 'ear_training',
                difficulty: 'intermediate',
                type: 'interval_hearing',
                title: 'Septakkordumkehrungen – Einzeln & Akkord',
                description: 'Höre Septakkordumkehrungen erst als Arpeggio, dann als Akkord. Bestimme die Umkehrung.',
                content: {
                    type: 'chord_quality',
                    playback: 'arpeggio_then_chord',
                    chords: [
                        // Grundstellung
                        { notes: ['C4', 'E4', 'G4', 'Bb4'], answer: 'grundstellung' },
                        { notes: ['D4', 'F4', 'A4', 'C5'], answer: 'grundstellung' },
                        // 1. Umkehrung (Terz im Bass)
                        { notes: ['E4', 'G4', 'Bb4', 'C5'], answer: '1. Umkehrung' },
                        { notes: ['F4', 'A4', 'C5', 'D5'], answer: '1. Umkehrung' },
                        // 2. Umkehrung (Quinte im Bass)
                        { notes: ['G4', 'Bb4', 'C5', 'E5'], answer: '2. Umkehrung' },
                        { notes: ['A4', 'C5', 'D5', 'F5'], answer: '2. Umkehrung' },
                        // 3. Umkehrung (Septime im Bass)
                        { notes: ['Bb4', 'C5', 'E5', 'G5'], answer: '3. Umkehrung' },
                        { notes: ['C5', 'D5', 'F5', 'A5'], answer: '3. Umkehrung' }
                    ],
                    count: 8,
                    timeLimitSeconds: 180
                },
                xpReward: 15,
                orderIndex: 56.5
            },
            // Septakkordumkehrungen – Advanced (chord only)
            {
                module: 'ear_training',
                difficulty: 'advanced',
                type: 'interval_hearing',
                title: 'Septakkordumkehrungen bestimmen',
                description: 'Höre Septakkordumkehrungen nur als Akkord und bestimme die Umkehrung.',
                content: {
                    type: 'chord_quality',
                    playback: 'chord_only',
                    chords: [
                        { notes: ['C4', 'E4', 'G4', 'Bb4'], answer: 'grundstellung' },
                        { notes: ['D4', 'F4', 'A4', 'C5'], answer: 'grundstellung' },
                        { notes: ['G4', 'B4', 'D5', 'F5'], answer: 'grundstellung' },
                        { notes: ['E4', 'G4', 'Bb4', 'C5'], answer: '1. Umkehrung' },
                        { notes: ['F4', 'A4', 'C5', 'D5'], answer: '1. Umkehrung' },
                        { notes: ['B4', 'D5', 'F5', 'G5'], answer: '1. Umkehrung' },
                        { notes: ['G4', 'Bb4', 'C5', 'E5'], answer: '2. Umkehrung' },
                        { notes: ['A4', 'C5', 'D5', 'F5'], answer: '2. Umkehrung' },
                        { notes: ['D5', 'F5', 'G5', 'B5'], answer: '2. Umkehrung' },
                        { notes: ['Bb4', 'C5', 'E5', 'G5'], answer: '3. Umkehrung' },
                        { notes: ['C5', 'D5', 'F5', 'A5'], answer: '3. Umkehrung' },
                        { notes: ['F5', 'G5', 'B5', 'D6'], answer: '3. Umkehrung' }
                    ],
                    count: 10,
                    timeLimitSeconds: 180
                },
                xpReward: 20,
                orderIndex: 57
            },

            // === SCALE HEARING – Beginner ===
            {
                module: 'ear_training',
                difficulty: 'beginner',
                type: 'scale_hearing',
                title: 'Dur oder Moll? – Tonleiter',
                description: 'Höre eine Tonleiter und bestimme, ob sie Dur oder Moll ist.',
                content: {
                    scales: [
                        {
                            name: 'Dur',
                            intervals: [0, 2, 4, 5, 7, 9, 11, 12]
                        },
                        {
                            name: 'Natürliches Moll',
                            intervals: [0, 2, 3, 5, 7, 8, 10, 12]
                        }
                    ],
                    baseNotes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4'],
                    count: 8,
                    timeLimitSeconds: 120
                },
                xpReward: 10,
                orderIndex: 60
            },

            // === SCALE HEARING – Intermediate ===
            {
                module: 'ear_training',
                difficulty: 'intermediate',
                type: 'scale_hearing',
                title: 'Mollvarianten erkennen',
                description: 'Unterscheide zwischen natürlichem, harmonischem und melodischem Moll.',
                content: {
                    scales: [
                        {
                            name: 'Natürliches Moll',
                            intervals: [0, 2, 3, 5, 7, 8, 10, 12]
                        },
                        {
                            name: 'Harmonisches Moll',
                            intervals: [0, 2, 3, 5, 7, 8, 11, 12]
                        },
                        {
                            name: 'Melodisches Moll',
                            intervals: [0, 2, 3, 5, 7, 9, 11, 12]
                        }
                    ],
                    baseNotes: ['C4', 'D4', 'E4', 'A3'],
                    count: 9,
                    timeLimitSeconds: 150
                },
                xpReward: 15,
                orderIndex: 61
            },

            // === SCALE HEARING – Advanced ===
            {
                module: 'ear_training',
                difficulty: 'advanced',
                type: 'scale_hearing',
                title: 'Kirchentonarten & Skalen',
                description: 'Erkenne Dur, Moll, Dorisch, Mixolydisch, Lydisch und Pentatonik.',
                content: {
                    scales: [
                        {
                            name: 'Dur (Ionisch)',
                            intervals: [0, 2, 4, 5, 7, 9, 11, 12]
                        },
                        {
                            name: 'Natürliches Moll (Äolisch)',
                            intervals: [0, 2, 3, 5, 7, 8, 10, 12]
                        },
                        {
                            name: 'Dorisch',
                            intervals: [0, 2, 3, 5, 7, 9, 10, 12]
                        },
                        {
                            name: 'Mixolydisch',
                            intervals: [0, 2, 4, 5, 7, 9, 10, 12]
                        },
                        {
                            name: 'Lydisch',
                            intervals: [0, 2, 4, 6, 7, 9, 11, 12]
                        },
                        {
                            name: 'Dur-Pentatonik',
                            intervals: [0, 2, 4, 7, 9, 12]
                        }
                    ],
                    baseNotes: ['C4', 'D4', 'F4', 'G4'],
                    count: 10,
                    timeLimitSeconds: 180
                },
                xpReward: 20,
                orderIndex: 62
            },

            // === NOTE READING – Intermediate: Interval Reading properly ===
            {
                module: 'note_reading',
                difficulty: 'intermediate',
                type: 'interval_reading',
                title: 'Intervalle lesen – Visuell',
                description: 'Sieh zwei Noten auf dem Notensystem und bestimme das Intervall.',
                content: {
                    clef: 'treble',
                    intervals: [
                        { note1: 'C4', note2: 'D4', answer: 'Sekunde' },
                        { note1: 'C4', note2: 'E4', answer: 'Terz' },
                        { note1: 'C4', note2: 'F4', answer: 'Quarte' },
                        { note1: 'C4', note2: 'G4', answer: 'Quinte' },
                        { note1: 'D4', note2: 'F4', answer: 'Terz' },
                        { note1: 'E4', note2: 'A4', answer: 'Quarte' },
                        { note1: 'F4', note2: 'C5', answer: 'Quinte' },
                        { note1: 'G4', note2: 'E5', answer: 'Sexte' },
                        { note1: 'A4', note2: 'G5', answer: 'Septime' },
                        { note1: 'C4', note2: 'C5', answer: 'Oktave' }
                    ],
                    options: ['Sekunde', 'Terz', 'Quarte', 'Quinte', 'Sexte', 'Septime', 'Oktave'],
                    count: 10,
                    timeLimitSeconds: 120
                },
                xpReward: 15,
                orderIndex: 36
            },
            {
                module: 'note_reading',
                difficulty: 'advanced',
                type: 'interval_reading',
                title: 'Intervalle lesen – Bass & Violinschlüssel',
                description: 'Bestimme Intervalle in beiden Schlüsseln, inkl. Vorzeichen.',
                content: {
                    clef: 'mixed',
                    intervals: [
                        { note1: 'C4', note2: 'Eb4', answer: 'Kleine Terz', clef: 'treble' },
                        { note1: 'C4', note2: 'E4', answer: 'Große Terz', clef: 'treble' },
                        { note1: 'D4', note2: 'Ab4', answer: 'Verminderte Quinte', clef: 'treble' },
                        { note1: 'F4', note2: 'C#5', answer: 'Übermäßige Quinte', clef: 'treble' },
                        { note1: 'G3', note2: 'B3', answer: 'Große Terz', clef: 'bass' },
                        { note1: 'C3', note2: 'F3', answer: 'Reine Quarte', clef: 'bass' },
                        { note1: 'A3', note2: 'E3', answer: 'Reine Quarte', clef: 'bass' },
                        { note1: 'D3', note2: 'B3', answer: 'Große Sexte', clef: 'bass' },
                        { note1: 'E4', note2: 'C5', answer: 'Kleine Sexte', clef: 'treble' },
                        { note1: 'F3', note2: 'E3', answer: 'Große Septime', clef: 'bass' }
                    ],
                    options: ['Kleine Terz', 'Große Terz', 'Reine Quarte', 'Verminderte Quinte', 'Reine Quinte', 'Übermäßige Quinte', 'Kleine Sexte', 'Große Sexte', 'Große Septime'],
                    count: 10,
                    timeLimitSeconds: 150
                },
                xpReward: 20,
                orderIndex: 37
            },

            // === NOTE READING – Advanced: Vorzeichen lesen ===
            {
                module: 'note_reading',
                difficulty: 'intermediate',
                type: 'name_note',
                title: 'Noten mit Vorzeichen – Violinschlüssel',
                description: 'Benenne Noten mit Kreuz- und B-Vorzeichen im Violinschlüssel.',
                content: {
                    clef: 'treble',
                    notes: [
                        { pitch: 'C#4', display: 'cis1' },
                        { pitch: 'Eb4', display: 'es1' },
                        { pitch: 'F#4', display: 'fis1' },
                        { pitch: 'Ab4', display: 'as1' },
                        { pitch: 'Bb4', display: 'b1' },
                        { pitch: 'D4', display: 'd1' },
                        { pitch: 'G4', display: 'g1' },
                        { pitch: 'A4', display: 'a1' }
                    ],
                    count: 10,
                    timeLimitSeconds: 90,
                    includeAccidentals: true
                },
                xpReward: 15,
                orderIndex: 32
            },
            {
                module: 'note_reading',
                difficulty: 'advanced',
                type: 'key_signature',
                title: 'Tonarten erkennen – Kreuz-Tonarten',
                description: 'Erkenne die Tonart anhand der Vorzeichen (Kreuz-Tonarten).',
                content: {
                    keySignatures: [
                        { sharps: 0, flats: 0, answer: 'C-Dur / a-Moll' },
                        { sharps: 1, flats: 0, answer: 'G-Dur / e-Moll' },
                        { sharps: 2, flats: 0, answer: 'D-Dur / h-Moll' },
                        { sharps: 3, flats: 0, answer: 'A-Dur / fis-Moll' },
                        { sharps: 4, flats: 0, answer: 'E-Dur / cis-Moll' }
                    ],
                    count: 8,
                    timeLimitSeconds: 90
                },
                xpReward: 15,
                orderIndex: 38
            },
            {
                module: 'note_reading',
                difficulty: 'advanced',
                type: 'key_signature',
                title: 'Tonarten erkennen – Alle',
                description: 'Erkenne alle Dur- und Moll-Tonarten anhand der Vorzeichen.',
                content: {
                    keySignatures: [
                        { sharps: 0, flats: 0, answer: 'C-Dur / a-Moll' },
                        { sharps: 1, flats: 0, answer: 'G-Dur / e-Moll' },
                        { sharps: 2, flats: 0, answer: 'D-Dur / h-Moll' },
                        { sharps: 3, flats: 0, answer: 'A-Dur / fis-Moll' },
                        { sharps: 4, flats: 0, answer: 'E-Dur / cis-Moll' },
                        { sharps: 5, flats: 0, answer: 'H-Dur / gis-Moll' },
                        { sharps: 0, flats: 1, answer: 'F-Dur / d-Moll' },
                        { sharps: 0, flats: 2, answer: 'B-Dur / g-Moll' },
                        { sharps: 0, flats: 3, answer: 'Es-Dur / c-Moll' },
                        { sharps: 0, flats: 4, answer: 'As-Dur / f-Moll' },
                        { sharps: 0, flats: 5, answer: 'Des-Dur / b-Moll' }
                    ],
                    count: 10,
                    timeLimitSeconds: 120
                },
                xpReward: 20,
                orderIndex: 39
            }
        ];

        await db.exercise.bulkCreate(exercises);
        logger.info(`[Seed] Created ${exercises.length} training exercises.`);
    } catch (err) {
        logger.error('[Seed] Error seeding training exercises:', err);
        throw err;
    }
}

async function seedBadgeDefinitions(force = false) {
    try {
        const count = await db.badge_definition.count();
        if (count > 0 && !force) {
            logger.debug('[Seed] Badge definitions already exist, skipping seed.');
            return;
        }

        const badges = [
            {
                key: 'first_exercise',
                title: 'Erste Schritte',
                description: 'Schließe deine erste Übung ab.',
                icon: 'play_circle',
                category: 'module',
                condition: { type: 'first_exercise' },
                xpBonus: 20,
                orderIndex: 1
            },
            {
                key: 'exercises_10',
                title: 'Fleißig',
                description: 'Schließe 10 Übungen ab.',
                icon: 'fitness_center',
                category: 'module',
                condition: { type: 'exercise_count', value: 10 },
                xpBonus: 50,
                orderIndex: 2
            },
            {
                key: 'exercises_50',
                title: 'Übungsmeister',
                description: 'Schließe 50 Übungen ab.',
                icon: 'military_tech',
                category: 'module',
                condition: { type: 'exercise_count', value: 50 },
                xpBonus: 100,
                orderIndex: 3
            },
            {
                key: 'streak_3',
                title: '3-Tage-Streak',
                description: 'Übe 3 Tage hintereinander.',
                icon: 'local_fire_department',
                category: 'streak',
                condition: { type: 'streak', value: 3 },
                xpBonus: 30,
                orderIndex: 10
            },
            {
                key: 'streak_7',
                title: 'Wochen-Streak',
                description: 'Übe 7 Tage hintereinander.',
                icon: 'whatshot',
                category: 'streak',
                condition: { type: 'streak', value: 7 },
                xpBonus: 75,
                orderIndex: 11
            },
            {
                key: 'streak_30',
                title: 'Monats-Streak',
                description: 'Übe 30 Tage hintereinander.',
                icon: 'celebration',
                category: 'streak',
                condition: { type: 'streak', value: 30 },
                xpBonus: 300,
                orderIndex: 12
            },
            {
                key: 'level_5',
                title: 'Fortgeschritten',
                description: 'Erreiche Level 5.',
                icon: 'trending_up',
                category: 'xp',
                condition: { type: 'level', value: 5 },
                xpBonus: 50,
                orderIndex: 20
            },
            {
                key: 'level_10',
                title: 'Profi',
                description: 'Erreiche Level 10.',
                icon: 'star',
                category: 'xp',
                condition: { type: 'level', value: 10 },
                xpBonus: 100,
                orderIndex: 21
            },
            {
                key: 'perfect_score',
                title: 'Perfekt!',
                description: 'Erreiche 100% bei einer Übung.',
                icon: 'emoji_events',
                category: 'module',
                condition: { type: 'perfect_score', value: 1 },
                xpBonus: 25,
                orderIndex: 30
            },
            {
                key: 'perfect_10',
                title: 'Perfektionist',
                description: 'Erreiche 10-mal 100%.',
                icon: 'workspace_premium',
                category: 'module',
                condition: { type: 'perfect_score', value: 10 },
                xpBonus: 100,
                orderIndex: 31
            },
            {
                key: 'xp_1000',
                title: 'XP-Sammler',
                description: 'Sammle 1000 XP.',
                icon: 'bolt',
                category: 'xp',
                condition: { type: 'total_xp', value: 1000 },
                xpBonus: 50,
                orderIndex: 40
            }
        ];

        await db.badge_definition.bulkCreate(badges);
        logger.info(`[Seed] Created ${badges.length} badge definitions.`);
    } catch (err) {
        logger.error('[Seed] Error seeding badge definitions:', err);
        throw err;
    }
}

async function ensureTrainingSetup() {
    await ensureTrainingTables();
    await seedExercises();
    await seedBadgeDefinitions();
}

module.exports = { ensureTrainingSetup, seedExercises, seedBadgeDefinitions };
