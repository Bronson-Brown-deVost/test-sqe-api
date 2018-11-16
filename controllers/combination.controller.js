const db = require('@db/sqe-mariadb')

exports.getName = async (id) => {
    return await db.query(`SELECT name FROM scroll_data WHERE scroll_id = ?`, [id])
}