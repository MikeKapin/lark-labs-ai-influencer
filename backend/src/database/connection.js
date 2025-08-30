const { Pool } = require('pg');
const logger = require('../utils/logger');

// Database configuration
const config = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = new Pool(config);

// Connection event handlers
pool.on('connect', (client) => {
  logger.debug('Database client connected');
});

pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

pool.on('remove', (client) => {
  logger.debug('Database client removed');
});

class Database {
  constructor() {
    this.pool = pool;
  }

  async connect() {
    try {
      const client = await this.pool.connect();
      logger.info('Database connection established');
      
      // Test the connection
      const result = await client.query('SELECT NOW()');
      logger.debug('Database test query successful:', result.rows[0]);
      
      client.release();
      return true;
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Executed query', {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      logger.error('Database query error:', {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        error: error.message
      });
      throw error;
    }
  }

  async getClient() {
    return await this.pool.connect();
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
    logger.info('Database connection pool closed');
  }

  // Helper methods for common operations
  async findById(table, id, columns = '*') {
    const query = `SELECT ${columns} FROM ${table} WHERE id = $1`;
    const result = await this.query(query, [id]);
    return result.rows[0] || null;
  }

  async findMany(table, conditions = {}, options = {}) {
    let query = `SELECT * FROM ${table}`;
    const params = [];
    const conditions_keys = Object.keys(conditions);

    if (conditions_keys.length > 0) {
      const whereClause = conditions_keys.map((key, index) => {
        params.push(conditions[key]);
        return `${key} = $${index + 1}`;
      }).join(' AND ');
      query += ` WHERE ${whereClause}`;
    }

    if (options.orderBy) {
      query += ` ORDER BY ${options.orderBy}`;
    }

    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }

    if (options.offset) {
      query += ` OFFSET ${options.offset}`;
    }

    const result = await this.query(query, params);
    return result.rows;
  }

  async create(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
    
    const query = `
      INSERT INTO ${table} (${keys.join(', ')}) 
      VALUES (${placeholders}) 
      RETURNING *
    `;
    
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async update(table, id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
    
    const query = `
      UPDATE ${table} 
      SET ${setClause}, updated_at = NOW() 
      WHERE id = $1 
      RETURNING *
    `;
    
    const result = await this.query(query, [id, ...values]);
    return result.rows[0] || null;
  }

  async delete(table, id) {
    const query = `DELETE FROM ${table} WHERE id = $1 RETURNING *`;
    const result = await this.query(query, [id]);
    return result.rows[0] || null;
  }

  // HVAC Knowledge specific methods
  async searchKnowledge(searchTerm, category = null, canadianSpecific = null) {
    let query = `
      SELECT * FROM hvac_knowledge 
      WHERE (
        topic ILIKE $1 
        OR content ILIKE $1 
        OR $1 = ANY(keywords)
      )
    `;
    const params = [`%${searchTerm}%`];

    if (category) {
      query += ` AND category = $${params.length + 1}`;
      params.push(category);
    }

    if (canadianSpecific !== null) {
      query += ` AND canadian_specific = $${params.length + 1}`;
      params.push(canadianSpecific);
    }

    query += ` ORDER BY difficulty_level ASC, created_at DESC`;
    
    const result = await this.query(query, params);
    return result.rows;
  }

  // Content Calendar specific methods
  async getUpcomingContent(days = 7) {
    const query = `
      SELECT * FROM content_calendar 
      WHERE date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'
      ORDER BY date ASC
    `;
    
    const result = await this.query(query);
    return result.rows;
  }

  async getContentAnalytics(contentId) {
    const query = `
      SELECT 
        ca.*,
        cc.topic,
        cc.content_type
      FROM content_analytics ca
      JOIN content_calendar cc ON ca.content_id = cc.id
      WHERE ca.content_id = $1
      ORDER BY ca.recorded_at DESC
    `;
    
    const result = await this.query(query, [contentId]);
    return result.rows;
  }
}

module.exports = new Database();