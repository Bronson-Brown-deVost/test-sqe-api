const db = require('@db/sqe-mariadb')

exports.getScrollVersionGroup = async (scroll_version_id, user_id) => {
    const result = await db.query("SELECT scroll_version_group_id FROM scroll_version WHERE scroll_version_id = ?  AND (user_id = ? OR user_id = 1)", [scroll_version_id, user_id])
    return result.length === 1 ? result[0].scroll_version_group_id : 0
}