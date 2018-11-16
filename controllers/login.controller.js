const db = require('@db/sqe-mariadb')
const uuid = require('uuid/v4')

exports.validateLogin = async (username, password) => {
    const session = uuid()
    const conn = await db.getConn()
    let validatedSession
    // TODO Note that we could always store the latest login too with this query.
    // This query will return 0 rows affected if the username and/or password are icorrect.
    const validateUser = await conn.query(`
        INSERT INTO sqe_session (sqe_session_id, user_id, scroll_version_id)
        SELECT CASE WHEN ssn.sqe_session_id IS NULL THEN ? ELSE ssn.sqe_session_id END, user.user_id, 1
        FROM user
        LEFT JOIN sqe_session AS ssn USING(user_id)
        WHERE user.user_name = ?
            AND user.pw = SHA2(?,224)
        ON DUPLICATE KEY UPDATE
        sqe_session_id = sqe_session.sqe_session_id
        `, [session, username, password])
    if (validateUser.affectedRows > 0) {
        validatedSession = await conn.query(`
            SELECT sqe_session_id
            FROM user
            JOIN sqe_session USING(user_id)
            WHERE user.user_name = ?
                AND user.pw = SHA2(?,224)
            `, [username, password])
    }
    db.endConn(conn)
    return validatedSession
}