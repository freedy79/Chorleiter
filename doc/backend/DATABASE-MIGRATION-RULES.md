# Database Migration Strategy - CRITICAL RULES

**Last Updated:** 2026-02-14  
**Status:** MANDATORY - Read before ANY database changes

---

## ❌ NEVER DO THIS

**DO NOT rely on `sequelize.sync({ alter: true })` for production databases on PostgreSQL.**

### Why It Fails

Sequelize generates **invalid SQL** for PostgreSQL when:
1. ENUMs are added/changed
2. Column constraints are modified
3. Indexes/unique constraints are altered

### Actual Error Example

```sql
-- This is INVALID SQL for PostgreSQL:
ALTER TABLE "pwa_config" ALTER COLUMN "type" 
  SET NOT NULL
  SET DEFAULT 'string'
  DO 'BEGIN CREATE TYPE ...'
  ALTER COLUMN "type" TYPE "..."
  COMMENT ON COLUMN "pwa_config"."type" IS '...' 
  USING ("type"::...);
```

PostgreSQL rejects:
- Multiple clauses in one `ALTER COLUMN`
- `COMMENT` combined with `USING`
- `UNIQUE` in `ALTER COLUMN ... TYPE`

---

## ✅ CORRECT MIGRATION PATTERN

### Pattern 1: Manual Migration Functions (Recommended)

Create dedicated migration functions in `src/init/` that:
1. Drop problematic tables/constraints
2. Recreate with `sync({ force: true })`
3. Preserve data if needed

**Example:** `src/init/ensureDataEnrichmentTables.js`

```javascript
async function fixDataEnrichmentConstraints() {
    const sequelize = db.sequelize;

    // 1. Drop existing tables (with CASCADE)
    await sequelize.query('DROP TABLE IF EXISTS "table_name" CASCADE');
    await sequelize.query('DROP TYPE IF EXISTS "enum_name" CASCADE');
    
    // 2. Recreate with Sequelize model (force: true)
    await db.table_name.sync({ force: true });
    
    // 3. Re-seed critical data if needed
    await seedDefaultData();
}
```

### Pattern 2: Two-Phase Deployment

**For tables with important data:**

#### Phase 1: Create New Table
```javascript
await sequelize.query(`
    CREATE TABLE pwa_config_new (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) NOT NULL,
        value TEXT,
        type VARCHAR(50) DEFAULT 'string',
        ...
    )
`);
```

#### Phase 2: Migrate Data
```javascript
await sequelize.query(`
    INSERT INTO pwa_config_new 
    SELECT * FROM pwa_config
`);
```

#### Phase 3: Swap Tables
```javascript
await sequelize.query('DROP TABLE pwa_config CASCADE');
await sequelize.query('ALTER TABLE pwa_config_new RENAME TO pwa_config');
```

---

## 🔧 How to Add a New Table

### Step 1: Create Sequelize Model

```javascript
// src/models/my_table.js
module.exports = (sequelize, DataTypes) => {
  const MyTable = sequelize.define('my_table', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    tableName: 'my_table',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['name']  // ✅ Unique constraint via index
      }
    ]
  });
  return MyTable;
};
```

**NEVER:**
```javascript
name: {
  unique: true  // ❌ This causes ALTER COLUMN ... UNIQUE
}
```

### Step 2: Register Model

```javascript
// src/models/index.js
db.my_table = require("./my_table.js")(sequelize, Sequelize);
```

### Step 3: Create Migration Function

```javascript
// src/init/ensureMyTable.js
const logger = require('../config/logger');
const db = require('../models');

async function ensureMyTable() {
    try {
        logger.info('[Migration] Ensuring my_table...');
        
        // Drop if exists (for fresh creation)
        await db.sequelize.query('DROP TABLE IF EXISTS "my_table" CASCADE');
        
        // Create with Sequelize model
        await db.my_table.sync({ force: true });
        
        logger.info('[Migration] my_table created successfully');
    } catch (error) {
        logger.error('[Migration] Error creating my_table:', error);
        throw error;
    }
}

module.exports = { ensureMyTable };
```

### Step 4: Add to Init Sequence

