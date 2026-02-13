module.exports = (sequelize, DataTypes) => {
  const PwaConfig = sequelize.define('pwa_config', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Configuration key (e.g., vapid_public_key, push_enabled, sw_update_interval)'
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Configuration value (JSON for complex values)'
    },
    type: {
      type: DataTypes.ENUM('string', 'boolean', 'number', 'json'),
      allowNull: false,
      defaultValue: 'string',
      comment: 'Value type for frontend parsing'
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'general',
      comment: 'Configuration category (vapid, cache, notification, service_worker, features)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Human-readable description of this setting'
    },
    isEditable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether this setting can be edited via admin UI'
    },
    isSecret: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this value should be masked in the UI (e.g., private keys)'
    }
  }, {
    tableName: 'pwa_config',
    timestamps: true
  });

  return PwaConfig;
};
