const { Sequelize } = require("sequelize");
const { AsyncLocalStorage } = require("async_hooks");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const MODEL_PROXY_SYMBOL = Symbol("ModelProxy");
const DB_KEYS = ["inventory", "demo"];
const asyncLocalStorage = new AsyncLocalStorage();

const MAIN_DB_NAME = "inventory";
const DEMO_DB_NAME = "demo";

function normalizeDatabaseName(name) {
  const normalized = String(name || "").trim().toLowerCase();
  if (!normalized) return "";
  if (!/^[a-z0-9_]+$/.test(normalized)) return "";
  if (normalized !== MAIN_DB_NAME && normalized !== DEMO_DB_NAME) return "";
  return normalized;
}

function createSequelize(databaseName) {
  return new Sequelize(
    databaseName,
    process.env.DB_USER || "postgres",
    String(process.env.DB_PASSWORD || ""),
    {
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 5432),
      dialect: "postgres",
      logging: false,
    }
  );
}

const sequelizeByDb = {
  inventory: createSequelize(MAIN_DB_NAME),
  demo: createSequelize(DEMO_DB_NAME),
};

const modelsByDb = {
  inventory: Object.create(null),
  demo: Object.create(null),
};

const modelProxyByName = Object.create(null);

function getContextDatabase() {
  const store = asyncLocalStorage.getStore();
  const key = normalizeDatabaseName(store?.database);
  return key || MAIN_DB_NAME;
}

function withDatabase(databaseName, fn) {
  const key = normalizeDatabaseName(databaseName) || MAIN_DB_NAME;
  return asyncLocalStorage.run({ database: key }, fn);
}

function resolveProxyModel(modelLike, databaseName) {
  if (!modelLike || !modelLike[MODEL_PROXY_SYMBOL]) return modelLike;
  return modelsByDb[databaseName][modelLike.__modelName];
}

function mapValueForDb(value, databaseName) {
  if (Array.isArray(value)) {
    return value.map((item) => mapValueForDb(item, databaseName));
  }

  if (value && value[MODEL_PROXY_SYMBOL]) {
    return resolveProxyModel(value, databaseName);
  }

  if (value && typeof value === "object") {
    const out = value;

    if (Object.prototype.hasOwnProperty.call(out, "model")) {
      const mappedInclude = Object.prototype.hasOwnProperty.call(out, "include")
        ? mapValueForDb(out.include, databaseName)
        : [];
      return {
        ...out,
        model: mapValueForDb(out.model, databaseName),
        include: Array.isArray(mappedInclude) ? mappedInclude : [],
      };
    }

    if (Object.prototype.hasOwnProperty.call(out, "include")) {
      return {
        ...out,
        include: mapValueForDb(out.include, databaseName),
      };
    }
  }

  return value;
}

function mapArgsForDb(args, databaseName) {
  return args.map((arg) => mapValueForDb(arg, databaseName));
}

function createModelProxy(modelName) {
  const proxyTarget = {
    [MODEL_PROXY_SYMBOL]: true,
    __modelName: modelName,
  };

  return new Proxy(proxyTarget, {
    get(_target, prop) {
      if (prop === MODEL_PROXY_SYMBOL || prop === "__modelName") {
        return proxyTarget[prop];
      }

      if (prop === "withDatabase") {
        return (databaseName) =>
          resolveProxyModel(proxyTarget, normalizeDatabaseName(databaseName) || MAIN_DB_NAME);
      }

      const activeDb = getContextDatabase();
      const activeModel = modelsByDb[activeDb][modelName];
      const value = activeModel[prop];

      if (typeof value !== "function") {
        return value;
      }

      if (prop === "belongsTo" || prop === "hasMany" || prop === "hasOne" || prop === "belongsToMany") {
        return (targetModel, ...args) => {
          for (const dbKey of DB_KEYS) {
            const source = modelsByDb[dbKey][modelName];
            const target = resolveProxyModel(targetModel, dbKey);
            const mappedArgs = mapArgsForDb(args, dbKey);
            source[prop](target, ...mappedArgs);
          }
          return proxyTarget;
        };
      }

      return (...args) => {
        const dbKey = getContextDatabase();
        const source = modelsByDb[dbKey][modelName];
        const fn = source[prop];
        const mappedArgs = mapArgsForDb(args, dbKey);
        return fn.apply(source, mappedArgs);
      };
    },
  });
}

const db = new Proxy(
  {
    normalizeDatabaseName,
    getCurrentDatabase: getContextDatabase,
    runWithDatabase: withDatabase,
    withDatabase,
    // Legacy compatibility: no global mutation anymore.
    async switchDatabase(nextNameRaw) {
      return normalizeDatabaseName(nextNameRaw) || MAIN_DB_NAME;
    },
    // Expose underlying connections when needed by infra code.
    getConnection(databaseName) {
      const dbName = normalizeDatabaseName(databaseName) || MAIN_DB_NAME;
      return sequelizeByDb[dbName];
    },
  },
  {
    get(target, prop) {
      if (Object.prototype.hasOwnProperty.call(target, prop)) {
        return target[prop];
      }

      if (prop === "define") {
        return (modelName, attributes, options) => {
          if (modelProxyByName[modelName]) {
            return modelProxyByName[modelName];
          }

          for (const dbKey of DB_KEYS) {
            modelsByDb[dbKey][modelName] = sequelizeByDb[dbKey].define(modelName, attributes, options);
          }

          const proxyModel = createModelProxy(modelName);
          modelProxyByName[modelName] = proxyModel;
          return proxyModel;
        };
      }

      if (prop === "sync") {
        return async (options = {}) => {
          for (const dbKey of DB_KEYS) {
            await sequelizeByDb[dbKey].sync(options);
          }
        };
      }

      if (prop === "authenticate") {
        return async () => {
          for (const dbKey of DB_KEYS) {
            await sequelizeByDb[dbKey].authenticate();
          }
        };
      }

      if (prop === "close") {
        return async () => {
          for (const dbKey of DB_KEYS) {
            await sequelizeByDb[dbKey].close();
          }
        };
      }

      if (prop === "query") {
        return (...args) => {
          const dbKey = getContextDatabase();
          const sequelize = sequelizeByDb[dbKey];
          const mappedArgs = mapArgsForDb(args, dbKey);
          return sequelize.query(...mappedArgs);
        };
      }

      if (prop === "transaction") {
        return (...args) => {
          const dbKey = getContextDatabase();
          const sequelize = sequelizeByDb[dbKey];
          const mappedArgs = mapArgsForDb(args, dbKey);
          return sequelize.transaction(...mappedArgs);
        };
      }

      const dbKey = getContextDatabase();
      const sequelize = sequelizeByDb[dbKey];
      const value = sequelize[prop];
      return typeof value === "function" ? value.bind(sequelize) : value;
    },
  }
);

module.exports = db;
