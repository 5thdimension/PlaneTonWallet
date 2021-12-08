import Graphql from "@/api/graphql"
import Storage from "@/storage/storage"
import Wallet from "@/wallet/wallet"

;(function() {
    const graphql = new Graphql()
    let passphrase = null
    let passphraseTTL = 0

    const checkValidPassphrase = async (p) => {
        const storage = new Storage(p)
        try {
            let accounts = await storage.get('accounts')
            return accounts.length > 0
        } catch(e) {}
        return false
    }

    chrome.extension.onMessage.addListener((req, sender, sendResponse) => {
        try {
            if (req.action == 'passphrase') {
                if (req.method == 'set') {
                    passphrase = req.params[0]
                    passphraseTTL = +new Date + 3600 * 1000
                    sendResponse({})
                } else if (req.method == 'checkTTL') {
                    if (passphraseTTL && passphraseTTL < +new Date) {
                        passphrase = null
                    }
                    sendResponse({})
                } else if (req.method == 'remove') {
                    passphrase = null
                    sendResponse({})
                } else if (req.method == 'isSignedIn') {
                    checkValidPassphrase(passphrase).then(sendResponse)
                } else if (req.method == 'isValid') {
                    checkValidPassphrase(req.params[0]).then(sendResponse)
                }
            } else if (req.action == 'hasWallet') {
                const storage = new Storage(passphrase)
                storage.has('accounts').then(sendResponse)
            } else {
                if (passphrase == null) {
                    return sendResponse({error: 'NotSignedIn'})
                }

                if (req.action == 'graphql') {
                    if (graphql[req.method] && graphql.canCallExternal(req.method)) {
                        graphql[req.method].call(graphql, ...req.params)
                            .then(sendResponse)
                            .catch(e => sendResponse({error: e}))
                    } else {
                        sendResponse({error: 'Unknown Method'})
                    }
                }

                if (req.action == 'storage') {
                    const storage = new Storage(passphrase)
                    if (storage[req.method] && storage.canCallExternal(req.method)) {
                        storage[req.method].call(storage, ...req.params)
                            .then(sendResponse)
                            .catch(e => sendResponse({error: e}))
                    } else {
                        sendResponse({error: 'Unknown Method'})
                    }
                }

                if (req.action == 'wallet') {
                    const wallet = new Wallet(passphrase)
                    if (wallet[req.method] && wallet.canCallExternal(req.method)) {
                        wallet[req.method].call(wallet, ...req.params)
                            .then(sendResponse)
                            .catch(e => sendResponse({error: e}))
                    } else {
                        sendResponse({error: 'Unknown Method'})
                    }
                }
            }
        } catch(e) {
            sendResponse(e)
        }

        return true
    })
})()
