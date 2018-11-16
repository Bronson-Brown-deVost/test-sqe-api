
/* eslint-disable no-unused-vars */

/*
 * This is a template for a custom route of combination, version v1.
 *
 * Only functions with the HTTP verbs 'get', 'post', 'put', 
 * 'patch','delete', and the special function 'find' (for
 * get requests with params) will be served.  Any others 
 * will be discarded by the routines in /routes/index.js.
 *
 * Private functions (i.e., without 'exports.') will remain
 * private.
 */

/*
 * Put your logic in a controller, since it can be reused by other routes. 
 */
const combinationController = require('@controllers/combination.controller.js')

/*
 * Exported functions.
 */

/**
 * Gets a combination.
 * @param   {Number}    id  The is the id of the combination you are searching for.
 * @returns {Object}    The results of the get in the 'response' object, and the broadcast flag. 
 */
exports.get = async (id, query) => {
    let response = await combinationController.getName(id)
    return {response: query}
}

/**
 * Finds a combination.
 * @param   {Object}    query  The paramaters of the query parsed into an object using expressjs req.query.
 * @returns {Object}    The results of the get query in the 'response' object, and the broadcast flag. 
 */
exports.find = async (query) => {
    return {response: query}
}

/**
 * Creates a combination.
 * @param   {Object}    body  The JSON POST payload parsed into an object using body-parser.
 * @returns {Object}    The results of the post in the 'response' object, and the broadcast flag. 
 */
exports.post = async (body) => {
    const broadcast = 'session_id' // You can broadcast to none '', to the user via session_id 'session_id', or to the scroll_version_group 'scroll_version_group'.
    let response = ''
    return {response: body, broadcast: broadcast}
}

/**
 * Replaces a combination.
 * @param   {Object}    body  The JSON POST payload parsed into an object using body-parser.
 * @returns {Object}    The results of the put in the 'response' object, and the broadcast flag. 
 */
exports.put = async (body) => {
    const broadcast = 'scroll_version_group_id' // You can broadcast to none '', to the user via session_id 'session_id', or to the scroll_version_group 'scroll_version_group'.
    let response = ''
    return {response: body, broadcast: broadcast}
}

/**
 * Updates one part of a combination.
 * @param   {Object}    body  The JSON POST payload parsed into an object using body-parser.
 * @returns {Object}    The results of the patch in the 'response' object, and the broadcast flag. 
 */
exports.patch = async (body) => {
    const broadcast = '' // You can broadcast to none '', to the user via session_id 'session_id', or to the scroll_version_group 'scroll_version_group'.
    let response = ''
    return {response: response, broadcast: broadcast}
}

/**
 * Deletes a combination.
 * @param   {Number}    id  The is the id of the combination you want to delete.
 * @returns {Object}    The results of the delete in the 'response' object, and the broadcast flag. 
 */
exports.delete = async (body) => {
    const broadcast = '' // You can broadcast to none '', to the user via session_id 'session_id', or to the scroll_version_group_id 'scroll_version_group_id'.
    let response = ''
    return {response: response, broadcast: broadcast}
}
