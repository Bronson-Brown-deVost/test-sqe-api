const loginController = require('@controllers/login.controller.js')
/**
 * Login validator.  This should be loaded before the session-manager service in app.js
 */
exports.validate = async (req, res, next) => {
    try {
        const session = await loginController.validateLogin(req.body.username, req.body.password)
        if (session) res.json({session_id: session})
        else res.json({error: 'failed to login'})
    } catch(err) {
        res.json({error: err})
    }
}