```javascript
// src/init/index.js
const { ensureMyTable } = require('./ensureMyTable');

async function init(options = {}) {
    const { includeDemoData = true, syncOptions = { alter: true } } = options;
    
    // 1. Sync base tables first
    await syncDatabase(syncOptions);
    
    // 2. Run manual migrations
    await migrateUserNames();
    await migrateRoles();
    await fixProgramPublishedFromIdColumn();
    await ensureMonthlyPlanIndexes();
    await ensureJoinHashes();
    await ensureDataEnrichmentTables();
    await ensureMyTable();  // ← Add here
    
    // 3. Seed data
    await seedDatabase({ includeDemoData });
    await assignAdminRole();
}
```

---

## 🔄 For Existing Table Changes

### Rule: Never Alter Column Type/Constraints via `sync({ alter: true })`

If you need to change an existing column:

#### Option A: Small Tables (Drop & Recreate)
```javascript
await db.sequelize.query('DROP TABLE IF EXISTS "table_name" CASCADE');
await db.table_name.sync({ force: true });
```

#### Option B: Large Tables (Manual ALTER)
```javascript
// One operation per statement!
await sequelize.query('ALTER TABLE "table_name" ALTER COLUMN "col" TYPE VARCHAR(255)');
await sequelize.query('COMMENT ON COLUMN "table_name"."col" IS \'description\'');
await sequelize.query('CREATE UNIQUE INDEX idx_name ON "table_name" ("col")');
```

---

## 🛡️ Safe vs. Unsafe Sequelize Operations

### ✅ Safe Operations (on Empty/New Tables)

```javascript
await MyModel.sync({ force: true });  // Creates full table fresh
await MyModel.sync();                  // Creates if not exists (doesn't alter)
```

### ⚠️ Unsafe Operations (on Production)

```javascript
await MyModel.sync({ alter: true });   // ❌ Generates invalid SQL on PostgreSQL
await sequelize.sync({ alter: true }); // ❌ Will fail on complex models
```

### ✅ Use Instead

```javascript
// src/init/ensureMyFeature.js
async function fixMyTable() {
    await sequelize.query('DROP TABLE IF EXISTS "my_table" CASCADE');
    await db.my_table.sync({ force: true });
}
```

---

## 📋 Migration Checklist

Before deploying ANY database change:

- [ ] Created migration function in `src/init/`
- [ ] Tested migration on local PostgreSQL (not just SQLite)
- [ ] Migration handles existing data (if needed)
- [ ] Added to `init/index.js` sequence
- [ ] Documented breaking changes
- [ ] Backup plan exists (especially for large tables)

---

## 🧪 Testing Migrations Locally

### Setup Local PostgreSQL

```bash
# Install PostgreSQL (Windows)
choco install postgresql

# Create test database
psql -U postgres
CREATE DATABASE choir_db_test;
\q

# Update .env
DB_DIALECT=postgres
DB_HOST=localhost
DB_NAME=choir_db_test
DB_USER=postgres
DB_PASSWORD=<your-password>
```

### Test Migration

```bash
# Start with empty database
cd choir-app-backend
npm run init
```

**Check for errors like:**
```
syntax error at or near "USING"
syntax error at or near "UNIQUE"
```

If errors appear → **create manual migration function** instead.

---

## 🔍 Key Files to Reference

- [src/init/ensureDataEnrichmentTables.js](../choir-app-backend/src/init/ensureDataEnrichmentTables.js) - **Gold standard migration pattern**
- [src/init/index.js](../choir-app-backend/src/init/index.js) - Migration sequence
- [src/init/dbSync.js](../choir-app-backend/src/init/dbSync.js) - Database sync wrapper
- [.github/copilot-instructions.md](../.github/copilot-instructions.md) - Add new rules here

---

## 📝 Add This Rule to Copilot Instructions

When this document is finalized, add this section to `.github/copilot-instructions.md`:

```markdown
### Database Migrations (CRITICAL)

- **NEVER use `sequelize.sync({ alter: true })` on production PostgreSQL databases**
- **Create manual migration functions** in `src/init/` for all schema changes
- **Pattern:** DROP table → `sync({ force: true })` → re-seed
- **See:** [doc/backend/DATABASE-MIGRATION-RULES.md](doc/backend/DATABASE-MIGRATION-RULES.md)
```

---

**Author:** Development Team  
**Approved:** Yes  
**Enforcement:** MANDATORY for all future DB changes
