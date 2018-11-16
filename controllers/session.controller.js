const db = require('@db/sqe-mariadb')

exports.validateSession = async (session) => {
    return await db.query("SELECT user_id FROM sqe_session WHERE sqe_session_id = ?", [session])
}