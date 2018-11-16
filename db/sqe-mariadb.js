const mariadb = require('mariadb')
const settings = require('@config/mariadb.config.json')
this.pool = mariadb.createPool({
    host: settings.host, 
    user: settings.user, 
    port: settings.port, 
    password: settings.password, 
    database: settings.database, 
    connectionLimit: settings.connectionLimit
})

const endConn = exports.endConn = async (conn) => {
    try {
        await conn.end()
    } catch (err) {
        conn.destroy()
        throw err
    }
}

const getConn = exports.getConn = async () => {
    let conn
    try {
        conn = await this.pool.getConnection()
    } catch (err) {
        throw err
    }

    return conn
}

exports.query = async (query, args) => {
    const conn = await getConn()
    console.log(conn)
    const results = await conn.query(query, args)
    endConn(conn)
    return results
}

// This takes an array of objects: [{query: '', args:[]}].
exports.singleTransaction = async (queries) => {
    const conn = getConn()
    const results = []
    try {
        await conn.beginTransaction()
    } catch (err) {
        throw err
    }

    for (query in queries) {
        let result
        try {
            result = await conn.query(query.query, query.args)
        } catch(err) {
            throw err
        }
        results.push(result)
    }
    
    try {
        await conn.commit()
    } catch (err) {
        throw err
    }

    endConn(conn)
    return results
}

exports.closePool = async () => {
    return await this.pool.end()
}
